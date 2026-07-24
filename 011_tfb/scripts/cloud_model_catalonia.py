"""
Script de inferencia "Serverless" (Procesamiento Efímero).
Procesa los gránulos desde Copernicus CDSE, ejecutando el modelo localmente
y eliminando las bandas originales pesadas al instante.
"""

import os
import time
import requests
import tempfile
from pathlib import Path
from dotenv import load_dotenv

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
    """
    Gestiona la obtención y refresco automático del token JWT (JSON Web Token)
    necesario para la autenticación contra el API de Copernicus (CDSE).
    Implementa un sistema de caché en memoria que reutiliza el token existente
    hasta 60 segundos antes de su caducidad, minimizando las llamadas al
    servidor de autenticación (Keycloak).
    
    Returns:
        str: El token de acceso (Bearer token) válido.
    """
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
    """
    Interroga la base de datos OData de Copernicus para localizar el Identificador
    Único (UUID) de un gránulo específico.
    
    Args:
        tile (str): El identificador de la cuadrícula militar (MGRS), ej. '31TCH' o 'T31TCH'.
        date_str (str): Fecha de adquisición en formato 'YYYY-MM-DD'.
        level (str): Nivel de procesamiento ('MSIL1C' para reflectancia TOA, 'MSIL2A' para reflectancia BOA).
        
    Returns:
        str o None: El UUID del producto si se encuentra, None en caso contrario.
    """
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
    """
    Descarga un producto `.SAFE` empaquetado en formato `.zip` desde el endpoint
    de OData `$value`, utilizando el protocolo HTTP con autenticación Bearer.
    Incluye una barra de progreso visual (tqdm) basada en el tamaño del archivo.
    
    Args:
        product_id (str): UUID del producto en Copernicus CDSE.
        dest_path (Path/str): Ruta local absoluta o relativa donde se guardará el `.zip`.
    """
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


