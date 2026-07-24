"""
Módulo principal de extracción de datos (ETL) vía Copernicus API.

Automatiza la descarga focalizada de los gránulos estratificados definidos
en los archivos CSV de configuración. Extrae las bandas espectrales L1C
(Visible, NIR, SWIR) y limita la descarga L2A exclusivamente a la máscara SCL.
"""

import os
import time
import requests
import pandas as pd
import zipfile
import shutil
import subprocess
import rasterio
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
from tqdm import tqdm
from rasterio.enums import Resampling
from PIL import Image
from gimp_tools import encode_to_rgb

load_dotenv()

# Soportamos tanto CDSE_USERNAME como CDSE_USER
CDSE_USERNAME = os.getenv("CDSE_USERNAME") or os.getenv("CDSE_USER")
CDSE_PASSWORD = os.getenv("CDSE_PASSWORD")

if not CDSE_USERNAME or not CDSE_PASSWORD:
    raise ValueError(
        "Por favor, configura CDSE_USERNAME y CDSE_PASSWORD en el archivo .env"
    )

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
    """Busca en OData usando filtros. level puede ser MSIL1C o MSIL2A"""
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
    url = (
        f"https://zipper.dataspace.copernicus.eu/odata/v1/Products({product_id})/$value"
    )
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=headers, stream=True)
    response.raise_for_status()

    total_size = int(response.headers.get("content-length", 0))

    with open(dest_path, "wb") as file, tqdm(
        desc=f"    Descargando ZIP ({product_id})",
        total=total_size,
        unit="iB",
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024 * 1024):
            size = file.write(data)
            bar.update(size)


