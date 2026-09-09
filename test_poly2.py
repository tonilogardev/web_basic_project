import subprocess
import rasterio
import rasterio.features
import json
import numpy as np

tif_path = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/visualizations/SCL_UNET_catalonia/2025-01-01_T31TCF_SCL_UNET_mask_clouds.tif"
tif_4326 = "/tmp/4326.tif"
geojson_path = "/tmp/clouds.geojson"
pmtiles_path = "/tmp/clouds.pmtiles"

print("Reprojecting...")
subprocess.run(["gdalwarp", "-t_srs", "EPSG:4326", "-r", "near", tif_path, tif_4326], check=True)

print("Polygonizing...")
with rasterio.open(tif_4326) as src:
    img = src.read(1)
    transform = src.transform
    
mask = (img == 0).astype(np.uint8)
shapes = rasterio.features.shapes(mask, mask=mask, transform=transform)

features = []
for geom, val in shapes:
    features.append({
        "type": "Feature",
        "geometry": geom,
        "properties": {}
    })

geojson_data = {
    "type": "FeatureCollection",
    "features": features
}

with open(geojson_path, "w") as f:
    json.dump(geojson_data, f)

print(f"Saved {len(features)} polygons to geojson")

print("Running tippecanoe...")
subprocess.run(["tippecanoe", "-zg", "--drop-densest-as-needed", "-l", "clouds", "-o", pmtiles_path, "--force", geojson_path], check=True)
print("Done!")
