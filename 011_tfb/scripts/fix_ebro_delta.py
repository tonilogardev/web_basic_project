import rasterio
import numpy as np
import shutil

input_path = '/dades/antonio/tfb/download/training/2021-06-09_T31TCF/2021-06-09_T31TCF_SCL_GIMP.tif'
output_path = '/dades/antonio/tfb/download/training/2021-06-09_T31TCF/2021-06-09_T31TCF_SCL_GIMP_EDITADO.tif'

# Create a backup just in case
shutil.copy(input_path, output_path)

with rasterio.open(output_path, 'r+') as src:
    data = src.read()
    
    # data is shape (3, H, W)
    # The Ebro Delta is roughly y: 1450-1700, x: 0-400
    y_start, y_end = 1450, 1750
    x_start, x_end = 0, 450
    
    region = data[:, y_start:y_end, x_start:x_end]
    
    # We want to find pixels that are [0,0,0] (Basura) or [100,100,100] (Sombra)
    # and turn them into [34,139,34] (Suelo)
    
    # Mask for [0,0,0]
    mask_black = (region[0] == 0) & (region[1] == 0) & (region[2] == 0)
    
    # Mask for [100,100,100]
    mask_gray = (region[0] == 100) & (region[1] == 100) & (region[2] == 100)
    
    # Combine masks
    anomalies = mask_black | mask_gray
    
    # Apply new color [34,139,34]
    region[0][anomalies] = 34
    region[1][anomalies] = 139
    region[2][anomalies] = 34
    
    # Write back
    data[:, y_start:y_end, x_start:x_end] = region
    src.write(data)
    print(f"Fixed {np.sum(anomalies)} anomalous pixels in the Ebro Delta.")

