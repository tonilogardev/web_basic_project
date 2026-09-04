import os
import subprocess
from pathlib import Path

# Re-use the existing create_pmtiles function
from importlib.machinery import SourceFileLoader
pmtiles_module = SourceFileLoader("pmtiles_mod", "009_cloud_model_catalonia_pmtiles.py").load_module()
create_pmtiles = pmtiles_module.create_pmtiles

def fix_masks():
    base_dir = Path("../visualizations/SCL_UNET_catalonia")
    
    # Create the color palette for gdaldem
    # 0 = No data (Sky) -> Transparent
    # 1 = Cloud -> White, 70% opacity (180)
    color_txt = base_dir / "cloud_color.txt"
    with open(color_txt, "w") as f:
        f.write("0 0 0 0 0\n")
        f.write("1 255 255 255 200\n")
        
    mask_tifs = list(base_dir.glob("*_SCL_UNET_mask_clouds.tif"))
    print(f"Encontradas {len(mask_tifs)} máscaras para procesar...")
    
    for tif in mask_tifs:
        rgba_tif = str(tif).replace("_SCL_UNET_mask_clouds.tif", "_RGBA_mask.tif")
        out_pmtiles = base_dir / str(tif.name).replace("_SCL_UNET_mask_clouds.tif", "_mask_clouds.pmtiles")
        
        # 1. Colorize
        try:
            subprocess.run([
                "gdaldem", "color-relief", str(tif), str(color_txt), rgba_tif, "-alpha"
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # 2. Convert to PMTiles using average (so borders blend nicely)
            create_pmtiles(Path(rgba_tif), out_pmtiles, resampling="average")
            
            # 3. Cleanup RGBA tif to save space
            if os.path.exists(rgba_tif):
                os.remove(rgba_tif)
                
        except Exception as e:
            print(f"Error procesando {tif.name}: {e}")
            
    print("Terminado.")
    
if __name__ == "__main__":
    fix_masks()
