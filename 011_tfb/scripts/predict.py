import os
import torch
import numpy as np
import rasterio
from rasterio.enums import Resampling
import matplotlib.pyplot as plt
from pathlib import Path
from model import UNet
from create_dataset import load_and_resample, get_sea_mask
from gimp_tools import encode_to_rgb

# Definición de Colores (RGB) para cada clase (Leyenda del Documento 008)
COLOR_MAP = {
    0: [0, 0, 0],         # Basura / Mar -> Negro
    1: [34, 139, 34],     # Suelo -> Verde Bosque
    2: [255, 255, 255],   # Nube -> Blanco puro
    3: [100, 100, 100],   # Sombra Nube -> Gris
    4: [0, 255, 255]      # Nieve -> Cyan Brillante
}

def colorize_mask(mask_2d):
    """Convierte una matriz 2D de clases (0-4) en una imagen RGB 3D."""
    h, w = mask_2d.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    for class_idx, color in COLOR_MAP.items():
        rgb[mask_2d == class_idx] = color
    return rgb

def build_scl_mask(scl_raw):
    """
    Colapsa las 12 clases SCL originales a nuestras 5 Clases Maestras 
    y aplica el color correspondiente.
    """
    scl_5class = np.zeros_like(scl_raw, dtype=np.uint8)
    scl_5class[np.isin(scl_raw, [4, 5])] = 1      # Suelo
    scl_5class[np.isin(scl_raw, [8, 9, 10])] = 2  # Nube
    scl_5class[scl_raw == 3] = 3                  # Sombra
    scl_5class[scl_raw == 11] = 4                 # Nieve
    # El resto (0, 1, 2, 6, 7) ya es 0 (Basura) al inicializar con ceros.
    return scl_5class

