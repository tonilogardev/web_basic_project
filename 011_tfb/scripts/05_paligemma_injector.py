import os
import json
import rasterio

import shutil

BASE_DIR = 'download/training/2025-01-01_T31TDG'
IN_DIR = os.path.join(BASE_DIR, '002_paligemma_tiles')
META_PATH = os.path.join(IN_DIR, 'tiles_metadata.json')
AUDIT_PATH = os.path.join(IN_DIR, 'audit_results_paligemma.json')

# Implementando Opción 2: Proteger el archivo maestro
TIF_ORIGINAL = os.path.join(BASE_DIR, '2025-01-01_T31TDG_SCL.tif')
TIF_SCL = os.path.join(BASE_DIR, '2025-01-01_T31TDG_SCL_paligemma.tif')

def main():
    # Crear una copia de seguridad antes de editar
    if os.path.exists(TIF_ORIGINAL) and not os.path.exists(TIF_SCL):
        print(f"Creando copia de seguridad: {TIF_SCL}")
        shutil.copy2(TIF_ORIGINAL, TIF_SCL)
    elif not os.path.exists(TIF_ORIGINAL):
        print(f"Error: No se encuentra el original {TIF_ORIGINAL}")
        return

    if not os.path.exists(AUDIT_PATH):
        print(f"Error: Falta el archivo de auditoría {AUDIT_PATH}")
        return
        
    with open(META_PATH, 'r') as f:
        metadata = json.load(f)
        
    with open(AUDIT_PATH, 'r') as f:
        audit = json.load(f)
        
    print(f"Abriendo el GeoTIFF maestro en modo Inyección (r+): {TIF_SCL}")
    
    edits = 0
    with rasterio.open(TIF_SCL, 'r+') as src:
        # Cargamos toda la máscara en RAM (como es 1 capa y valores uint8, no pesa mucho)
        scl_data = src.read(1)
        
        for tile_name, data in audit.items():
            corrections = data.get('errores', [])
            
            if not corrections:
                continue
                
            meta = metadata.get(tile_name)
            if not meta:
                continue
                
            # Recuperamos las coordenadas matemáticas del mundo real de esta baldosa
            base_x = meta['window_x']
            base_y = meta['window_y']
            
            for correction in corrections:
                ymin = correction.get('ymin')
                xmin = correction.get('xmin')
                ymax = correction.get('ymax')
                xmax = correction.get('xmax')
                new_class = correction.get('new_class')
                
                if new_class is None or ymin is None:
                    continue
                    
                # Transformación Afín Directa: Píxeles locales (0-512) -> Píxeles globales del GeoTIFF
                global_ymin = base_y + ymin
                global_xmin = base_x + xmin
                global_ymax = base_y + ymax
                global_xmax = base_x + xmax
                
                # Prevenir desbordamientos
                global_ymax = min(global_ymax, src.height)
                global_xmax = min(global_xmax, src.width)
                
                # ¡Edición Quirúrgica de la Matriz basada en Bounding Box!
                scl_data[global_ymin:global_ymax, global_xmin:global_xmax] = new_class
                edits += 1
                
                print(f" [Bisturí PaliGemma] Inyectando Caja {ymax-ymin}x{xmax-xmin} en {tile_name} -> Clase {new_class}")
                print(f"           Rango Global: X[{global_xmin}:{global_xmax}] Y[{global_ymin}:{global_ymax}]")
                
        if edits > 0:
            print("\nGuardando cambios en el disco duro...")
            src.write(scl_data, 1)
            print(f"[v] Éxito total. Se han inyectado {edits} polígonos correctivos (Bounding Boxes) dictados por PaliGemma.")
        else:
            print("\n[i] PaliGemma no detectó errores en este lote. No hay nada que editar.")

if __name__ == "__main__":
    main()
