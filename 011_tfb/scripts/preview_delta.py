import rasterio
import matplotlib.pyplot as plt
import numpy as np

path = '/dades/antonio/tfb/download/training/2021-06-09_T31TCF/2021-06-09_T31TCF_SCL_GIMP.tif'
try:
    with rasterio.open(path) as src:
        data = src.read()
        data = data.transpose(1, 2, 0)
        plt.figure(figsize=(10,10))
        plt.imshow(data)
        plt.savefig('preview_gimp.png')
        print("Saved preview_gimp.png", data.shape)
except Exception as e:
    print("Error:", e)
