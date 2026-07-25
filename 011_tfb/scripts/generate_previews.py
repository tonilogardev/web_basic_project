import rasterio
import matplotlib.pyplot as plt
import numpy as np

def generate_preview(input_path, output_path):
    print(f"Generando preview para {input_path}")
    try:
        with rasterio.open(input_path) as src:
            data = src.read()
            data = data.transpose(1, 2, 0)
            
            # Normalize to 0-1 for plotting if it's float, or if uint16
            if data.dtype == np.uint16:
                # Sentinel-2 L1C max reflectance is ~10000
                data = np.clip(data / 3000.0, 0, 1)
            elif data.dtype == np.float32 or data.dtype == np.float16:
                data = np.clip(data, 0, 1)
            
            # If it's the SCL map, it's uint8
            if data.dtype == np.uint8 and data.max() > 1:
                # Assume it's 0-255 RGB
                pass
                
            plt.figure(figsize=(12,12))
            plt.imshow(data)
            plt.axis('off')
            plt.savefig(output_path, bbox_inches='tight', pad_inches=0)
            plt.close()
            print(f"Guardado {output_path}")
    except Exception as e:
        print(f"Error en {input_path}: {e}")

base_dir = '/dades/antonio/tfb/download/training/2021-06-09_T31TCF/'
generate_preview(base_dir + '2021-06-09_T31TCF_SCL_GIMP.tif', 'preview_scl.png')
generate_preview(base_dir + '2021-06-09_T31TCF_ColorReal.tif', 'preview_real.png')
generate_preview(base_dir + '2021-06-09_T31TCF_FalsoColor_Nieve.tif', 'preview_falso.png')

