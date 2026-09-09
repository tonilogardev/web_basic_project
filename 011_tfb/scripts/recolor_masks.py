import os
import subprocess
from pathlib import Path
import shutil

def create_pmtiles(tif_path, pmtiles_path, resampling="average"):
    print(f"    [>] Convirtiendo a PMTiles: {pmtiles_path.name}")
    tif_3857 = str(tif_path).replace('.tif', '_3857.tif')
    mbtiles_path = str(tif_path).replace('.tif', '.mbtiles')
    
    try:
        subprocess.run(["gdalwarp", "-t_srs", "EPSG:3857", str(tif_path), tif_3857], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(["gdal_translate", "-of", "MBTILES", tif_3857, mbtiles_path], check=True, stdout=subprocess.DEVNULL)
        subprocess.run(["gdaladdo", "-r", resampling, mbtiles_path, "2", "4", "8", "16", "32"], check=True, stdout=subprocess.DEVNULL)
        
        pmtiles_bin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pmtiles")
        subprocess.run([pmtiles_bin, "convert", mbtiles_path, str(pmtiles_path)], check=True, stdout=subprocess.DEVNULL)
        print(f"    [v] Creado PMTiles: {pmtiles_path.name}")
    except Exception as e:
        print(f"    [!] Error al generar PMTiles: {e}")
    finally:
        if os.path.exists(tif_3857): os.remove(tif_3857)
        if os.path.exists(mbtiles_path): os.remove(mbtiles_path)

def main():
    base_path = Path(__file__).parent
    out_dir = base_path.parent / "visualizations" / "SCL_UNET_catalonia"
    public_dir = base_path.parent / "viewer" / "public"
    
    color_txt = out_dir / "cloud_color.txt"
    with open(color_txt, "w") as f:
        f.write("0 255 0 0 255\n")
        f.write("1 0 0 0 0\n")
        
    mask_files = list(out_dir.glob("*_SCL_UNET_mask_clouds.tif"))
    print(f"[*] Encontradas {len(mask_files)} máscaras para recolorear a Rojo Puro...")
    
    for mask_tif in mask_files:
        id_granule = mask_tif.name.replace("_SCL_UNET_mask_clouds.tif", "")
        print(f"Procesando {id_granule}...")
        
        rgba_tif = out_dir / f"{id_granule}_RGBA_mask.tif"
        out_pmtiles = out_dir / f"{id_granule}_mask_clouds.pmtiles"
        public_pmtiles = public_dir / f"{id_granule}_mask_clouds.pmtiles"
        
        try:
            subprocess.run(["gdaldem", "color-relief", str(mask_tif), str(color_txt), str(rgba_tif), "-alpha"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            create_pmtiles(rgba_tif, out_pmtiles, resampling="nearest")
            
            # Copiar a public para que el visor lo use inmediatamente
            shutil.copy2(out_pmtiles, public_pmtiles)
            print(f"    [v] Copiado a public: {public_pmtiles.name}")
        except Exception as e:
            print(f"    [!] Error coloreando máscara: {e}")
        finally:
            if rgba_tif.exists(): os.remove(rgba_tif)
            
    print("[*] Proceso completado.")

if __name__ == "__main__":
    main()