def extract_bands(zip_path, dest_dir, id_granule, level):
    """
    Realiza una "extracción quirúrgica" de un archivo `.zip` de Sentinel-2.
    En lugar de descomprimir gigabytes de datos innecesarios, lee el índice del ZIP
    y extrae en disco únicamente los archivos JPEG2000 (`.jp2`) correspondientes a las
    bandas ópticas requeridas por nuestra red neuronal (B02, B03, B04, B08, B11, B12)
    o la máscara de clasificación Sen2Cor (SCL).
    
    Args:
        zip_path (Path): Ruta del archivo `.zip` origen.
        dest_dir (Path): Directorio destino efímero donde depositar los archivos.
        id_granule (str): Prefijo (Fecha_Tile) que se asignará al archivo extraído.
        level (str): 'MSIL1C' (extrae bandas) o 'MSIL2A' (extrae máscara SCL).
    """
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
    """
    Transforma la máscara de clasificación oficial de la ESA (Scene Classification Layer, 12 clases)
    colapsándola topológicamente a nuestras 5 Clases Maestras de negocio:
    (0: Descarte/Agua, 1: Suelo, 2: Nube, 3: Sombra de Nube, 4: Nieve).
    
    Lee el archivo `.jp2` original y exporta un nuevo `.tif` optimizado (deflate).
    
    Args:
        scl_jp2_path (Path): Ruta al `.jp2` SCL extraído.
        dest_tif_path (Path): Ruta destino para el `.tif` colapsado.
    """
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
    """
    Ejecuta el corazón de la Inferencia de Inteligencia Artificial (Red U-Net).
    Carga en memoria las bandas extraídas, efectúa Feature Engineering (cálculo de NDSI),
    y recorre la matriz de 10980x10980 píxeles mediante ventanas deslizantes (patching)
    de 512x512 para inferir las clases píxel a píxel.
    
    Finalmente, aplica una máscara geográfica estática (para enmascarar el Mar Mediterráneo)
    y exporta los mapas de segmentación resultantes en formato Cloud Optimized GeoTIFF (y variantes RGB).
    
    Args:
        dest_dir (Path): Directorio temporal donde residen los `.jp2` de entrada.
        id_granule (str): Identificador único (Ej: 2026-06-01_T31TCH).
        model (torch.nn.Module): Modelo PyTorch cargado en memoria.
        device (torch.device): Dispositivo de ejecución (CPU/CUDA).
        base_path (Path): Ruta base del script para localizar archivos estáticos (ej. MASCARA_CATALUNYA).
        out_tif_dir (Path): Directorio definitivo persistente donde guardar las predicciones.
    """
    print("    [+] Iniciando Inferencia en memoria...")
    paths = {
        b: dest_dir / f"{id_granule}_{b}.jp2"
        for b in ["B02", "B03", "B04", "B08", "B11", "B12"]
    }
    paths["SCL"] = dest_dir / f"{id_granule}_SCL.tif"

    if not all(p.exists() for p in paths.values()):
        print("    [-] Error: Faltan bandas extraídas.")
        return

    # 1. Leemos B02 (Azul) a resolución 10m para usarla como perfil base (Target Profile)
    with rasterio.open(paths["B02"]) as src:
        target_shape = (src.height, src.width)
        target_profile = src.profile
        b02 = src.read(1)
    
    # Leemos el resto de bandas ópticas nativas a 10m
    with rasterio.open(paths["B03"]) as src:
        b03 = src.read(1)
    with rasterio.open(paths["B04"]) as src:
        b04 = src.read(1)
    with rasterio.open(paths["B08"]) as src:
        b08 = src.read(1)

    # 2. Las bandas SWIR (B11, B12) vienen a 20m de resolución original.
    # Usamos interpolación bilineal para remuestrearlas (upsampling) a 10m
    b11 = load_and_resample(paths["B11"], target_shape, is_categorical=False)
    b12 = load_and_resample(paths["B12"], target_shape, is_categorical=False)
    scl_raw = load_and_resample(paths["SCL"], target_shape, is_categorical=True)

    # 3. Feature Engineering: Calculamos el Normalized Difference Snow Index (NDSI)
    # Matemáticamente: (Verde - SWIR) / (Verde + SWIR). Crucial para discriminar nieve vs nube brillante
    b03_float = b03.astype(np.float32)
    b11_float = b11.astype(np.float32)
    ndsi = (b03_float - b11_float) / (b03_float + b11_float + 1e-8)

    # 4. Apilamos las 6 bandas + el índice NDSI en un Tensor Maestro de 7 canales
    X = np.stack([b02, b03, b04, b08, b11, b12, ndsi], axis=0).astype(np.float32)

    patch_size = 512
    h, w = target_shape
    predicted_mask = np.zeros((h, w), dtype=np.uint8)

    print("    [+] Ejecutando Red U-Net (Parches 512x512)...")
    # 5. Iteración Espacial: Una imagen entera (10980x10980) no cabe en la VRAM de la GPU de golpe.
    # La recorremos de forma segmentada (ventanas deslizantes de 512x512).
    with torch.no_grad():
        for row in range(0, h - patch_size + 1, patch_size):
            for col in range(0, w - patch_size + 1, patch_size):
                # Extraemos el parche
                x_patch = X[:, row : row + patch_size, col : col + patch_size]
                # Convertimos a Tensor de PyTorch y lo mandamos a la Tarjeta Gráfica (GPU)
                x_tensor = torch.from_numpy(x_patch).unsqueeze(0).to(device)
                
                # Inferencia directa (Forward Pass)
                logits = model(x_tensor)
                
                # Función Argmax: Nos quedamos con el canal (clase) de mayor probabilidad estadística
                preds = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy()
                
                # Reconstruimos la imagen final ensamblando los parches predichos
                predicted_mask[row : row + patch_size, col : col + patch_size] = preds

    sea_mask_path = base_path / "data" / "MASCARA_CATALUNYA.tif"
    if sea_mask_path.exists():
        sea_mask = get_sea_mask(sea_mask_path, target_shape, target_profile)
        predicted_mask[sea_mask == 0] = 0
        scl_raw[sea_mask == 0] = 0

    print("    [+] Guardando predicciones y descartando RAM...")
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
    binary_mask[np.isin(predicted_mask, [1, 4])] = 1
    out_binary_path = out_tif_dir / f"{id_granule}_SCL_UNET_mask_clouds.tif"
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(out_binary_path, "w", **out_profile) as dst:
            dst.write(binary_mask, 1)


