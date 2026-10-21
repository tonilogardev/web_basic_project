use std::collections::HashMap;
use std::path::Path;
use gdal::raster::{RasterCreationOptions, ResampleAlg};
use gdal::spatial_ref::{CoordTransform, SpatialRef};
use gdal::Dataset;
use rayon::prelude::*;

pub fn init_gdal_options() {
    gdal::config::set_config_option("AWS_NO_SIGN_REQUEST", "YES").ok();
    gdal::config::set_config_option("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR").ok();
    gdal::config::set_config_option("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.tiff,.TIF,.TIFF").ok();
    gdal::config::set_config_option("GDAL_HTTP_MERGE_CONSECUTIVE_RANGES", "YES").ok();
    gdal::config::set_config_option("GDAL_HTTP_MULTIPLEX", "YES").ok();
    gdal::config::set_config_option("VSI_CACHE", "TRUE").ok();
    gdal::config::set_config_option("VSI_CACHE_SIZE", "50000000").ok();
    gdal::config::set_config_option("GDAL_CACHEMAX", "256").ok();
}

struct WindowInfo {
    utm_min_x: f64,
    utm_min_y: f64,
    utm_max_x: f64,
    utm_max_y: f64,
    target_w: usize,
    target_h: usize,
    new_gt: [f64; 6],
    projection: String,
}

fn calculate_window_for_bbox(
    ds: &Dataset,
    bbox: &[f64; 4], // [min_lng, min_lat, max_lng, max_lat]
) -> Result<WindowInfo, String> {
    let projection = ds.projection();
    let srs_4326 = SpatialRef::from_epsg(4326)
        .map_err(|e| format!("Error creating EPSG:4326 SRS: {}", e))?;
    let srs_ds = SpatialRef::from_wkt(&projection)
        .map_err(|e| format!("Error parsing dataset SRS: {}", e))?;

    let transform = CoordTransform::new(&srs_4326, &srs_ds)
        .map_err(|e| format!("Error creating coord transform: {}", e))?;

    // In EPSG:4326 under PROJ 6+, Axis 1 is Latitude (-90..90) and Axis 2 is Longitude (-180..180)
    let mut xs = [bbox[1], bbox[3]]; // Latitude
    let mut ys = [bbox[0], bbox[2]]; // Longitude
    let mut zs = [0.0, 0.0];

    transform
        .transform_coords(&mut xs, &mut ys, &mut zs)
        .map_err(|e| format!("Error transforming bbox to UTM: {}", e))?;

    let utm_min_x = xs[0].min(xs[1]);
    let utm_max_x = xs[0].max(xs[1]);
    let utm_min_y = ys[0].min(ys[1]);
    let utm_max_y = ys[0].max(ys[1]);

    let gt = ds
        .geo_transform()
        .map_err(|e| format!("Error getting geotransform: {}", e))?;

    let (ds_w, ds_h) = ds.raster_size();

    let px_min = ((utm_min_x - gt[0]) / gt[1]).floor();
    let py_min = ((utm_max_y - gt[3]) / gt[5]).floor();
    let px_max = ((utm_max_x - gt[0]) / gt[1]).ceil();
    let py_max = ((utm_min_y - gt[3]) / gt[5]).ceil();

    let win_x = (px_min as isize).clamp(0, ds_w as isize - 1);
    let win_y = (py_min as isize).clamp(0, ds_h as isize - 1);
    let win_w = ((px_max - px_min) as usize)
        .max(1)
        .min((ds_w as isize - win_x) as usize);
    let win_h = ((py_max - py_min) as usize)
        .max(1)
        .min((ds_h as isize - win_y) as usize);

    let new_gt = [
        gt[0] + (win_x as f64) * gt[1],
        gt[1],
        0.0,
        gt[3] + (win_y as f64) * gt[5],
        0.0,
        gt[5],
    ];

    Ok(WindowInfo {
        utm_min_x,
        utm_min_y,
        utm_max_x,
        utm_max_y,
        target_w: win_w,
        target_h: win_h,
        new_gt,
        projection,
    })
}

