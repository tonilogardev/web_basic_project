import os
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject
import numpy as np
import pandas as pd
from pathlib import Path
from tqdm import tqdm

def load_and_resample(file_path, target_shape, is_categorical=False):
    """
    Lee un archivo JP2 y lo remuestrea a la resolución objetivo.
    is_categorical=True usa Nearest Neighbor (para máscaras SCL).
    is_categorical=False usa Bilinear (para bandas físicas B11, B12).
    """
    resampling_method = Resampling.nearest if is_categorical else Resampling.bilinear
    
    with rasterio.open(file_path) as dataset:
        data = dataset.read(
            1,
            out_shape=target_shape,
            resampling=resampling_method
        )
    return data

def get_sea_mask(mask_path, target_shape, src_profile):
    """
    Lee y reproyecta la máscara estática (ej. MASCARA_CATALUNYA.tif) 
    para que encaje perfectamente con la cuadrícula de 10m del Tile actual.
    Devuelve un array booleano o binario de shape target_shape.
    """
    sea_mask = np.zeros(target_shape, dtype=np.uint8)
    
    with rasterio.open(mask_path) as src_mask:
        reproject(
            source=rasterio.band(src_mask, 1),
            destination=sea_mask,
            src_transform=src_mask.transform,
            src_crs=src_mask.crs,
            dst_transform=src_profile['transform'],
            dst_crs=src_profile['crs'],
            resampling=Resampling.nearest
        )
    return sea_mask

def process_granule(id_granule, input_dir, output_dir, patch_size=512):
    """Procesa un gránulo completo, calcula NDSI, extrae parches y los guarda."""
    
    # Comprobar que existen los archivos
    required_bands = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12']
    paths = {b: input_dir / f"{id_granule}_{b}.jp2" for b in required_bands}
    
    # Soporte para SCL curado manualmente
    scl_edited_path = input_dir / f"{id_granule}_SCL_edited.tif"
    scl_original_path = input_dir / f"{id_granule}_SCL.tif"
    
    if scl_edited_path.exists():
        paths['SCL'] = scl_edited_path
        print(f"    [*] Usando máscara curada manualmente: {scl_edited_path.name}")
    else:
        paths['SCL'] = scl_original_path
    
    if not all(p.exists() for p in paths.values()):
        print(f"[-] Saltando {id_granule}: Faltan archivos .jp2 descargados.")
        return 0

    print(f"\n[+] Cargando bandas físicas de {id_granule}...")
    
    # 1. Leer banda de 10m de referencia (ej. B02) para obtener el tamaño y CRS objetivo
    with rasterio.open(paths['B02']) as src:
        target_shape = (src.height, src.width) # Típicamente (10980, 10980)
        target_profile = src.profile
        
    # 2. Cargar bandas nativas a 10m
    with rasterio.open(paths['B02']) as src: b02 = src.read(1)
    with rasterio.open(paths['B03']) as src: b03 = src.read(1)
    with rasterio.open(paths['B04']) as src: b04 = src.read(1)
    with rasterio.open(paths['B08']) as src: b08 = src.read(1)
    
    # 3. Cargar y remuestrear bandas de 20m a 10m (Bilineal)
    print("    Remuestreando B11, B12 y calculando NDSI...")
    b11 = load_and_resample(paths['B11'], target_shape, is_categorical=False)
    b12 = load_and_resample(paths['B12'], target_shape, is_categorical=False)
    
    # 4. Feature Engineering: Calcular NDSI = (B03 - B11) / (B03 + B11)
    # Evitamos división por cero sumando un epsilon
    b03_float = b03.astype(np.float32)
    b11_float = b11.astype(np.float32)
    ndsi = (b03_float - b11_float) / (b03_float + b11_float + 1e-8)
    
    # 5. Cargar y remuestrear SCL a 10m (Nearest Neighbor para clases categóricas)
    print("    Remuestreando máscara SCL...")
    scl = load_and_resample(paths['SCL'], target_shape, is_categorical=True)
    
    # [NUEVO] Aplicar Máscara de Mar estática (MASCARA_CATALUNYA.tif)
    sea_mask_path = Path(__file__).parent / "data" / "MASCARA_CATALUNYA.tif"
    if sea_mask_path.exists():
        print("    Cruzando con máscara de costa de Catalunya...")
        sea_mask = get_sea_mask(sea_mask_path, target_shape, target_profile)
        # La máscara tiene 0 para Mar profundo. Forzamos SCL = 0 (Basura) en esas zonas.
        scl[sea_mask == 0] = 0
    else:
        print("    [!] MASCARA_CATALUNYA.tif no encontrada. Procesando sin ella.")
        
    # Apilamos todo en un tensor X de forma (7, H, W)
    # Hacemos cast a float16. Esto reduce el peso del dataset un 50% en disco.
    X = np.stack([b02, b03, b04, b08, b11, b12, ndsi], axis=0).astype(np.float16)
    Y = scl.astype(np.uint8)
    
    # 6. Troceado (Patching)
    print(f"    Cortando parches de {patch_size}x{patch_size}...")
    h, w = target_shape
    patches_saved = 0
    
    # Creamos subcarpeta para el gránulo dentro de train
    out_granule_dir = output_dir / id_granule
    out_granule_dir.mkdir(parents=True, exist_ok=True)
    
    for row in range(0, h - patch_size + 1, patch_size):
        for col in range(0, w - patch_size + 1, patch_size):
            y_patch = Y[row:row+patch_size, col:col+patch_size]
            
            # Filtro de parches inútiles:
            # 0 = BASURA / DESCARTE (No Data, Agua, Defectuoso, etc.)
            # Si más del 90% del parche es BASURA, lo descartamos
            total_pixels = patch_size * patch_size
            basura_count = np.sum(y_patch == 0)
            
            if basura_count / total_pixels > 0.90:
                continue
                
            x_patch = X[:, row:row+patch_size, col:col+patch_size]
            
            # Guardar matrices (Tensors)
            np.save(out_granule_dir / f"X_{id_granule}_{row}_{col}.npy", x_patch)
            np.save(out_granule_dir / f"Y_{id_granule}_{row}_{col}.npy", y_patch)
            
            patches_saved += 1

    print(f"    [v] Guardados {patches_saved} parches útiles de {id_granule}.")
    return patches_saved

if __name__ == "__main__":
    base_path = Path(__file__).parent
    csv_path = base_path / "training_granules.csv"
    download_base = base_path.parent / "download" / "training"
    output_base = base_path.parent / "dataset" / "patches" / "train"
    
    if not csv_path.exists():
        print("Error: No se encuentra training_granules.csv")
        exit(1)
        
    df = pd.read_csv(csv_path)
    df_valid = df[df['date'] != 'YYYY-MM-DD']
    
    total_patches = 0
    print("==================================================")
    print(" INICIANDO CREACIÓN DE DATASET (FEATURE ENGINEERING)")
    print("==================================================")
    
    for index, row in df_valid.iterrows():
        id_granule = row['id']
        input_dir = download_base / id_granule
        
        if not input_dir.exists():
            print(f"[-] Saltando {id_granule}: Directorio no existe.")
            continue
            
        patches = process_granule(id_granule, input_dir, output_base)
        total_patches += patches
        
    print("==================================================")
    print(f" PROCESO FINALIZADO. Total de parches generados: {total_patches}")
    print(f" Ruta del dataset: {output_base}")
    print("==================================================")
