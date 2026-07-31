import numpy as np
import rasterio
from pathlib import Path

COLOR_MAP = {
    0: [0, 0, 0],  # Basura / Bordes NoData
    1: [34, 139, 34],  # Suelo
    2: [255, 255, 255],  # Nube
    3: [100, 100, 100],  # Sombra Nube
    4: [0, 255, 255],  # Nieve
    5: [0, 0, 255],  # Masas de Agua (Mar, lagos)
}


def encode_to_rgb(input_tif, output_tif):
    """
    Convierte una máscara categórica de 1 banda (0-4) a un GeoTIFF RGB de 3 bandas
    basado en COLOR_MAP, ideal para editar visualmente en GIMP.
    """
    input_tif = Path(input_tif)
    output_tif = Path(output_tif)

    if not input_tif.exists():
        print(f"[-] No se encontró: {input_tif}")
        return False

    with rasterio.open(input_tif) as src:
        meta = src.meta.copy()
        data = src.read(1)

    h, w = data.shape
    rgb = np.zeros((3, h, w), dtype=np.uint8)

    for class_idx, color in COLOR_MAP.items():
        mask = data == class_idx
        for band in range(3):
            rgb[band][mask] = color[band]

    meta.update(
        count=3,
        dtype=rasterio.uint8,
        photometric="RGB",
        driver="GTiff",
        compress="deflate",
    )

    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(output_tif, "w", **meta) as dst:
            dst.write(rgb)

    return True


def encode_binary_to_rgb(input_tif, output_tif, color_true=[255, 255, 255], color_false=[0, 0, 0]):
    """
    Convierte una máscara binaria de 1 banda (0 y 1) a un GeoTIFF RGB de 3 bandas
    para que sea visible en editores como GIMP.
    """
    input_tif = Path(input_tif)
    output_tif = Path(output_tif)

    if not input_tif.exists():
        return False

    with rasterio.open(input_tif) as src:
        meta = src.meta.copy()
        data = src.read(1)

    h, w = data.shape
    rgb = np.zeros((3, h, w), dtype=np.uint8)

    mask_true = data == 1
    mask_false = data == 0

    for band in range(3):
        rgb[band][mask_true] = color_true[band]
        rgb[band][mask_false] = color_false[band]

    meta.update(
        count=3,
        dtype=rasterio.uint8,
        photometric="RGB",
        driver="GTiff",
        compress="deflate",
    )

    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(output_tif, "w", **meta) as dst:
            dst.write(rgb)

    return True


def decode_to_classes(input_rgb_tif, output_tif, base_profile=None):
    """
    Escanea un GeoTIFF RGB (ej. editado en GIMP) y reconstruye la matriz matemática
    original de 1 banda (0-4) buscando el color más cercano al COLOR_MAP.
    """
    input_rgb_tif = Path(input_rgb_tif)
    output_tif = Path(output_tif)

    if not input_rgb_tif.exists():
        print(f"[-] No se encontró: {input_rgb_tif}")
        return False

    with rasterio.open(input_rgb_tif) as src:
        meta = src.meta.copy()
        if src.count < 3:
            print("[-] La imagen debe tener al menos 3 bandas (RGB).")
            return False
        rgb_data = src.read((1, 2, 3)).transpose(1, 2, 0).astype(np.float32)

    h, w, _ = rgb_data.shape
    new_data = np.zeros((h, w), dtype=np.uint8)

    classes = list(COLOR_MAP.keys())
    colors = np.array([COLOR_MAP[c] for c in classes], dtype=np.float32)

    # Calcular distancia euclidiana al cuadrado para cada píxel frente a los 5 colores base
    rgb_expanded = rgb_data[:, :, np.newaxis, :]
    dists = np.sum((rgb_expanded - colors) ** 2, axis=3)
    min_idx = np.argmin(dists, axis=2)

    for i, c in enumerate(classes):
        new_data[min_idx == i] = c

    # Reinyectar el perfil original si lo tenemos (para sobrevivir a GIMP)
    if base_profile:
        out_meta = base_profile.copy()
    else:
        out_meta = meta.copy()

    out_meta.update(count=1, dtype=rasterio.uint8, driver="GTiff", compress="deflate")
    if "photometric" in out_meta:
        del out_meta["photometric"]

    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(output_tif, "w", **out_meta) as dst:
            dst.write(new_data, 1)

    return True


