import rasterio
import matplotlib.pyplot as plt
import numpy as np

input_path = '/dades/antonio/tfb/download/training/2021-06-09_T31TCF/2021-06-09_T31TCF_SCL_GIMP_AUDITED.tif'
output_path = 'preview_scl_audited.png'

try:
    with rasterio.open(input_path) as src:
        data = src.read()
        data = data.transpose(1, 2, 0)
        plt.figure(figsize=(12,12))
        plt.imshow(data)
        plt.axis('off')
        plt.savefig(output_path, bbox_inches='tight', pad_inches=0)
        plt.close()
        print(f"Guardado {output_path}")
except Exception as e:
    print(f"Error en {input_path}: {e}")

