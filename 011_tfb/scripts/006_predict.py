"""
Script de inferencia de alto rendimiento.

Despliega el modelo espacial entrenado sobre el conjunto de Test. Genera tanto
las máscaras de segmentación matemática puras (`_SCL_UNET.tif`) como versiones
coloreadas ergonómicas (`_SCL_UNET_GIMP.tif`) para facilitar la auditoría
visual y edición por el operador humano.
"""

import os
import torch
import numpy as np
import rasterio
from rasterio.enums import Resampling
import matplotlib.pyplot as plt
from pathlib import Path
from model import UNet
import importlib
create_dataset = importlib.import_module("004_create_dataset")
load_and_resample = create_dataset.load_and_resample
get_sea_mask = create_dataset.get_sea_mask
from gimp_tools import encode_to_rgb, create_multilayer_gimp, encode_binary_to_rgb

# Definición de Colores (RGB) para cada clase (Leyenda del Documento 008)
COLOR_MAP = {
    0: [0, 0, 0],  # Basura / Mar -> Negro
    1: [34, 139, 34],  # Suelo -> Verde Bosque
    2: [255, 255, 255],  # Nube -> Blanco puro
    3: [100, 100, 100],  # Sombra Nube -> Gris
    4: [0, 255, 255],  # Nieve -> Cyan Brillante
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
    scl_5class[np.isin(scl_raw, [4, 5])] = 1  # Suelo
    scl_5class[np.isin(scl_raw, [8, 9, 10])] = 2  # Nube
    scl_5class[scl_raw == 3] = 3  # Sombra
    scl_5class[scl_raw == 11] = 4  # Nieve
    scl_5class[scl_raw == 6] = 5  # Masas de Agua
    # El resto (0, 1, 2, 7) ya es 0 (Basura) al inicializar con ceros.
    return scl_5class


def predict_granule(granule_dir, model_path, output_path, out_dir):
    print(f"\n[*] Iniciando Inferencia sobre: {granule_dir.name}")

    # 1. Cargar el Modelo
    device = torch.device("cuda:1" if torch.cuda.is_available() else "cpu")
    model = UNet(in_channels=7, out_classes=6).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    print("    [+] Modelo Baseline cargado correctamente.")

    # 2. Encontrar los archivos
    id_granule = granule_dir.name
    paths = {
        b: granule_dir / f"{id_granule}_{b}.jp2"
        for b in ["B02", "B03", "B04", "B08", "B11", "B12"]
    }
    paths["SCL"] = granule_dir / f"{id_granule}_SCL.tif"

    if not all(p.exists() for p in paths.values()):
        print("    [-] Faltan archivos en el directorio.")
        return

    # 3. Leer Bandas
    with rasterio.open(paths["B02"]) as src:
        target_shape = (src.height, src.width)
        target_profile = src.profile
        b02 = src.read(1)

    with rasterio.open(paths["B03"]) as src:
        b03 = src.read(1)
    with rasterio.open(paths["B04"]) as src:
        b04 = src.read(1)
    with rasterio.open(paths["B08"]) as src:
        b08 = src.read(1)

    print("    [+] Remuestreando B11, B12 y SCL...")
    b11 = load_and_resample(paths["B11"], target_shape, is_categorical=False)
    b12 = load_and_resample(paths["B12"], target_shape, is_categorical=False)
    scl_raw = load_and_resample(paths["SCL"], target_shape, is_categorical=True)

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
                x_patch = X[:, row : row + patch_size, col : col + patch_size]

                # Transformar a Tensor PyTorch (1, 7, 512, 512)
                x_tensor = torch.from_numpy(x_patch).unsqueeze(0).to(device)

                # Inferencia
                logits = model(x_tensor)

                # Obtener la clase ganadora (argmax)
                preds = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy()

                # Pegar el parche predicho en el lienzo grande
                predicted_mask[row : row + patch_size, col : col + patch_size] = preds

    print("    [+] Aplicando Máscara de Mar (Post-procesamiento)...")
    sea_mask_path = Path(__file__).parent / "data" / "MASCARA_CATALUNYA.tif"
    if sea_mask_path.exists():
        sea_mask = get_sea_mask(sea_mask_path, target_shape, target_profile)
        # Forzar a 0 (Basura/Descarte) todo el mar profundo
        predicted_mask[sea_mask == 0] = 0
        scl_raw[sea_mask == 0] = 0

    print("    [+] Guardando predicción SCL (GeoTIFF)...")
    out_tif_dir = out_dir / "SCL_UNET"
    out_tif_dir.mkdir(parents=True, exist_ok=True)
    out_tif_path = out_tif_dir / f"{id_granule}_SCL_UNET.tif"

    out_profile = target_profile.copy()
    out_profile.update(
        driver="GTiff", dtype=rasterio.uint8, count=1, compress="deflate"
    )
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(out_tif_path, "w", **out_profile) as dst:
            dst.write(predicted_mask, 1)

    print("    [+] Generando versión RGB plana...")
    out_scl_color_path = out_tif_dir / f"{id_granule}_SCL_UNET_COLOR.tif"
    encode_to_rgb(out_tif_path, out_scl_color_path)

    print("    [+] Generando máscaras lógicas puras (B/N y Nieve)...")
    # Máscara B/N: 2 (Nube), 3 (Sombra) -> 0. Resto -> 1
    mask_bw = np.ones_like(predicted_mask, dtype=np.uint8)
    mask_bw[np.isin(predicted_mask, [2, 3])] = 0
    
    temp_bw_path = out_tif_dir / f"{id_granule}_temp_bw.tif"
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(temp_bw_path, "w", **out_profile) as dst:
            dst.write(mask_bw, 1)

    # Máscara Nieve: 4 (Nieve) -> 1. Resto -> 0
    mask_snow = np.zeros_like(predicted_mask, dtype=np.uint8)
    mask_snow[predicted_mask == 4] = 1
    
    temp_snow_path = out_tif_dir / f"{id_granule}_temp_snow.tif"
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(temp_snow_path, "w", **out_profile) as dst:
            dst.write(mask_snow, 1)

    print("    [+] Guardando RGB Real (temporal)...")
    out_rgb_profile = out_profile.copy()
    out_rgb_profile.update(count=3)
    temp_rgb_path = out_tif_dir / f"{id_granule}_temp_rgb.tif"
    
    # rgb real
    rgb = np.stack([b04, b03, b02], axis=0)
    rgb = np.clip(rgb / 3000.0 * 255.0, 0, 255).astype(np.uint8)
    
    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(temp_rgb_path, "w", **out_rgb_profile) as dst:
            dst.write(rgb)

    print("    [+] Coloreando máscaras para GIMP...")
    temp_bw_rgb_path = out_tif_dir / f"{id_granule}_temp_bw_rgb.tif"
    temp_snow_rgb_path = out_tif_dir / f"{id_granule}_temp_snow_rgb.tif"
    
    encode_binary_to_rgb(temp_bw_path, temp_bw_rgb_path, color_true=[255, 255, 255], color_false=[0, 0, 0])
    encode_binary_to_rgb(temp_snow_path, temp_snow_rgb_path, color_true=[0, 255, 255], color_false=[0, 0, 0])

    print("    [+] Empaquetando multicapa GIMP (4 capas)...")
    out_gimp_path = out_tif_dir / f"{id_granule}_SCL_UNET_GIMP.tif"
    layers = [temp_bw_rgb_path, temp_snow_rgb_path, out_scl_color_path]
    
    if create_multilayer_gimp(temp_rgb_path, layers, out_gimp_path):
        print(f"    [v] Exportado para GIMP multicapa: {out_gimp_path.name}")
        
    # Limpiar temporales pesados
    for p in [temp_rgb_path, temp_bw_path, temp_snow_path, temp_bw_rgb_path, temp_snow_rgb_path, out_scl_color_path]:
        if p.exists(): p.unlink()

    print("    [+] Generando panel visual comparativo...")

    # Para la visualización, la imagen de 10980x10980 es muy pesada.
    # Haremos un Downsample agresivo (10%) para el PNG
    scale_factor = 10

    # Usar el mismo RGB que re-escalamos
    rgb_small = rgb.transpose(1, 2, 0)[::scale_factor, ::scale_factor]
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
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()

    print(f"    [v] Imagen comparativa guardada en: {output_path}")


import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inferencia U-Net")
    parser.add_argument("--test_dir", type=str, required=True, help="Directorio con gránulos de test")
    parser.add_argument("--model_path", type=str, required=True, help="Ruta al modelo entrenado (.pth)")
    parser.add_argument("--out_dir", type=str, default="visualizations", help="Ruta de salida de predicciones")
    args = parser.parse_args()

    test_dir = Path(args.test_dir)
    model_path = Path(args.model_path)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Buscar gránulos descargados
    if test_dir.exists():
        granules = [d for d in test_dir.iterdir() if d.is_dir()]
        for g in granules:
            out_file = out_dir / f"comparison_{g.name}.png"
            predict_granule(g, model_path, out_file, out_dir)
    else:
        print("El directorio de test está vacío.")
