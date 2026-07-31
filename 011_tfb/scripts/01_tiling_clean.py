import os
import json
import rasterio
from rasterio.windows import Window
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Rutas (usamos el mismo Gránulo que veníamos usando)
BASE_DIR = 'download/training/2025-01-01_T31TDG'
TIF_COLOR = os.path.join(BASE_DIR, '2025-01-01_T31TDG_ColorReal.vrt')
TIF_FALSE = os.path.join(BASE_DIR, '2025-01-01_T31TDG_FalsoColor_Nieve.vrt')
TIF_SCL = os.path.join(BASE_DIR, '2025-01-01_T31TDG_SCL_GIMP.tif')

OUT_DIR = os.path.join(BASE_DIR, '002_paligemma_tiles')
os.makedirs(OUT_DIR, exist_ok=True)

TILE_SIZE = 512

# Leyenda estricta de GIMP
SCL_COLORS = {
    0: [0, 0, 0],       # Nodata
    1: [255, 255, 255], # Nube
    2: [128, 128, 128], # Sombra Nube
    3: [0, 255, 255],   # Nieve
    4: [0, 255, 0],     # Vegetación/Suelo
    5: [0, 0, 255],     # Agua
}

def normalize_band(band_data):
    """Estira el contraste para que la imagen se vea perfecta en PNG"""
    p2, p98 = np.percentile(band_data, (2, 98))
    normalized = np.clip((band_data - p2) / (p98 - p2), 0, 1)
    return (normalized * 255).astype(np.uint8)

def main():
    metadata = {}
    
    print("Abriendo archivos TIFF originales...")
    with rasterio.open(TIF_COLOR) as src_color, \
         rasterio.open(TIF_FALSE) as src_false, \
         rasterio.open(TIF_SCL) as src_scl:
        
        width = src_color.width
        height = src_color.height
        
        count = 0
        # Recorremos la matriz original
        for y in range(0, height, TILE_SIZE):
            for x in range(0, width, TILE_SIZE):
                window = Window(x, y, TILE_SIZE, TILE_SIZE)
                
                # Leer píxeles con boundless=True para que los bordes midan siempre 512x512
                color_data = src_color.read(window=window, boundless=True, fill_value=0)
                false_data = src_false.read(window=window, boundless=True, fill_value=0)
                scl_data = src_scl.read(1, window=window, boundless=True, fill_value=0)
                
                # Si la baldosa es 100% nodata, la ignoramos para ahorrar cuota
                if np.all(scl_data == 0):
                    continue
                
                # Formatear a RGB visual
                rgb_img = np.zeros((window.height, window.width, 3), dtype=np.uint8)
                false_img = np.zeros((window.height, window.width, 3), dtype=np.uint8)
                for b in range(3):
                    rgb_img[:,:,b] = normalize_band(color_data[b])
                    false_img[:,:,b] = normalize_band(false_data[b])
                    
                # Aplicar Leyenda a la máscara
                scl_rgb = np.zeros((window.height, window.width, 3), dtype=np.uint8)
                for val, color in SCL_COLORS.items():
                    scl_rgb[scl_data == val] = color
                    
                # Exportar solo el RGB puro (512x512) para que PaliGemma no lo distorsione
                w, h = window.width, window.height
                if w == TILE_SIZE and h == TILE_SIZE: # Solo baldosas cuadradas perfectas
                    tile_name = f"clean_tile_{x}_{y}.png"
                    Image.fromarray(rgb_img).save(os.path.join(OUT_DIR, tile_name))
                    
                    # EL SECRETO GIS: Guardamos las coordenadas matemáticas!
                    metadata[tile_name] = {
                        "window_x": x,
                        "window_y": y,
                        "width": w,
                        "height": h
                    }
                    count += 1
                    print(f"Generado {tile_name}")
                
    # Guardar la tabla de traducción visual <-> matemática
    with open(os.path.join(OUT_DIR, 'tiles_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\n[v] Tiling completado con éxito.")
    print(f"Metadatos guardados en: {OUT_DIR}/tiles_metadata.json")

if __name__ == "__main__":
    main()