def get_granules_in_range(start_date_str, end_date_str):
    """
    Interroga al API de OData para localizar todos los gránulos (tiles) que cruzan
    Cataluña (T31TCH, T31TDH, T31TCG, T31TDG, T31TDF, T31TCF) dentro de una ventana temporal.
    
    Args:
        start_date_str (str): Límite temporal inferior (YYYY-MM-DD).
        end_date_str (str): Límite temporal superior (YYYY-MM-DD).
        
    Returns:
        list(dict): Lista de diccionarios con metadatos de los gránulos encontrados.
    """
    print(
        f"\n[*] Consultando catálogo CDSE para Cataluña desde {start_date_str} hasta {end_date_str}..."
    )
    tiles = ["31TCH", "31TDH", "31TCG", "31TDG", "31TDF", "31TCF"]
    granules = []

    start_dt = f"{start_date_str}T00:00:00.000Z"
    end_dt = f"{end_date_str}T23:59:59.999Z"

    import urllib.parse

    for tile in tiles:
        query = f"Collection/Name eq 'SENTINEL-2' and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A') and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'tileId' and att/OData.CSC.StringAttribute/Value eq '{tile}') and ContentDate/Start ge {start_dt} and ContentDate/Start le {end_dt}"
        encoded_query = urllib.parse.quote(query)
        url = f"{ODATA_URL}?$filter={encoded_query}&$top=100&$orderby=ContentDate/Start asc"

        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                for item in data.get("value", []):
                    date_val = item["ContentDate"]["Start"].split("T")[0]
                    id_granule = f"{date_val}_T{tile}"
                    if not any(g["id"] == id_granule for g in granules):
                        granules.append(
                            {"id": id_granule, "tile": f"T{tile}", "date": date_val}
                        )
        except Exception as e:
            print(f"    [!] Error consultando Tile {tile}: {e}")

    # Ordenar por fecha
    granules.sort(key=lambda x: x["date"])
    print(f"    [v] Se encontraron {len(granules)} gránulos L2A en ese periodo.")
    return granules


