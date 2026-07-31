import os
import rasterio
import numpy as np
from pathlib import Path
from gimp_tools import encode_to_rgb, create_multilayer_gimp, encode_binary_to_rgb

def repack_granule(granule_dir, out_dir):
    id_granule = granule_dir.name
    print(f"\n[*] Re-empaquetando gránulo: {id_granule}")
    
    out_tif_dir = out_dir / "SCL_UNET"
    base_pred_path = out_tif_dir / f"{id_granule}_SCL_UNET.tif"
    
    if not base_pred_path.exists():
        print("    [-] Faltan archivos de inferencia base. Saltando.")
        return
        
    print("    [+] Generando versión RGB plana (SCL_UNET_COLOR)...")
    out_scl_color_path = out_tif_dir / f"{id_granule}_SCL_UNET_COLOR.tif"
    encode_to_rgb(base_pred_path, out_scl_color_path)

    print("    [+] Leyendo bandas ópticas y guardando RGB temporal...")
    b02_path = granule_dir / f"{id_granule}_B02.jp2"
    b03_path = granule_dir / f"{id_granule}_B03.jp2"
    b04_path = granule_dir / f"{id_granule}_B04.jp2"
    
    with rasterio.open(b02_path) as src:
        target_profile = src.profile.copy()
        b02 = src.read(1)
    with rasterio.open(b03_path) as src:
        b03 = src.read(1)
    with rasterio.open(b04_path) as src:
        b04 = src.read(1)

    rgb = np.stack([b04, b03, b02], axis=0)
    rgb = np.clip(rgb / 3000.0 * 255.0, 0, 255).astype(np.uint8)

    target_profile.update(
        driver="GTiff",
        dtype=rasterio.uint8,
        count=3,
        compress="deflate"
    )
    
    temp_rgb_path = out_tif_dir / f"{id_granule}_temp_rgb.tif"
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(temp_rgb_path, "w", **target_profile) as dst:
            dst.write(rgb)

    print("    [+] Generando máscaras lógicas puras (B/N y Nieve)...")
    with rasterio.open(base_pred_path) as src:
        pred_data = src.read(1)
        out_profile = src.profile.copy()
        out_profile.update(driver="GTiff", count=1, compress="deflate")

    # Máscara B/N: 2 (Nube), 3 (Sombra) -> 0. Resto -> 1
    mask_bw = np.ones_like(pred_data, dtype=np.uint8)
    mask_bw[np.isin(pred_data, [2, 3])] = 0
    
    temp_bw_path = out_tif_dir / f"{id_granule}_temp_bw.tif"
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(temp_bw_path, "w", **out_profile) as dst:
            dst.write(mask_bw, 1)

    # Máscara Nieve: 4 (Nieve) -> 1. Resto -> 0
    mask_snow = np.zeros_like(pred_data, dtype=np.uint8)
    mask_snow[pred_data == 4] = 1
    
    temp_snow_path = out_tif_dir / f"{id_granule}_temp_snow.tif"
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(temp_snow_path, "w", **out_profile) as dst:
            dst.write(mask_snow, 1)

    print("    [+] Coloreando máscaras para GIMP...")
    temp_bw_rgb_path = out_tif_dir / f"{id_granule}_temp_bw_rgb.tif"
    temp_snow_rgb_path = out_tif_dir / f"{id_granule}_temp_snow_rgb.tif"
    
    encode_binary_to_rgb(temp_bw_path, temp_bw_rgb_path, color_true=[255, 255, 255], color_false=[0, 0, 0])
    encode_binary_to_rgb(temp_snow_path, temp_snow_rgb_path, color_true=[0, 255, 255], color_false=[0, 0, 0])

    print("    [+] Empaquetando GIMP multicapa (4 capas)...")
    out_gimp_path = out_tif_dir / f"{id_granule}_SCL_UNET_GIMP.tif"
    
    layers = [temp_bw_rgb_path, temp_snow_rgb_path, out_scl_color_path]
    
    if create_multilayer_gimp(temp_rgb_path, layers, out_gimp_path):
        print(f"    [v] Exportado para GIMP multicapa: {out_gimp_path.name}")
        
    # Limpiar temporales pesados
    for p in [temp_rgb_path, temp_bw_path, temp_snow_path, temp_bw_rgb_path, temp_snow_rgb_path, out_scl_color_path]:
        if p.exists(): p.unlink()


if __name__ == "__main__":
    base_path = Path(__file__).parent
    test_dir = base_path.parent / "download" / "test"
    out_dir = Path("/dades/antonio/tfb/visualizations")
    
    if test_dir.exists():
        granules = [d for d in test_dir.iterdir() if d.is_dir()]
        for g in granules:
            repack_granule(g, out_dir)
    else:
        print("El directorio de test está vacío.")
