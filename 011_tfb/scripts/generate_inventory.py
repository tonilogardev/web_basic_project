import os
import json
from pathlib import Path
from collections import defaultdict

def generate_inventory(target_dir=None):
    if target_dir is not None:
        base_dir = Path(target_dir)
    else:
        out_dir_env = os.getenv("OUTPUT_DIR", "/dades/antonio/tfb/inference_model")
        base_dir = Path(out_dir_env)
        if not base_dir.exists():
            base_dir = Path(__file__).parent.parent / "visualizations" / "SCL_UNET_catalonia"
    
    inventory = defaultdict(list)
    
    # Buscar todos los ColorReal.pmtiles
    pmtiles_files = list(base_dir.glob("*_ColorReal.pmtiles"))
    
    for f in pmtiles_files:
        # El formato es YYYY-MM-DD_TXXXXX_ColorReal.pmtiles
        parts = f.name.split("_")
        if len(parts) >= 3:
            date_str = parts[0]
            tile_str = parts[1]
            
            # Verificar si existe la máscara correspondiente
            mask_file = base_dir / f"{date_str}_{tile_str}_mask_clouds.pmtiles"
            if mask_file.exists():
                if tile_str not in inventory[date_str]:
                    inventory[date_str].append(tile_str)
                    
    # Ordenar fechas de más reciente a más antigua
    sorted_inventory = {k: sorted(v) for k, v in sorted(inventory.items(), reverse=True)}
    
    # Escribir a inventory.json
    out_file = base_dir / "inventory.json"
    with open(out_file, "w") as f:
        json.dump(sorted_inventory, f, indent=2)
        
    print(f"[v] Inventario generado en {out_file} con {len(sorted_inventory)} fechas.")
    return sorted_inventory

if __name__ == "__main__":
    generate_inventory()

