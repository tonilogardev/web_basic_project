import os
import time
import requests
import pandas as pd
import zipfile
import shutil
from pathlib import Path
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

# Soportamos tanto CDSE_USERNAME como CDSE_USER
CDSE_USERNAME = os.getenv("CDSE_USERNAME") or os.getenv("CDSE_USER")
CDSE_PASSWORD = os.getenv("CDSE_PASSWORD")

if not CDSE_USERNAME or not CDSE_PASSWORD:
    raise ValueError("Por favor, configura CDSE_USERNAME y CDSE_PASSWORD en el archivo .env")

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
        "grant_type": "password"
    }
    response = requests.post(TOKEN_URL, data=data)
    response.raise_for_status()
    
    token_info = response.json()
    ACCESS_TOKEN = token_info["access_token"]
    TOKEN_EXPIRES_AT = time.time() + token_info["expires_in"]
    
    return ACCESS_TOKEN

def search_odata(tile, date_str, level):
    """Busca en OData usando filtros. level puede ser MSIL1C o MSIL2A"""
    stac_tile = tile[1:] if tile.startswith('T') else tile
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
    
    total_size = int(response.headers.get('content-length', 0))
    
    with open(dest_path, 'wb') as file, tqdm(
        desc=f"    Descargando ZIP ({product_id})",
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024*1024):
            size = file.write(data)
            bar.update(size)

def extract_bands(zip_path, dest_dir, id_granule, level):
    print("    [+] Extrayendo archivos requeridos y borrando ZIP...")
    bandas = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12']
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        for file_info in z.infolist():
            filename = file_info.filename
            
            # Evitar carpetas u otros archivos
            if not filename.endswith('.jp2'):
                continue
                
            if level == 'MSIL1C':
                if 'IMG_DATA/' in filename and 'QI_DATA/' not in filename and any(f"_{b}.jp2" in filename for b in bandas):
                    # Identificar de qué banda se trata
                    band_name = next(b for b in bandas if f"_{b}.jp2" in filename)
                    out_name = dest_dir / f"{id_granule}_{band_name}.jp2"
                    with z.open(file_info) as source, open(out_name, "wb") as target:
                        shutil.copyfileobj(source, target)
                        
            elif level == 'MSIL2A':
                # En L2A la máscara se llama SCL_20m.jp2 o similar, dentro de IMG_DATA
                if 'SCL' in filename and 'IMG_DATA/' in filename and 'QI_DATA/' not in filename:
                    out_name = dest_dir / f"{id_granule}_SCL.jp2"
                    with z.open(file_info) as source, open(out_name, "wb") as target:
                        shutil.copyfileobj(source, target)

def process_csv(csv_path, output_base_dir):
    df = pd.read_csv(csv_path)
    df_valid = df[df['date'] != 'YYYY-MM-DD']
    
    if df_valid.empty:
        return

    for index, row in df_valid.iterrows():
        id_granule = row['id']
        tile = row['tile']
        date_str = row['date']
        
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
            if not (dest_dir / f"{id_granule}_SCL.jp2").exists():
                download_zip(l2a_id, zip_l2a)
                extract_bands(zip_l2a, dest_dir, id_granule, "MSIL2A")
                os.remove(zip_l2a)
            else:
                print("    [-] Máscara SCL ya existe. Omitiendo.")
        else:
            print(f"    [!] No se encontró producto L2A")

if __name__ == "__main__":
    base_path = Path(__file__).parent
    
    # Leemos directamente el que ya hemos rellenado
    train_csv = base_path / "training_granules.csv"
    out_train = base_path.parent / "download" / "training"
    
    if train_csv.exists():
        print("\n>>> INICIANDO DESCARGAS DE TRAINING <<<")
        process_csv(train_csv, out_train)
    else:
        print("No se encontró training_granules.csv")
