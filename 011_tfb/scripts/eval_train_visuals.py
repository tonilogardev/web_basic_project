import os
import time
import requests
import pandas as pd
import zipfile
import shutil
import tempfile
import torch
import numpy as np
import rasterio
from rasterio.enums import Resampling
from pathlib import Path
from dotenv import load_dotenv

from model import UNet
from create_dataset import load_and_resample, get_sea_mask
from gimp_tools import encode_to_rgb
from sentinel_downloader import create_vrt, create_8bit_tif, create_preview

load_dotenv()

CDSE_USERNAME = os.getenv("CDSE_USERNAME") or os.getenv("CDSE_USER")
CDSE_PASSWORD = os.getenv("CDSE_PASSWORD")

if not CDSE_USERNAME or not CDSE_PASSWORD:
    raise ValueError("Configura CDSE_USERNAME y CDSE_PASSWORD en .env")

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
ODATA_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"

ACCESS_TOKEN = None
TOKEN_EXPIRES_AT = 0


def get_token():
    global ACCESS_TOKEN, TOKEN_EXPIRES_AT
    if ACCESS_TOKEN and time.time() < (TOKEN_EXPIRES_AT - 60):
        return ACCESS_TOKEN
    print("\n[+] Solicitando nuevo token a CDSE...")
    data = {
        "client_id": "cdse-public",
        "username": CDSE_USERNAME,
        "password": CDSE_PASSWORD,
        "grant_type": "password",
    }
    response = requests.post(TOKEN_URL, data=data)
    response.raise_for_status()
    token_info = response.json()
    ACCESS_TOKEN = token_info["access_token"]
    TOKEN_EXPIRES_AT = time.time() + token_info["expires_in"]
    return ACCESS_TOKEN


def search_odata(tile, date_str, level):
    stac_tile = tile[1:] if tile.startswith("T") else tile
    filters = f"contains(Name,'{stac_tile}') and contains(Name,'{level}') and ContentDate/Start ge {date_str}T00:00:00.000Z and ContentDate/Start le {date_str}T23:59:59.999Z"
    url = f"{ODATA_URL}?$filter={filters}&$top=1"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json().get("value", [])
        if data:
            return data[0]["Id"]
    return None


def download_zip(product_id, dest_path):
    url = f"https://zipper.dataspace.copernicus.eu/odata/v1/Products({product_id})/$value"
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers, stream=True)
    response.raise_for_status()
    with open(dest_path, "wb") as file:
        for data in response.iter_content(chunk_size=1024 * 1024):
            file.write(data)


def extract_bands(zip_path, dest_dir, id_granule, level):
    bandas = ["B02", "B03", "B04", "B08", "B11", "B12"]
    with zipfile.ZipFile(zip_path, "r") as z:
        for file_info in z.infolist():
            filename = file_info.filename
            if not filename.endswith(".jp2"):
                continue
            if (
                level == "MSIL1C"
                and "IMG_DATA/" in filename
                and "QI_DATA/" not in filename
                and any(f"_{b}.jp2" in filename for b in bandas)
            ):
                band_name = next(b for b in bandas if f"_{b}.jp2" in filename)
                out_name = dest_dir / f"{id_granule}_{band_name}.jp2"
                with z.open(file_info) as source, open(out_name, "wb") as target:
                    shutil.copyfileobj(source, target)
            elif (
                level == "MSIL2A"
                and "SCL" in filename
                and "IMG_DATA/" in filename
                and "QI_DATA/" not in filename
            ):
                out_name = dest_dir / f"{id_granule}_SCL_raw.jp2"
                with z.open(file_info) as source, open(out_name, "wb") as target:
                    shutil.copyfileobj(source, target)


def collapse_scl(scl_jp2_path, dest_tif_path):
    with rasterio.open(scl_jp2_path) as src:
        meta = src.meta.copy()
        data = src.read(1)
    new_data = np.zeros_like(data)
    new_data[np.isin(data, [4, 5])] = 1
    new_data[np.isin(data, [8, 9, 10])] = 2
    new_data[data == 3] = 3
    new_data[data == 11] = 4
    meta.update(driver="GTiff", compress="deflate")
    with rasterio.open(dest_tif_path, "w", **meta) as dst:
        dst.write(new_data, 1)


