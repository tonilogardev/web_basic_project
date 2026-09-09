import rasterio
import rasterio.features
import json
import numpy as np

tif_path = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/visualizations/SCL_UNET_catalonia/2025-01-01_T31TCF_SCL_UNET_mask_clouds.tif"

with rasterio.open(tif_path) as src:
    img = src.read(1)
    transform = src.transform
    crs = src.crs
    
print("CRS:", crs)
mask = (img == 0).astype(np.uint8)
shapes = rasterio.features.shapes(mask, mask=mask, transform=transform)

features = []
for geom, val in shapes:
    features.append({
        "type": "Feature",
        "geometry": geom,
        "properties": {}
    })
    break

print("Extracted", len(features), "features.")