def create_vrt(output_vrt, input_bands):
    if not all(p.exists() for p in input_bands):
        return False
    cmd = ["gdalbuildvrt", "-separate", "-resolution", "highest", str(output_vrt)] + [
        str(p) for p in input_bands
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True


def create_8bit_tif(vrt_path, output_tif):
    if not os.path.exists(vrt_path):
        return False
    # gdal_translate escala de 0-3500 a 0-255 (Byte)
    # -co TFW=YES crea el archivo de texto/xml de coordenadas separado
    cmd = [
        "gdal_translate",
        "-scale",
        "0",
        "3500",
        "0",
        "255",
        "-ot",
        "Byte",
        "-co",
        "TFW=YES",
        str(vrt_path),
        str(output_tif),
    ]
    # Usamos GDAL_PAM_ENABLED=YES para generar también el .aux.xml por si acaso
    env = os.environ.copy()
    env["GDAL_PAM_ENABLED"] = "YES"
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
    return True


def create_preview(vrt_path, output_png):
    if not os.path.exists(vrt_path):
        return False
    try:
        with rasterio.open(vrt_path) as src:
            data = src.read(
                out_shape=(src.count, 1024, 1024), resampling=Resampling.bilinear
            )
        data = np.clip(data, 0, 3500)
        data = (data / 3500 * 255).astype(np.uint8)
        img_array = np.transpose(data, (1, 2, 0))
        img = Image.fromarray(img_array)
        img.save(output_png)
        return True
    except Exception as e:
        print(f"      [!] Error creando preview: {e}")
        return False


def collapse_scl(scl_jp2_path, dest_tif_path):
    print("    [+] Colapsando máscara SCL de 12 a 5 clases maestras...")
    with rasterio.open(scl_jp2_path) as src:
        meta = src.meta.copy()
        data = src.read(1)

    new_data = np.zeros_like(data)

    # 0 (Basura): 0, 1, 2, 7 (ya es 0)
    # 1 (Suelo): 4, 5
    new_data[np.isin(data, [4, 5])] = 1
    # 2 (Nube): 8, 9, 10
    new_data[np.isin(data, [8, 9, 10])] = 2
    # 3 (Sombra Nube): 3
    new_data[data == 3] = 3
    # 4 (Nieve): 11
    new_data[data == 11] = 4
    # 5 (Masas de Agua): 6
    new_data[data == 6] = 5

    meta.update(driver="GTiff", compress="deflate")

    with rasterio.open(dest_tif_path, "w", **meta) as dst:
        dst.write(new_data, 1)

    os.remove(scl_jp2_path)

    # Generar la versión RGB para GIMP
    dest_gimp = str(dest_tif_path).replace(".tif", "_GIMP.tif")
    if encode_to_rgb(dest_tif_path, dest_gimp):
        print(f"    [v] Exportado para GIMP: {Path(dest_gimp).name}")


def extract_bands(zip_path, dest_dir, id_granule, level):
    print("    [+] Extrayendo archivos requeridos y borrando ZIP...")
    bandas = ["B02", "B03", "B04", "B08", "B11", "B12"]

    with zipfile.ZipFile(zip_path, "r") as z:
        for file_info in z.infolist():
            filename = file_info.filename

            # Evitar carpetas u otros archivos
            if not filename.endswith(".jp2"):
                continue

            if level == "MSIL1C":
                if (
                    "IMG_DATA/" in filename
                    and "QI_DATA/" not in filename
                    and any(f"_{b}.jp2" in filename for b in bandas)
                ):
                    # Identificar de qué banda se trata
                    band_name = next(b for b in bandas if f"_{b}.jp2" in filename)
                    out_name = dest_dir / f"{id_granule}_{band_name}.jp2"
                    with z.open(file_info) as source, open(out_name, "wb") as target:
                        shutil.copyfileobj(source, target)

            elif level == "MSIL2A":
                # En L2A la máscara se llama SCL_20m.jp2 o similar, dentro de IMG_DATA
                if (
                    "SCL" in filename
                    and "IMG_DATA/" in filename
                    and "QI_DATA/" not in filename
                ):
                    out_name = dest_dir / f"{id_granule}_SCL_raw.jp2"
                    with z.open(file_info) as source, open(out_name, "wb") as target:
                        shutil.copyfileobj(source, target)

    # Colapsar las clases de la máscara SCL después de extraerla
    if level == "MSIL2A":
        raw_scl = dest_dir / f"{id_granule}_SCL_raw.jp2"
        if raw_scl.exists():
            dest_tif = dest_dir / f"{id_granule}_SCL.tif"
            collapse_scl(raw_scl, dest_tif)


def process_csv(csv_path, output_base_dir):
    df = pd.read_csv(csv_path)
    df_valid = df[df["date"] != "YYYY-MM-DD"]

    if df_valid.empty:
        return

    for index, row in df_valid.iterrows():
        id_granule = row["id"]
        tile = row["tile"]
        date_str = row["date"]

        print(f"\n{'='*40}")
        print(f"Procesando: {id_granule} | Tile: {tile} | Fecha: {date_str}")
        print(f"{'='*40}")

        dest_dir = Path(output_base_dir) / id_granule
        dest_dir.mkdir(parents=True, exist_ok=True)

        # 1. L1C (Bandas Físicas)
        print("[>] Paso 1: Bandas L1C")
        l1c_id = search_odata(tile, date_str, "MSIL1C")
        if l1c_id:
            zip_l1c = dest_dir / "temp_l1c.zip"
            if not any(dest_dir.glob(f"{id_granule}_B*.jp2")):
                download_zip(l1c_id, zip_l1c)
                extract_bands(zip_l1c, dest_dir, id_granule, "MSIL1C")
                os.remove(zip_l1c)
            else:
                print("    [-] Bandas L1C ya existen. Omitiendo.")
        else:
            print(f"    [!] No se encontró producto L1C")

        # 2. L2A (Máscara SCL)
        print("[>] Paso 2: Máscara SCL (L2A)")
        l2a_id = search_odata(tile, date_str, "MSIL2A")
        if l2a_id:
            zip_l2a = dest_dir / "temp_l2a.zip"
            if not (dest_dir / f"{id_granule}_SCL.tif").exists():
                download_zip(l2a_id, zip_l2a)
                extract_bands(zip_l2a, dest_dir, id_granule, "MSIL2A")
                os.remove(zip_l2a)
            else:
                print("    [-] Máscara SCL ya existe. Omitiendo.")
        else:
            print(f"    [!] No se encontró producto L2A")

        # 3. Generar Vistas VRT
        print("[>] Paso 3: Generando Vistas VRT para QGIS")
        rgb_bands = [
            dest_dir / f"{id_granule}_B04.jp2",
            dest_dir / f"{id_granule}_B03.jp2",
            dest_dir / f"{id_granule}_B02.jp2",
        ]
        swir_bands = [
            dest_dir / f"{id_granule}_B11.jp2",
            dest_dir / f"{id_granule}_B08.jp2",
            dest_dir / f"{id_granule}_B04.jp2",
        ]

        vrt_rgb = dest_dir / f"{id_granule}_ColorReal.vrt"
        vrt_swir = dest_dir / f"{id_granule}_FalsoColor_Nieve.vrt"

        if create_vrt(vrt_rgb, rgb_bands):
            print("    [v] Generado: ColorReal.vrt")
            create_8bit_tif(vrt_rgb, dest_dir / f"{id_granule}_ColorReal.tif")
            print("    [v] Exportado a 8-bits: ColorReal.tif (con .tfw/.xml)")

        if create_vrt(vrt_swir, swir_bands):
            print("    [v] Generado: FalsoColor_Nieve.vrt")
            create_8bit_tif(vrt_swir, dest_dir / f"{id_granule}_FalsoColor_Nieve.tif")
            print("    [v] Exportado a 8-bits: FalsoColor_Nieve.tif (con .tfw/.xml)")

        print("[>] Paso 4: Generando preview PNG...")
        png_path = dest_dir / f"{id_granule}_preview.png"
        if create_preview(dest_dir / f"{id_granule}_ColorReal.vrt", png_path):
            print(f"    [v] Generado: {png_path.name}")
            artifact_png = (
                Path(
                    "/home/a.lopez.g/.gemini/antigravity-ide/brain/b6a3aaf7-4a02-4481-ba6f-7d05e0d0de13/scratch"
                )
                / f"{id_granule}_preview.png"
            )
            import shutil

            shutil.copy(png_path, artifact_png)