def run_inference(dest_dir, id_granule, model, device, base_path, out_tif_dir):
    print("    [+] Iniciando Inferencia en memoria...")
    paths = {
        b: dest_dir / f"{id_granule}_{b}.jp2"
        for b in ["B02", "B03", "B04", "B08", "B11", "B12"]
    }
    paths["SCL"] = dest_dir / f"{id_granule}_SCL.tif"

    if not all(p.exists() for p in paths.values()):
        print("    [-] Error: Faltan bandas extraídas.")
        return

    with rasterio.open(paths["B02"]) as src:
        target_shape = (src.height, src.width)
        target_profile = src.profile
        b02 = src.read(1)
    with rasterio.open(paths["B03"]) as src:
        b03 = src.read(1)
    with rasterio.open(paths["B04"]) as src:
        b04 = src.read(1)
    with rasterio.open(paths["B08"]) as src:
        b08 = src.read(1)

    b11 = load_and_resample(paths["B11"], target_shape, is_categorical=False)
    b12 = load_and_resample(paths["B12"], target_shape, is_categorical=False)
    scl_raw = load_and_resample(paths["SCL"], target_shape, is_categorical=True)

    b03_float = b03.astype(np.float32)
    b11_float = b11.astype(np.float32)
    ndsi = (b03_float - b11_float) / (b03_float + b11_float + 1e-8)

    X = np.stack([b02, b03, b04, b08, b11, b12, ndsi], axis=0).astype(np.float32)

    patch_size = 512
    h, w = target_shape
    predicted_mask = np.zeros((h, w), dtype=np.uint8)

    print("    [+] Ejecutando Red U-Net (Parches 512x512)...")
    with torch.no_grad():
        for row in range(0, h - patch_size + 1, patch_size):
            for col in range(0, w - patch_size + 1, patch_size):
                x_patch = X[:, row : row + patch_size, col : col + patch_size]
                x_tensor = torch.from_numpy(x_patch).unsqueeze(0).to(device)
                logits = model(x_tensor)
                preds = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy()
                predicted_mask[row : row + patch_size, col : col + patch_size] = preds

    sea_mask_path = base_path / "data" / "MASCARA_CATALUNYA.tif"
    if sea_mask_path.exists():
        sea_mask = get_sea_mask(sea_mask_path, target_shape, target_profile)
        predicted_mask[sea_mask == 0] = 0
        scl_raw[sea_mask == 0] = 0

    print("    [+] Guardando predicciones...")
    out_tif_path = out_tif_dir / f"{id_granule}_SCL_UNET.tif"
    out_profile = target_profile.copy()
    out_profile.update(
        driver="GTiff", dtype=rasterio.uint8, count=1, compress="deflate"
    )
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(out_tif_path, "w", **out_profile) as dst:
            dst.write(predicted_mask, 1)

    out_gimp_path = out_tif_dir / f"{id_granule}_SCL_UNET_GIMP.tif"
    encode_to_rgb(out_tif_path, out_gimp_path)

    binary_mask = np.zeros_like(predicted_mask, dtype=np.uint8)
    binary_mask[predicted_mask == 2] = 1  # 2 es Nube
    out_binary_path = out_tif_dir / f"{id_granule}_SCL_UNET_mask_clouds.tif"
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(out_binary_path, "w", **out_profile) as dst:
            dst.write(binary_mask, 1)


def process_training_granules():
    base_path = Path(__file__).parent
    csv_path = base_path / "training_granules.csv"
    
    if not csv_path.exists():
        print("[!] No se encontró training_granules.csv")
        return
        
    df = pd.read_csv(csv_path)
    
    model_path = base_path.parent / "checkpoints" / "baseline_model.pth"
    device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")
    model = UNet(in_channels=7, out_classes=6).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    for index, row in df.iterrows():
        id_granule = row["id"]
        tile = row["tile"]
        date_str = row["date"]

        out_dir = base_path.parent / "visualizations" / "train_visuals" / id_granule
        out_dir.mkdir(parents=True, exist_ok=True)

        if (out_dir / f"{id_granule}_SCL_UNET_GIMP.tif").exists() and (out_dir / f"{id_granule}_ColorReal.tif").exists():
            print(f"[*] Omitiendo {id_granule}, ya procesado visualmente.")
            continue

        print(f"\n{'='*40}\nProcesando Visuales TR: {id_granule} | {tile} | {date_str}\n{'='*40}")

        with tempfile.TemporaryDirectory() as temp_dir_name:
            temp_dir = Path(temp_dir_name)

            l1c_id = search_odata(tile, date_str, "MSIL1C")
            l2a_id = search_odata(tile, date_str, "MSIL2A")

            if not l1c_id or not l2a_id:
                print(f"    [!] Error: No se encontró L1C o L2A para este gránulo.")
                continue

            zip_l1c = temp_dir / "temp_l1c.zip"
            zip_l2a = temp_dir / "temp_l2a.zip"

            print("[>] Fase 1: Descarga")
            download_zip(l1c_id, zip_l1c)
            download_zip(l2a_id, zip_l2a)

            print("[>] Fase 2: Extracción")
            extract_bands(zip_l1c, temp_dir, id_granule, "MSIL1C")
            extract_bands(zip_l2a, temp_dir, id_granule, "MSIL2A")

            raw_scl = temp_dir / f"{id_granule}_SCL_raw.jp2"
            dest_scl = temp_dir / f"{id_granule}_SCL.tif"
            if raw_scl.exists():
                collapse_scl(raw_scl, dest_scl)

            print("[>] Fase 3: Inferencia")
            run_inference(temp_dir, id_granule, model, device, base_path, out_dir)

            print("[>] Fase 4: Exportando Visuales Opticas")
            rgb_bands = [
                temp_dir / f"{id_granule}_B04.jp2",
                temp_dir / f"{id_granule}_B03.jp2",
                temp_dir / f"{id_granule}_B02.jp2",
            ]
            swir_bands = [
                temp_dir / f"{id_granule}_B11.jp2",
                temp_dir / f"{id_granule}_B08.jp2",
                temp_dir / f"{id_granule}_B04.jp2",
            ]
            
            vrt_rgb = temp_dir / f"{id_granule}_ColorReal.vrt"
            vrt_swir = temp_dir / f"{id_granule}_FalsoColor_Nieve.vrt"
            
            if create_vrt(vrt_rgb, rgb_bands):
                create_8bit_tif(vrt_rgb, out_dir / f"{id_granule}_ColorReal.tif")
                # Crear preview
                create_preview(vrt_rgb, out_dir / f"{id_granule}_preview.png")
                
            if create_vrt(vrt_swir, swir_bands):
                create_8bit_tif(vrt_swir, out_dir / f"{id_granule}_FalsoColor_Nieve.tif")


if __name__ == "__main__":
    process_training_granules()
