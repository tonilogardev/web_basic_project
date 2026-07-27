import os
import csv
import math
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

tif_path = 'download/training/2025-01-01_T31TDG/2025-01-01_T31TDG_SCL_GIMP.tif'
out_dir = 'download/training/2025-01-01_T31TDG/000_tiles_2025-01-01_T31TDG_SCL_GIMP_FULL'
csv_path = os.path.join(out_dir, '000_tiles_2025-01-01_T31TDG_SCL_GIMP_FULL.csv')

os.makedirs(out_dir, exist_ok=True)

with Image.open(tif_path) as img:
    n_frames = getattr(img, 'n_frames', 1)
    print(f"El TIFF tiene {n_frames} capas. Calculando grid...")
    
    w, h = img.size
    tile_size = 512
    cols = math.ceil(w / tile_size)
    rows = math.ceil(h / tile_size)
    
    crop_coords = []
    for r in range(rows):
        for c in range(cols):
            x = c * tile_size
            y = r * tile_size
            crop_coords.append((x, y))
            
    print(f"Se van a generar {len(crop_coords)} recortes (grid de {cols}x{rows}).")
    
    # Crear CSV preparado con los nombres de todos los recortes
    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['tile_name', 'has_errors_ai_evaluation'])
        for idx, (x, y) in enumerate(crop_coords):
            writer.writerow([f'tile_{idx:03d}_{x}_{y}.png', 'PENDING'])
    
    # Extraer recortes
    for idx, (x, y) in enumerate(crop_coords):
        box = (x, y, min(x + tile_size, w), min(y + tile_size, h))
        
        crops = []
        for i in range(n_frames):
            img.seek(i)
            crop = img.crop(box)
            if crop.mode != 'RGB':
                crop = crop.convert('RGB')
                
            # Manejo de bordes (rellenamos con negro si el tile es menor de 512x512)
            if crop.size != (tile_size, tile_size):
                canvas = Image.new('RGB', (tile_size, tile_size), (0,0,0))
                canvas.paste(crop, (0, 0))
                crop = canvas
            crops.append(crop)
        
        # Montar las 3 capas horizontalmente
        composite = Image.new('RGB', (tile_size * n_frames, tile_size))
        for i, crop in enumerate(crops):
            composite.paste(crop, (i * tile_size, 0))
            
        tile_name = f'tile_{idx:03d}_{x}_{y}.png'
        composite.save(os.path.join(out_dir, tile_name))
        
        if (idx + 1) % 10 == 0 or idx == 0:
            print(f"Progreso: Generado {tile_name} ({idx+1}/{len(crop_coords)})")

print("Proceso de corte completado con éxito. CSV preparado.")
