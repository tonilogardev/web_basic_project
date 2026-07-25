import rasterio
import numpy as np

path_scl = '/dades/antonio/tfb/download/training/2021-06-09_T31TCF/2021-06-09_T31TCF_SCL_GIMP.tif'
path_real = '/dades/antonio/tfb/download/training/2021-06-09_T31TCF/2021-06-09_T31TCF_ColorReal.tif'
path_falso = '/dades/antonio/tfb/download/training/2021-06-09_T31TCF/2021-06-09_T31TCF_FalsoColor_Nieve.tif'

try:
    with rasterio.open(path_scl) as src:
        scl = src.read()
    with rasterio.open(path_real) as src:
        real = src.read()
    with rasterio.open(path_falso) as src:
        falso = src.read()
        
    print(f"SCL shape: {scl.shape}, dtype: {scl.dtype}, min: {scl.min()}, max: {scl.max()}")
    print(f"Real shape: {real.shape}, dtype: {real.dtype}, min: {real.min()}, max: {real.max()}")
    print(f"Falso shape: {falso.shape}, dtype: {falso.dtype}, min: {falso.min()}, max: {falso.max()}")
except Exception as e:
    print("Error:", e)