fn read_band(
    href: &str,
    window: &WindowInfo,
    resample: ResampleAlg,
) -> Result<Vec<f32>, String> {
    let vsi_url = if href.starts_with("http://") || href.starts_with("https://") {
        format!("/vsicurl/{}", href)
    } else {
        href.to_string()
    };

    let ds = Dataset::open(&vsi_url)
        .map_err(|e| format!("Failed to open raster {}: {}", vsi_url, e))?;

    let gt = ds
        .geo_transform()
        .map_err(|e| format!("Error getting geotransform for {}: {}", vsi_url, e))?;
    let (ds_w, ds_h) = ds.raster_size();

    let px_min = ((window.utm_min_x - gt[0]) / gt[1]).floor();
    let py_min = ((window.utm_max_y - gt[3]) / gt[5]).floor();
    let px_max = ((window.utm_max_x - gt[0]) / gt[1]).ceil();
    let py_max = ((window.utm_min_y - gt[3]) / gt[5]).ceil();

    let win_x = (px_min as isize).clamp(0, ds_w as isize - 1);
    let win_y = (py_min as isize).clamp(0, ds_h as isize - 1);
    let win_w = ((px_max - px_min) as usize)
        .max(1)
        .min((ds_w as isize - win_x) as usize);
    let win_h = ((py_max - py_min) as usize)
        .max(1)
        .min((ds_h as isize - win_y) as usize);

    let band = ds
        .rasterband(1)
        .map_err(|e| format!("Failed to get band 1: {}", e))?;

    let buf = band
        .read_as::<f32>(
            (win_x, win_y),
            (win_w, win_h),
            (window.target_w, window.target_h),
            Some(resample),
        )
        .map_err(|e| format!("Failed to read band window: {}", e))?;

    Ok(buf.data().to_vec())
}

#[inline(always)]
fn safe_div(a: f32, b: f32) -> f32 {
    if b.abs() < 1e-6 {
        0.0
    } else {
        a / b
    }
}

fn percentile(values: &mut [f32], p: f32) -> f32 {
    if values.is_empty() {
        return 9999.0;
    }
    let idx = ((values.len() as f32) * (p / 100.0)).round() as usize;
    let target_idx = idx.min(values.len() - 1);
    values.select_nth_unstable_by(target_idx, |a, b| {
        a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal)
    });
    values[target_idx]
}

fn normalize_percentile(arr: &[f32], valid_water: &[bool], pmin: f32, pmax: f32) -> Vec<f32> {
    let mut valid_vals: Vec<f32> = arr
        .iter()
        .zip(valid_water.iter())
        .filter_map(|(&val, &is_water)| {
            if is_water && val.is_finite() {
                Some(val)
            } else {
                None
            }
        })
        .collect();

    if valid_vals.is_empty() {
        return vec![0.0; arr.len()];
    }

    let vmin = percentile(&mut valid_vals.clone(), pmin);
    let vmax = percentile(&mut valid_vals, pmax);
    let range = vmax - vmin;

    if range <= 1e-6 {
        return vec![0.0; arr.len()];
    }

    arr.par_iter()
        .zip(valid_water.par_iter())
        .map(|(&val, &is_water)| {
            if is_water && val.is_finite() {
                ((val - vmin) / range).clamp(0.0, 1.0)
            } else {
                0.0
            }
        })
        .collect()
}

fn write_classification_geotiff(
    path: &Path,
    data: &[u8],
    width: usize,
    height: usize,
    gt: &[f64; 6],
    projection: &str,
) -> Result<(), String> {
    let driver = gdal::DriverManager::get_driver_by_name("GTiff")
        .map_err(|e| format!("Error getting GTiff driver: {}", e))?;

    let options = RasterCreationOptions::from_iter(["COMPRESS=LZW"]);
    let path_str = path.to_str().ok_or_else(|| "Invalid output path for classification GeoTIFF".to_string())?;
    let mut ds = driver
        .create_with_band_type_with_options::<u8, _>(
            path_str,
            width,
            height,
            1,
            &options,
        )
        .map_err(|e| format!("Error creating classification GeoTIFF: {}", e))?;

    ds.set_geo_transform(gt)
        .map_err(|e| format!("Error setting geotransform: {}", e))?;
    ds.set_projection(projection)
        .map_err(|e| format!("Error setting projection: {}", e))?;

    let mut band = ds.rasterband(1).map_err(|e| format!("Error getting band: {}", e))?;
    let mut buffer = gdal::raster::Buffer::new((width, height), data.to_vec());
    band.write((0, 0), (width, height), &mut buffer)
        .map_err(|e| format!("Error writing band: {}", e))?;

    Ok(())
}