def predict_granule(granule_dir, model_path, output_path):
    print(f"\n[*] Iniciando Inferencia sobre: {granule_dir.name}")
    
    # 1. Cargar el Modelo
    device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")
    model = UNet(in_channels=7, out_classes=5).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    print("    [+] Modelo Baseline cargado correctamente.")

    # 2. Encontrar los archivos
    id_granule = granule_dir.name
    paths = {b: granule_dir / f"{id_granule}_{b}.jp2" for b in ['B02', 'B03', 'B04', 'B08', 'B11', 'B12']}
    paths['SCL'] = granule_dir / f"{id_granule}_SCL.tif"
    
    if not all(p.exists() for p in paths.values()):
        print("    [-] Faltan archivos en el directorio.")
        return

    # 3. Leer Bandas
    with rasterio.open(paths['B02']) as src:
        target_shape = (src.height, src.width)
        target_profile = src.profile
        b02 = src.read(1)
        
    with rasterio.open(paths['B03']) as src: b03 = src.read(1)
    with rasterio.open(paths['B04']) as src: b04 = src.read(1)
    with rasterio.open(paths['B08']) as src: b08 = src.read(1)
    
    print("    [+] Remuestreando B11, B12 y SCL...")
    b11 = load_and_resample(paths['B11'], target_shape, is_categorical=False)
    b12 = load_and_resample(paths['B12'], target_shape, is_categorical=False)
    scl_raw = load_and_resample(paths['SCL'], target_shape, is_categorical=True)

    # 4. Feature Engineering
    b03_float = b03.astype(np.float32)
    b11_float = b11.astype(np.float32)
    ndsi = (b03_float - b11_float) / (b03_float + b11_float + 1e-8)
    
    # Tensor X
    X = np.stack([b02, b03, b04, b08, b11, b12, ndsi], axis=0).astype(np.float32)

    # 5. Inferencia por Parches (Patching Dinámico)
    print("    [+] Procesando inferencia (cortando y cosiendo parches de 512x512)...")
    patch_size = 512
    h, w = target_shape
    
    # Creamos un lienzo vacío para ir pegando nuestras predicciones
    predicted_mask = np.zeros((h, w), dtype=np.uint8)
    
    with torch.no_grad():
        for row in range(0, h - patch_size + 1, patch_size):
            for col in range(0, w - patch_size + 1, patch_size):
                
                # Cortar parche
                x_patch = X[:, row:row+patch_size, col:col+patch_size]
                
                # Transformar a Tensor PyTorch (1, 7, 512, 512)
                x_tensor = torch.from_numpy(x_patch).unsqueeze(0).to(device)
                
                # Inferencia
                logits = model(x_tensor)
                
                # Obtener la clase ganadora (argmax)
                preds = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy()
                
                # Pegar el parche predicho en el lienzo grande
                predicted_mask[row:row+patch_size, col:col+patch_size] = preds

    print("    [+] Aplicando Máscara de Mar (Post-procesamiento)...")
    sea_mask_path = base_path.parent / "scripts" / "data" / "MASCARA_CATALUNYA.tif"
    if sea_mask_path.exists():
        sea_mask = get_sea_mask(sea_mask_path, target_shape, target_profile)
        # Forzar a 0 (Basura/Descarte) todo el mar profundo
        predicted_mask[sea_mask == 0] = 0
        scl_raw[sea_mask == 0] = 0

    print("    [+] Guardando predicción SCL (GeoTIFF)...")
    out_tif_dir = base_path.parent / "visualizations" / "SCL_UNET"
    out_tif_dir.mkdir(exist_ok=True)
    out_tif_path = out_tif_dir / f"{id_granule}_SCL_UNET.tif"
    
    out_profile = target_profile.copy()
    out_profile.update(
        driver='GTiff',
        dtype=rasterio.uint8,
        count=1,
        compress='deflate'
    )
    with rasterio.Env(GDAL_PAM_ENABLED='NO'):
        with rasterio.open(out_tif_path, 'w', **out_profile) as dst:
            dst.write(predicted_mask, 1)
            
    print("    [+] Generando versión RGB para editar en GIMP...")
    out_gimp_path = out_tif_dir / f"{id_granule}_SCL_UNET_GIMP.tif"
    if encode_to_rgb(out_tif_path, out_gimp_path):
        print(f"    [v] Exportado para GIMP: {out_gimp_path.name}")

    print("    [+] Generando máscara binaria (Nube vs No-Nube)...")
    # 1: Válido (Suelo=1, Nieve=4)
    # 0: Inválido (Basura=0, Nube=2, Sombra=3)
    binary_mask = np.zeros_like(predicted_mask, dtype=np.uint8)
    binary_mask[np.isin(predicted_mask, [1, 4])] = 1
    
    out_binary_path = out_tif_dir / f"{id_granule}_SCL_UNET_mask_clouds.tif"
    with rasterio.Env(GDAL_PAM_ENABLED='NO'):
        with rasterio.open(out_binary_path, 'w', **out_profile) as dst:
            dst.write(binary_mask, 1)

    print("    [+] Generando panel visual comparativo...")
    
    # Para la visualización, la imagen de 10980x10980 es muy pesada. 
    # Haremos un Downsample agresivo (10%) para el PNG
    scale_factor = 10
    
    rgb = np.stack([b04, b03, b02], axis=-1)
    
    # Normalizar RGB para visualización bonita
    rgb = np.clip(rgb / 3000.0 * 255.0, 0, 255).astype(np.uint8)
    
    # Reducir resoluciones
    rgb_small = rgb[::scale_factor, ::scale_factor]
    scl_small = scl_raw[::scale_factor, ::scale_factor]
    pred_small = predicted_mask[::scale_factor, ::scale_factor]
    
    # Colorear
    scl_colored = colorize_mask(build_scl_mask(scl_small))
    pred_colored = colorize_mask(pred_small)
    
    # Pintar panel triple
    fig, axes = plt.subplots(1, 3, figsize=(24, 8))
    
    axes[0].imshow(rgb_small)
    axes[0].set_title("1. RGB (Color Real)")
    axes[0].axis("off")
    
    axes[1].imshow(scl_colored)
    axes[1].set_title("2. Ground Truth Original (Sen2Cor SCL)")
    axes[1].axis("off")
    
    axes[2].imshow(pred_colored)
    axes[2].set_title("3. Predicción IA (U-Net Baseline)")
    axes[2].axis("off")
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"    [v] Imagen comparativa guardada en: {output_path}")

if __name__ == "__main__":
    base_path = Path(__file__).parent
    test_dir = base_path.parent / "download" / "test"
    model_path = base_path.parent / "checkpoints" / "baseline_model.pth"
    out_dir = base_path.parent / "visualizations"
    out_dir.mkdir(exist_ok=True)
    
    # Buscar gránulos descargados
    if test_dir.exists():
        granules = [d for d in test_dir.iterdir() if d.is_dir()]
        for g in granules:
            out_file = out_dir / f"comparison_{g.name}.png"
            predict_granule(g, model_path, out_file)
    else:
        print("El directorio de test está vacío.")
