import numpy as np
import rasterio
from pathlib import Path

COLOR_MAP = {
    0: [0, 0, 0],         # Basura / Mar
    1: [34, 139, 34],     # Suelo
    2: [255, 255, 255],   # Nube
    3: [100, 100, 100],   # Sombra Nube
    4: [0, 255, 255]      # Nieve
}

def encode_to_rgb(input_tif, output_tif):
    """
    Convierte una máscara categórica de 1 banda (0-4) a un GeoTIFF RGB de 3 bandas
    basado en COLOR_MAP, ideal para editar visualmente en GIMP.
    """
    input_tif = Path(input_tif)
    output_tif = Path(output_tif)
    
    if not input_tif.exists():
        print(f"[-] No se encontró: {input_tif}")
        return False
        
    with rasterio.open(input_tif) as src:
        meta = src.meta.copy()
        data = src.read(1)
        
    h, w = data.shape
    rgb = np.zeros((3, h, w), dtype=np.uint8)
    
    for class_idx, color in COLOR_MAP.items():
        mask = (data == class_idx)
        for band in range(3):
            rgb[band][mask] = color[band]
            
    meta.update(
        count=3,
        dtype=rasterio.uint8,
        photometric='RGB',
        driver='GTiff',
        compress='deflate'
    )
    
    with rasterio.Env(GDAL_PAM_ENABLED='NO'):
        with rasterio.open(output_tif, 'w', **meta) as dst:
            dst.write(rgb)
            
    return True

def decode_to_classes(input_rgb_tif, output_tif, base_profile=None):
    """
    Escanea un GeoTIFF RGB (ej. editado en GIMP) y reconstruye la matriz matemática
    original de 1 banda (0-4) buscando el color más cercano al COLOR_MAP.
    """
    input_rgb_tif = Path(input_rgb_tif)
    output_tif = Path(output_tif)
    
    if not input_rgb_tif.exists():
        print(f"[-] No se encontró: {input_rgb_tif}")
        return False
        
    with rasterio.open(input_rgb_tif) as src:
        meta = src.meta.copy()
        if src.count < 3:
            print("[-] La imagen debe tener al menos 3 bandas (RGB).")
            return False
        rgb_data = src.read((1, 2, 3)).transpose(1, 2, 0).astype(np.float32)
        
    h, w, _ = rgb_data.shape
    new_data = np.zeros((h, w), dtype=np.uint8)
    
    classes = list(COLOR_MAP.keys())
    colors = np.array([COLOR_MAP[c] for c in classes], dtype=np.float32)
    
    # Calcular distancia euclidiana al cuadrado para cada píxel frente a los 5 colores base
    rgb_expanded = rgb_data[:, :, np.newaxis, :]
    dists = np.sum((rgb_expanded - colors) ** 2, axis=3)
    min_idx = np.argmin(dists, axis=2)
    
    for i, c in enumerate(classes):
        new_data[min_idx == i] = c
        
    # Reinyectar el perfil original si lo tenemos (para sobrevivir a GIMP)
    if base_profile:
        out_meta = base_profile.copy()
    else:
        out_meta = meta.copy()
        
    out_meta.update(
        count=1,
        dtype=rasterio.uint8,
        driver='GTiff',
        compress='deflate'
    )
    if 'photometric' in out_meta:
        del out_meta['photometric']
        
    with rasterio.Env(GDAL_PAM_ENABLED='NO'):
        with rasterio.open(output_tif, 'w', **out_meta) as dst:
            dst.write(new_data, 1)
            
    return True