fn write_rgb_geotiff(
    path: &Path,
    r: &[f32],
    g: &[f32],
    b: &[f32],
    width: usize,
    height: usize,
    gt: &[f64; 6],
    projection: &str,
) -> Result<(), String> {
    let driver = gdal::DriverManager::get_driver_by_name("GTiff")
        .map_err(|e| format!("Error getting GTiff driver: {}", e))?;

    let options = RasterCreationOptions::from_iter(["COMPRESS=LZW", "PHOTOMETRIC=RGB"]);
    let path_str = path.to_str().ok_or_else(|| "Invalid output path for RGB GeoTIFF".to_string())?;
    let mut ds = driver
        .create_with_band_type_with_options::<u8, _>(
            path_str,
            width,
            height,
            3,
            &options,
        )
        .map_err(|e| format!("Error creating RGB GeoTIFF: {}", e))?;

    ds.set_geo_transform(gt)
        .map_err(|e| format!("Error setting geotransform: {}", e))?;
    ds.set_projection(projection)
        .map_err(|e| format!("Error setting projection: {}", e))?;

    let to_u8 = |arr: &[f32]| -> Vec<u8> {
        arr.iter().map(|&v| (v * 255.0).clamp(0.0, 255.0) as u8).collect()
    };

    let mut band1 = ds.rasterband(1).map_err(|e| format!("Error getting band 1: {}", e))?;
    let mut buf1 = gdal::raster::Buffer::new((width, height), to_u8(r));
    band1.write((0, 0), (width, height), &mut buf1)
        .map_err(|e| format!("Error writing band 1: {}", e))?;

    let mut band2 = ds.rasterband(2).map_err(|e| format!("Error getting band 2: {}", e))?;
    let mut buf2 = gdal::raster::Buffer::new((width, height), to_u8(g));
    band2.write((0, 0), (width, height), &mut buf2)
        .map_err(|e| format!("Error writing band 2: {}", e))?;

    let mut band3 = ds.rasterband(3).map_err(|e| format!("Error getting band 3: {}", e))?;
    let mut buf3 = gdal::raster::Buffer::new((width, height), to_u8(b));
    band3.write((0, 0), (width, height), &mut buf3)
        .map_err(|e| format!("Error writing band 3: {}", e))?;

    Ok(())
}

