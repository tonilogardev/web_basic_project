import os
import json
import rasterio

BASE_DIR = 'download/training/2025-01-01_T31TDG'
IN_DIR = os.path.join(BASE_DIR, '001_grid_tiles')
META_PATH = os.path.join(IN_DIR, 'tiles_metadata.json')
AUDIT_PATH = os.path.join(IN_DIR, 'audit_results.json')
# NOTA: Trabajamos sobre el archivo maestro original que contiene la máscara
TIF_SCL = os.path.join(BASE_DIR, '2025-01-01_T31TDG_SCL_GIMP.tif')

GRID_CELL_SIZE = 64

def cell_to_local_window(cell_str):
    """
    Traduce una celda visual (ej. 'C4') a coordenadas locales (X, Y)
    dentro de la baldosa de 512x512 píxeles.
    """
    cols = "ABCDEFGH"
    if not cell_str or len(cell_str) < 2:
        return None
    
    col_char = cell_str[0].upper()
    c = cols.find(col_char)
    try:
        r = int(cell_str[1:]) - 1
    except ValueError:
        return None
        
    if c == -1 or r < 0 or r > 7:
        return None
        
    x_min = c * GRID_CELL_SIZE
    y_min = r * GRID_CELL_SIZE
    return x_min, y_min

def main():
    if not os.path.exists(AUDIT_PATH):
        print(f"Error: Falta el archivo de auditoría {AUDIT_PATH}")
        return
        
    with open(META_PATH, 'r') as f:
        metadata = json.load(f)
        
    with open(AUDIT_PATH, 'r') as f:
        audit = json.load(f)
        
    print(f"Abriendo el GeoTIFF maestro en modo Inyección (r+): {TIF_SCL}")
    
    edits = 0
    # Abrimos en modo 'r+' que permite lectura y escritura directa en la matriz
    with rasterio.open(TIF_SCL, 'r+') as src:
        # Cargamos toda la máscara en RAM (como es 1 capa y valores uint8, no pesa mucho)
        scl_data = src.read(1)
        
        for tile_name, corrections in audit.items():
            # Si Gemini devolvió lista vacía o error, saltamos
            if not isinstance(corrections, list) or not corrections:
                continue
                
            meta = metadata.get(tile_name)
            if not meta:
                continue
                
            # Recuperamos las coordenadas matemáticas del mundo real de esta baldosa
            base_x = meta['window_x']
            base_y = meta['window_y']
            
            for correction in corrections:
                cell = correction.get('celda')
                new_class = correction.get('nueva_clase')
                
                if not cell or new_class is None:
                    continue
                    
                coords = cell_to_local_window(cell)
                if not coords:
                    continue
                    
                local_x, local_y = coords
                
                # Transformación Afín: Celdas de imagen -> Píxeles globales del GeoTIFF
                global_x = base_x + local_x
                global_y = base_y + local_y
                
                # Calculamos el tamaño del bloque (normalmente 64x64) cuidando los bordes
                y_end = min(global_y + GRID_CELL_SIZE, src.height)
                x_end = min(global_x + GRID_CELL_SIZE, src.width)
                
                # ¡Edición Quirúrgica de la Matriz!
                scl_data[global_y:y_end, global_x:x_end] = new_class
                edits += 1
                
                print(f" [Bisturí] Modificada Celda {cell} en {tile_name} -> Nueva Clase: {new_class}")
                print(f"           Rango Píxeles GeoTIFF: X[{global_x}:{x_end}] Y[{global_y}:{y_end}]")
                
        if edits > 0:
            print("\nGuardando cambios en el disco duro...")
            src.write(scl_data, 1)
            print(f"[v] Éxito total. Se han inyectado {edits} polígonos correctivos dictados por la IA.")
        else:
            print("\n[i] La auditoría de la IA no detectó errores en este lote. No hay nada que editar.")

if __name__ == "__main__":
    main()
