import os
import requests
import rasterio
from rasterio.windows import from_bounds
from rasterio.warp import reproject, Resampling
import numpy as np

STAC_API = "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items"

def get_asset_hrefs(item_id: str) -> dict:
    url = f"{STAC_API}/{item_id}"
    resp = requests.get(url)
    resp.raise_for_status()
    data = resp.json()
    assets = data.get("assets", {})
    return {k: v["href"] for k, v in assets.items()}

def read_band_window(href: str, bbox: list[float]):
    # bbox is [minLng, minLat, maxLng, maxLat] in EPSG:4326
    # STAC COGs are usually in UTM. We need to handle bounds projection, 
    # but rasterio's warp/vrt handles this, or we read the full if bounds are tricky.
    # To be safe and fast, we will calculate the UTM bounds.
    # Actually, a simpler robust way for COGs is to use rio-tiler, but we stick to rasterio.
    
    # For now, let's open the dataset and calculate the window
    env = rasterio.Env(AWS_NO_SIGN_REQUEST="YES")
    with env:
        with rasterio.open(href) as src:
            # bbox is lon/lat. We need to project bbox to src.crs
            from rasterio.warp import transform_bounds
            utm_bounds = transform_bounds("EPSG:4326", src.crs, *bbox)
            
            window = from_bounds(*utm_bounds, transform=src.transform)
            
            # Read data
            arr = src.read(1, window=window).astype("float32")
            
            # Create a profile for the cropped region
            profile = src.profile.copy()
            profile.update({
                'height': arr.shape[0],
                'width': arr.shape[1],
                'transform': src.window_transform(window)
            })
            
            return arr, profile

def resample_to_match(src_array, src_profile, target_profile, method="bilinear"):
    dst = np.empty(
        (target_profile["height"], target_profile["width"]),
        dtype=np.float32
    )
    resampling = Resampling.nearest if method == "nearest" else Resampling.bilinear
    
    reproject(
        source=src_array,
        destination=dst,
        src_transform=src_profile["transform"],
        src_crs=src_profile["crs"],
        dst_transform=target_profile["transform"],
        dst_crs=target_profile["crs"],
        resampling=resampling
    )
    return dst

def safe_div(a, b):
    return np.where(np.abs(b) < 1e-6, 0, a / b)

def normalize_percentile(arr, mask, pmin=2, pmax=98):
    out = np.zeros_like(arr, dtype=np.float32)
    valid = mask & np.isfinite(arr)
    if np.sum(valid) == 0:
        return out
    vmin = np.nanpercentile(arr[valid], pmin)
    vmax = np.nanpercentile(arr[valid], pmax)
    if vmax == vmin:
        return out
    out[valid] = (arr[valid] - vmin) / (vmax - vmin)
    return np.clip(out, 0, 1)

def percentile_threshold(arr, mask, p):
    valid = mask & np.isfinite(arr)
    if np.sum(valid) == 0:
        return 9999
    return np.nanpercentile(arr[valid], p)

def save_byte(array, profile, output_path, nodata=0):
    profile_out = profile.copy()
    profile_out.update(
        driver="GTiff",
        count=1,
        dtype="uint8",
        nodata=nodata,
        compress="lzw"
    )
    with rasterio.open(output_path, "w", **profile_out) as dst:
        dst.write(array.astype("uint8"), 1)

def save_rgb(r, g, b, profile, output_path):
    rgb = np.stack([
        (r * 255).astype("uint8"),
        (g * 255).astype("uint8"),
        (b * 255).astype("uint8")
    ])
    profile_out = profile.copy()
    profile_out.update(
        driver="GTiff",
        count=3,
        dtype="uint8",
        nodata=0,
        compress="lzw",
        photometric="RGB"
    )
    with rasterio.open(output_path, "w", **profile_out) as dst:
        dst.write(rgb)