def process_pipeline(start_date_str, end_date_str):
    """
    Orquestador principal de la arquitectura de Procesamiento Efímero (Serverless-like).
    Para cada gránulo encontrado en el periodo:
    1. Instancia un directorio temporal atado a la memoria (RAM o disco efímero).
    2. Ejecuta la ingesta, extracción e inferencia AI.
    3. Asegura la persistencia de los outputs matemáticos (`_SCL_UNET.tif`).
    4. Garantiza la destrucción absoluta del directorio temporal gracias al Context Manager (`with tempfile...`),
       asegurando un footprint de disco de 0 Bytes para los datos intermedios.
       
    Args:
        start_date_str (str): Límite temporal inferior (YYYY-MM-DD).
        end_date_str (str): Límite temporal superior (YYYY-MM-DD).
    """
    base_path = Path(__file__).parent
    out_dir = base_path.parent / "visualizations" / "SCL_UNET_catalonia"
    out_dir.mkdir(parents=True, exist_ok=True)

    granules = get_granules_in_range(start_date_str, end_date_str)
    if not granules:
        print("[!] Fin del proceso.")
        return

    model_path = base_path.parent / "checkpoints" / "baseline_model.pth"
    device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")
    model = UNet(in_channels=7, out_classes=6).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    for row in granules:
        id_granule = row["id"]
        tile = row["tile"]
        date_str = row["date"]

        # Si ya existe el output, nos lo saltamos para reanudar fácilmente
        if (out_dir / f"{id_granule}_SCL_UNET.tif").exists():
            print(f"[*] Omitiendo {id_granule}, ya procesado.")
            continue

        print(
            f"\n{'='*40}\nProcesando Efímero: {id_granule} | {tile} | {date_str}\n{'='*40}"
        )

        # EL PODER DE LA ARQUITECTURA EFÍMERA:
        # Usamos Context Manager (with tempfile.TemporaryDirectory)
        # Esto le indica al Sistema Operativo que asigne una carpeta temporal atada a este bloque de código.
        with tempfile.TemporaryDirectory() as temp_dir_name:
            temp_dir = Path(temp_dir_name)

            l1c_id = search_odata(tile, date_str, "MSIL1C")
            l2a_id = search_odata(tile, date_str, "MSIL2A")

            if not l1c_id or not l2a_id:
                print(f"    [!] Error: No se encontró L1C o L2A para este gránulo.")
                continue

            zip_l1c = temp_dir / "temp_l1c.zip"
            zip_l2a = temp_dir / "temp_l2a.zip"

            print("[>] Fase 1: Descarga temporal a RAM/Disco Efímero")
            download_zip(l1c_id, zip_l1c)
            download_zip(l2a_id, zip_l2a)

            print("[>] Fase 2: Extracción quirúrgica")
            extract_bands(zip_l1c, temp_dir, id_granule, "MSIL1C")
            extract_bands(zip_l2a, temp_dir, id_granule, "MSIL2A")

            raw_scl = temp_dir / f"{id_granule}_SCL_raw.jp2"
            dest_scl = temp_dir / f"{id_granule}_SCL.tif"
            if raw_scl.exists():
                collapse_scl(raw_scl, dest_scl)

            print("[>] Fase 3: Inferencia PyTorch")
            run_inference(temp_dir, id_granule, model, device, base_path, out_dir)

            print("[>] Fase 3.5: Exportando Composiciones Ópticas de Validación (RGB / SWIR)")
            from sentinel_downloader import create_vrt, create_8bit_tif
            
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
                print(f"    [v] Exportado: {id_granule}_ColorReal.tif")
                
            if create_vrt(vrt_swir, swir_bands):
                create_8bit_tif(vrt_swir, out_dir / f"{id_granule}_FalsoColor_Nieve.tif")
                print(f"    [v] Exportado: {id_granule}_FalsoColor_Nieve.tif")

            print("[>] Fase 4: Limpieza absoluta del directorio temporal (Automática)")
            # Al salir de este nivel de indentación, Python hace un "Garbage Collection" físico
            # y destruye los gigabytes de datos descargados, liberando el espacio instantáneamente.


from datetime import datetime

SENTINEL_START_DATE = datetime(2015, 6, 23)


def prompt_for_date(prompt_text, min_date=None):
    """
    Pide una fecha al usuario de forma interactiva y valida que
    cumpla el formato YYYY-MM-DD y las restricciones lógicas.
    """
    while True:
        date_str = input(prompt_text).strip()
        try:
            # Validar formato
            parsed_date = datetime.strptime(date_str, "%Y-%m-%d")

            # Restricción 1: Sentinel-2 no existía antes de Junio de 2015
            if parsed_date < SENTINEL_START_DATE:
                print(
                    "    [!] Error: El satélite Sentinel-2 se lanzó en junio de 2015. No existen imágenes previas a esa fecha."
                )
                continue

            # Restricción 2: Fecha Fin >= Fecha Inicio
            if min_date and parsed_date < min_date:
                print(
                    "    [!] Error: La fecha de fin no puede ser anterior a la fecha de inicio."
                )
                continue

            return parsed_date, date_str

        except ValueError:
            print(
                "    [!] Error: Formato incorrecto o fecha no válida. Usa YYYY-MM-DD (ej: 2026-06-01)."
            )


if __name__ == "__main__":
    print("=== Pipeline Serverless CDSE ===")
    start_dt, start_date = prompt_for_date(
        "Introduce la fecha de inicio (YYYY-MM-DD): "
    )
    end_dt, end_date = prompt_for_date(
        "Introduce la fecha de fin (YYYY-MM-DD): ", min_date=start_dt
    )

    print(
        f"\n[v] ¡Perfecto! Buscaremos gránulos en el rango: {start_date} al {end_date}."
    )

    print("\n[*] Importando el Motor de Inteligencia Artificial (unos segundos)...")
    import pandas as pd
    import zipfile
    import shutil
    import torch
    import numpy as np
    import rasterio
    from rasterio.enums import Resampling
    from tqdm import tqdm
    from model import UNet
    from create_dataset import load_and_resample, get_sea_mask
    from gimp_tools import encode_to_rgb

    process_pipeline(start_date, end_date)
