import os
import pandas as pd
import rasterio
import numpy as np
from rasterio.enums import Resampling
from PIL import Image
from pathlib import Path
import shutil


def create_preview(vrt_path, output_png):
    if not os.path.exists(vrt_path):
        return False
    with rasterio.open(vrt_path) as src:
        data = src.read(
            out_shape=(src.count, 1024, 1024), resampling=Resampling.bilinear
        )
    # Sentinel-2 (L1C) valores típicos 0-10000. Recortamos en 3500.
    data = np.clip(data, 0, 3500)
    data = (data / 3500 * 255).astype(np.uint8)

    img_array = np.transpose(data, (1, 2, 0))
    img = Image.fromarray(img_array)
    img.save(output_png)
    return True


if __name__ == "__main__":
    base_path = Path(__file__).parent
    csv_path = base_path / "training_granules.csv"
    download_base = base_path.parent / "download" / "training"

    # Directorio de artefactos para poder visualizarlo en la interfaz
    artifact_dir = Path(
        "/home/a.lopez.g/.gemini/antigravity-ide/brain/b6a3aaf7-4a02-4481-ba6f-7d05e0d0de13/scratch"
    )

    df = pd.read_csv(csv_path)
    df_valid = df[df["date"] != "YYYY-MM-DD"]

    print("Iniciando renderizado en lote...")
    for index, row in df_valid.iterrows():
        id_granule = row["id"]
        granule_dir = download_base / id_granule
        vrt_path = granule_dir / f"{id_granule}_ColorReal.vrt"
        png_path = granule_dir / f"{id_granule}_preview.png"

        print(f"Generando PNG para {id_granule}...")
        if create_preview(vrt_path, png_path):
            artifact_png = artifact_dir / f"{id_granule}_preview.png"
            shutil.copy(png_path, artifact_png)

    print("¡Proceso terminado!")