def process_water_quality(item_id: str, bbox: list[float], output_dir: str):
    print(f"Fetching STAC Item: {item_id}")
    hrefs = get_asset_hrefs(item_id)
    
    # Sentinel-2 bands in Earth Search STAC
    b2_href = hrefs.get("blue")
    b3_href = hrefs.get("green")
    b4_href = hrefs.get("red")
    b8_href = hrefs.get("nir")
    
    b5_href = hrefs.get("rededge1")
    b6_href = hrefs.get("rededge2")
    b8a_href = hrefs.get("nir08")
    b11_href = hrefs.get("swir16")
    scl_href = hrefs.get("scl")
    
    print("Reading 10m bands via window...")
    b02, profile = read_band_window(b2_href, bbox)
    b03, _ = read_band_window(b3_href, bbox)
    b04, _ = read_band_window(b4_href, bbox)
    b08, _ = read_band_window(b8_href, bbox)
    
    print("Reading 20m bands via window...")
    b05_20, prof20 = read_band_window(b5_href, bbox)
    b06_20, _ = read_band_window(b6_href, bbox)
    b8a_20, _ = read_band_window(b8a_href, bbox)
    b11_20, _ = read_band_window(b11_href, bbox)
    scl_20, _ = read_band_window(scl_href, bbox)
    
    print("Resampling 20m -> 10m...")
    b05 = resample_to_match(b05_20, prof20, profile)
    b06 = resample_to_match(b06_20, prof20, profile)
    b8a = resample_to_match(b8a_20, prof20, profile)
    b11 = resample_to_match(b11_20, prof20, profile)
    scl = resample_to_match(scl_20, prof20, profile, method="nearest")
    
    print("Scaling...")
    b02 /= 10000.0
    b03 /= 10000.0
    b04 /= 10000.0
    b05 /= 10000.0
    b06 /= 10000.0
    b08 /= 10000.0
    b8a /= 10000.0
    b11 /= 10000.0
    
    print("Computing indices...")
    NDWI = safe_div((b03 - b08), (b03 + b08))
    MNDWI = safe_div((b03 - b11), (b03 + b11))
    water_mask = (NDWI > 0.05) | (MNDWI > 0.10)
    
    cloud_mask = np.isin(scl.astype(np.int16), [3, 8, 9, 10, 11])
    valid_water = water_mask & (~cloud_mask)
    
    NIR2 = b04 + (b11 - b04) * ((832.8 - 664.6) / (1613.7 - 664.6))
    FAI = b08 - NIR2
    
    NDCI = safe_div((b05 - b04), (b05 + b04))
    NDTI = safe_div((b04 - b03), (b04 + b03))
    RED_EXCESS = b04 - b03
    
    print("Normalizing...")
    turb_norm = normalize_percentile(NDTI, valid_water)
    chl_norm = normalize_percentile(NDCI, valid_water)
    algae_norm = normalize_percentile(FAI, valid_water)
    
    print("Thresholds...")
    thr_algae = percentile_threshold(FAI, valid_water, 95)
    thr_chl = percentile_threshold(NDCI, valid_water, 85)
    thr_turb = percentile_threshold(NDTI, valid_water, 85)
    thr_red = percentile_threshold(RED_EXCESS, valid_water, 85)
    
    print("Classification...")
    classification = np.zeros_like(b03, dtype=np.uint8)
    classification[valid_water] = 1
    classification[(NDTI > thr_turb)] = 2
    classification[(NDCI > thr_chl)] = 3
    classification[(FAI > thr_algae)] = 4
    
    mask_anomaly = valid_water & (NDTI > thr_turb) & (RED_EXCESS > thr_red) & (NDCI < thr_chl)
    classification[mask_anomaly] = 5
    
    print("Exporting...")
    job_id = item_id.split("_")[0] + "_" + str(np.random.randint(1000, 9999))
    class_file = f"classification_{job_id}.tif"
    rgb_file = f"rgb_{job_id}.tif"
    
    save_byte(classification, profile, os.path.join(output_dir, class_file))
    save_rgb(
        np.where(valid_water, turb_norm, 0),
        np.where(valid_water, chl_norm, 0),
        np.where(valid_water, algae_norm, 0),
        profile,
        os.path.join(output_dir, rgb_file)
    )
    
    return {
        "classification_tif": class_file,
        "rgb_tif": rgb_file
    }