pub fn process_water_quality(
    _item_id: &str,
    bbox: &[f64; 4],
    hrefs: &HashMap<String, String>,
    output_dir: &Path,
    class_file: &str,
    rgb_file: &str,
) -> Result<(), String> {
    init_gdal_options();

    let b02_href = hrefs.get("blue").ok_or("Missing asset: blue")?;
    let b03_href = hrefs.get("green").ok_or("Missing asset: green")?;
    let b04_href = hrefs.get("red").ok_or("Missing asset: red")?;
    let b08_href = hrefs.get("nir").ok_or("Missing asset: nir")?;

    let b05_href = hrefs.get("rededge1").ok_or("Missing asset: rededge1")?;
    let b06_href = hrefs.get("rededge2").ok_or("Missing asset: rededge2")?;
    let b8a_href = hrefs.get("nir08").ok_or("Missing asset: nir08")?;
    let b11_href = hrefs.get("swir16").ok_or("Missing asset: swir16")?;
    let scl_href = hrefs.get("scl").ok_or("Missing asset: scl")?;

    let vsi_green = format!("/vsicurl/{}", b03_href);
    let ds_green = Dataset::open(&vsi_green)
        .map_err(|e| format!("Error opening primary band: {}", e))?;

    let window_info = calculate_window_for_bbox(&ds_green, bbox)?;
    let target_size = (window_info.target_w, window_info.target_h);
    let num_pixels = target_size.0 * target_size.1;

    // Parallel fetch of all 9 bands from AWS S3 using Rayon
    let bands_res: Result<Vec<Vec<f32>>, String> = [
        (b02_href, ResampleAlg::Bilinear),
        (b03_href, ResampleAlg::Bilinear),
        (b04_href, ResampleAlg::Bilinear),
        (b08_href, ResampleAlg::Bilinear),
        (b05_href, ResampleAlg::Bilinear),
        (b06_href, ResampleAlg::Bilinear),
        (b8a_href, ResampleAlg::Bilinear),
        (b11_href, ResampleAlg::Bilinear),
        (scl_href, ResampleAlg::NearestNeighbour),
    ]
    .par_iter()
    .map(|(href, alg)| read_band(href, &window_info, *alg))
    .collect();

    let mut bands = bands_res?;
    if bands.len() != 9 {
        return Err(format!("Expected 9 bands for water quality processing, got {}", bands.len()));
    }
    let scl = bands.remove(8);
    let b11 = bands.remove(7);
    let _b8a = bands.remove(6);
    let _b06 = bands.remove(5);
    let b05 = bands.remove(4);
    let b08 = bands.remove(3);
    let b04 = bands.remove(2);
    let b03 = bands.remove(1);
    let _b02 = bands.remove(0);

    // Parallel calculation of water indices and masks
    struct PixelCalc {
        valid_water: bool,
        ndti: f32,
        ndci: f32,
        fai: f32,
        red_excess: f32,
    }

    let calcs: Vec<PixelCalc> = (0..num_pixels)
        .into_par_iter()
        .map(|i| {
            let p_b03 = b03[i] / 10000.0;
            let p_b04 = b04[i] / 10000.0;
            let p_b05 = b05[i] / 10000.0;
            let p_b08 = b08[i] / 10000.0;
            let p_b11 = b11[i] / 10000.0;
            let p_scl = scl[i] as i16;

            let ndwi = safe_div(p_b03 - p_b08, p_b03 + p_b08);
            let mndwi = safe_div(p_b03 - p_b11, p_b03 + p_b11);
            let water_mask = ndwi > 0.05 || mndwi > 0.10;
            let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
            let valid_water = water_mask && !cloud_mask;

            let nir2 = p_b04 + (p_b11 - p_b04) * ((832.8 - 664.6) / (1613.7 - 664.6));
            let fai = p_b08 - nir2;
            let ndci = safe_div(p_b05 - p_b04, p_b05 + p_b04);
            let ndti = safe_div(p_b04 - p_b03, p_b04 + p_b03);
            let red_excess = p_b04 - p_b03;

            PixelCalc {
                valid_water,
                ndti,
                ndci,
                fai,
                red_excess,
            }
        })
        .collect();

    // Calculate dynamic statistical thresholds
    let mut fai_water: Vec<f32> = calcs
        .iter()
        .filter_map(|c| if c.valid_water && c.fai.is_finite() { Some(c.fai) } else { None })
        .collect();
    let mut ndci_water: Vec<f32> = calcs
        .iter()
        .filter_map(|c| if c.valid_water && c.ndci.is_finite() { Some(c.ndci) } else { None })
        .collect();
    let mut ndti_water: Vec<f32> = calcs
        .iter()
        .filter_map(|c| if c.valid_water && c.ndti.is_finite() { Some(c.ndti) } else { None })
        .collect();
    let mut red_water: Vec<f32> = calcs
        .iter()
        .filter_map(|c| if c.valid_water && c.red_excess.is_finite() { Some(c.red_excess) } else { None })
        .collect();

    let thr_algae = percentile(&mut fai_water, 95.0);
    let thr_chl = percentile(&mut ndci_water, 85.0);
    let thr_turb = percentile(&mut ndti_water, 85.0);
    let thr_red = percentile(&mut red_water, 85.0);

    // Classification mapping (0=Background, 1=Clean, 2=Turbid, 3=Chlorophyll, 4=Algae, 5=Anomaly)
    let classification: Vec<u8> = calcs
        .par_iter()
        .map(|c| {
            if !c.valid_water {
                0
            } else if c.ndti > thr_turb && c.red_excess > thr_red && c.ndci < thr_chl {
                5
            } else if c.fai > thr_algae {
                4
            } else if c.ndci > thr_chl {
                3
            } else if c.ndti > thr_turb {
                2
            } else {
                1
            }
        })
        .collect();

    // Normalizations for RGB visualization
    let valid_water_flags: Vec<bool> = calcs.iter().map(|c| c.valid_water).collect();
    let ndti_all: Vec<f32> = calcs.iter().map(|c| c.ndti).collect();
    let ndci_all: Vec<f32> = calcs.iter().map(|c| c.ndci).collect();
    let fai_all: Vec<f32> = calcs.iter().map(|c| c.fai).collect();

    let turb_norm = normalize_percentile(&ndti_all, &valid_water_flags, 2.0, 98.0);
    let chl_norm = normalize_percentile(&ndci_all, &valid_water_flags, 2.0, 98.0);
    let algae_norm = normalize_percentile(&fai_all, &valid_water_flags, 2.0, 98.0);

    // Save GeoTIFFs
    let class_path = output_dir.join(class_file);
    let rgb_path = output_dir.join(rgb_file);

    write_classification_geotiff(
        &class_path,
        &classification,
        target_size.0,
        target_size.1,
        &window_info.new_gt,
        &window_info.projection,
    )?;

    write_rgb_geotiff(
        &rgb_path,
        &turb_norm,
        &chl_norm,
        &algae_norm,
        target_size.0,
        target_size.1,
        &window_info.new_gt,
        &window_info.projection,
    )?;

    Ok(())
}
