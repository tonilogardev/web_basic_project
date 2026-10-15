#!/usr/bin/env python3
"""
Script de regeneración de máscaras de nubes limpias a partir de los SCL_UNET.tif existentes.
Aísla exclusivamente Nube (2) y Sombra de nube (3), excluyendo el Mar Mediterráneo (0),
Suelo (1), Nieve (4), Agua (5) y áreas de descarte (0).
"""

import os
import json
import tempfile
import subprocess
from pathlib import Path
import numpy as np
import rasterio
import rasterio.features

def regenerate():
    base_path = Path(__file__).parent
    out_dir = base_path.parent / "visualizations" / "SCL_UNET_catalonia"
    pmtiles_bin = base_path / "pmtiles"
    
    if not pmtiles_bin.exists():
        raise FileNotFoundError(f"No se encontró el binario pmtiles en {pmtiles_bin}")
        
    scl_files = sorted(list(out_dir.glob("*_SCL_UNET.tif")))
    print(f"[*] Encontrados {len(scl_files)} gránulos SCL_UNET para regenerar...")
    
    for idx, scl_path in enumerate(scl_files, 1):
        id_granule = scl_path.name.replace("_SCL_UNET.tif", "")
        print(f"\n[{idx}/{len(scl_files)}] Procesando gránulo: {id_granule}")
        
        # 1. Leer el GeoTIFF con las 6 clases originales
        with rasterio.open(scl_path) as src:
            profile = src.profile.copy()
            predicted_mask = src.read(1)
            
        # 2. Generar máscara binaria limpia: 1 = Nube (2) y Sombra (3); 0 = Todo lo demás
        binary_mask = np.zeros_like(predicted_mask, dtype=np.uint8)
        binary_mask[np.isin(predicted_mask, [2, 3])] = 1
        
        cloud_count = int(np.sum(binary_mask == 1))
        total_pixels = binary_mask.size
        print(f"    - Píxeles de Nube/Sombra: {cloud_count:,} ({cloud_count / total_pixels * 100:.2f}%)")
        print(f"    - Píxeles de Superficie/Mar: {total_pixels - cloud_count:,} ({(total_pixels - cloud_count) / total_pixels * 100:.2f}%)")
        
        # Guardar el nuevo _SCL_UNET_mask_clouds.tif
        out_binary_path = out_dir / f"{id_granule}_SCL_UNET_mask_clouds.tif"
        profile.update(driver="GTiff", dtype=rasterio.uint8, count=1, compress="deflate")
        with rasterio.Env(GDAL_PAM_ENABLED="NO"):
            with rasterio.open(out_binary_path, "w", **profile) as dst:
                dst.write(binary_mask, 1)
        print(f"    [v] Actualizado: {out_binary_path.name}")
        
        # 3. Vectorizar a GeoJSON y convertir a PMTiles
        with tempfile.TemporaryDirectory() as temp_dir_str:
            temp_dir = Path(temp_dir_str)
            mask_4326 = temp_dir / f"{id_granule}_mask_4326.tif"
            geojson_path = temp_dir / f"{id_granule}_clouds.geojson"
            mbtiles_path = temp_dir / f"{id_granule}_mask_clouds.mbtiles"
            pmtiles_mask_path = out_dir / f"{id_granule}_mask_clouds.pmtiles"
            
            # Reproyectar a EPSG:4326 para Tippecanoe
            subprocess.run(
                ["gdalwarp", "-t_srs", "EPSG:4326", "-r", "near", str(out_binary_path), str(mask_4326)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            with rasterio.open(mask_4326) as src_4326:
                img = src_4326.read(1)
                transform = src_4326.transform
                
            # Extraer polígonos ÚNICAMENTE donde img == 1 (Nube o Sombra)
            mask_filter = (img == 1).astype(np.uint8)
            shapes = rasterio.features.shapes(mask_filter, mask=mask_filter, transform=transform)
            
            features = []
            for geom, val in shapes:
                if val == 1:
                    features.append({
                        "type": "Feature",
                        "geometry": geom,
                        "properties": {"is_cloud": 1}
                    })
                    
            print(f"    - Polígonos de nubes extraídos: {len(features):,}")
            
            # Salvaguarda para gránulos 100% despejados
            if not features:
                print("    [*] Gránulo sin nubes. Añadiendo geometría dummy...")
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [[[0.0, 0.0], [0.00001, 0.0], [0.00001, 0.00001], [0.0, 0.0]]]},
                    "properties": {"is_cloud": 0}
                })
                
            with open(geojson_path, "w") as f:
                json.dump({"type": "FeatureCollection", "features": features}, f)
                
            # Tippecanoe -> MBTiles
            subprocess.run(
                ["tippecanoe", "-zg", "--drop-densest-as-needed", "-l", "clouds", "-o", str(mbtiles_path), "--force", str(geojson_path)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # MBTiles -> PMTiles v3
            subprocess.run(
                [str(pmtiles_bin), "convert", str(mbtiles_path), str(pmtiles_mask_path)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            print(f"    [v] Generado PMTiles limpio: {pmtiles_mask_path.name} ({pmtiles_mask_path.stat().st_size / 1024:.1f} KB)")
            
    print("\n[+] Regenerando inventario JSON...")
    import generate_inventory
    generate_inventory.generate_inventory()
    print("[*] ¡Proceso completado exitosamente para todos los gránulos!")

if __name__ == "__main__":
    regenerate()