def create_multilayer_gimp(base_rgb_tif, list_of_layer_tifs, output_tif):
    """
    Genera un archivo TIFF multipágina (multicapa).
    - base_rgb_tif: Capa inferior (fondo)
    - list_of_layer_tifs: Lista de rutas a las capas superiores (en orden de abajo a arriba)
    """
    from PIL import Image
    import shutil
    try:
        im_base = Image.open(base_rgb_tif)
        append_images = [Image.open(tif) for tif in list_of_layer_tifs]
        
        # GIMP carga la primera página (page 0) como la capa base (fondo) y las siguientes
        # páginas las apila por encima.
        im_base.save(
            output_tif, 
            save_all=True, 
            append_images=append_images, 
            compression="tiff_deflate"
        )
        
        tfw_source = str(base_rgb_tif).replace('.tif', '.tfw')
        if Path(tfw_source).exists():
            tfw_dest = str(output_tif).replace('.tif', '.tfw')
            shutil.copy(tfw_source, tfw_dest)
            
        xml_source = str(base_rgb_tif) + '.aux.xml'
        if Path(xml_source).exists():
            xml_dest = str(output_tif) + '.aux.xml'
            shutil.copy(xml_source, xml_dest)

        return True
    except Exception as e:
        print(f"[-] Error empaquetando multicapa: {e}")
        return False


def decode_multilayer_to_classes(input_tif, output_tif, base_profile=None):
    """
    Lee un archivo TIFF multicapa editado en GIMP, extrae automáticamente la capa
    de la máscara (que es la última página o la capa superior) y decodifica sus
    colores RGB a clases matemáticas (0-4).
    Si la imagen fue aplanada por error al guardarse, procesará la única capa disponible.
    """
    from PIL import Image
    input_tif = Path(input_tif)
    output_tif = Path(output_tif)

    if not input_tif.exists():
        print(f"[-] No se encontró: {input_tif}")
        return False

    try:
        im = Image.open(input_tif)
        
        # En GIMP, la capa superior (donde pintamos la máscara SCL) 
        # se corresponde con la última página del TIFF al exportar.
        target_page = im.n_frames - 1
        im.seek(target_page)
        
        # Extraemos esa página y nos aseguramos de que sea RGB
        im_rgb = im.convert("RGB")
        rgb_data = np.array(im_rgb, dtype=np.float32)
    except Exception as e:
        print(f"[-] Error abriendo imagen multicapa: {e}")
        return False

    h, w, _ = rgb_data.shape
    new_data = np.zeros((h, w), dtype=np.uint8)

    classes = list(COLOR_MAP.keys())
    colors = np.array([COLOR_MAP[c] for c in classes], dtype=np.float32)

    # Calcular distancia euclidiana al cuadrado para cada píxel
    rgb_expanded = rgb_data[:, :, np.newaxis, :]
    dists = np.sum((rgb_expanded - colors) ** 2, axis=3)
    min_idx = np.argmin(dists, axis=2)

    for i, c in enumerate(classes):
        new_data[min_idx == i] = c

    # Construir metadatos de salida
    if base_profile:
        out_meta = base_profile.copy()
    else:
        out_meta = {
            "driver": "GTiff",
            "height": h,
            "width": w,
            "count": 1,
            "dtype": rasterio.uint8,
            "crs": None,
            "transform": rasterio.Affine.identity(),
            "compress": "deflate",
        }

    out_meta.update(count=1, dtype=rasterio.uint8, driver="GTiff", compress="deflate")
    if "photometric" in out_meta:
        del out_meta["photometric"]

    with rasterio.Env(GDAL_PAM_ENABLED="NO"):
        with rasterio.open(output_tif, "w", **out_meta) as dst:
            dst.write(new_data, 1)

    return True

