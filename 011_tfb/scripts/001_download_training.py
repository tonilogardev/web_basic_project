import os
from pathlib import Path
from sentinel_downloader import process_csv
import pandas as pd
import torch

if __name__ == "__main__":
    base_path = Path(__file__).parent
    train_csv = base_path / "training_granules.csv"
    out_train = base_path.parent / "download" / "training"

    if train_csv.exists():
        print("\n>>> FASE 1: DESCARGAS DE TRAINING Y COMPOSICIONES VISUALES (RGB/SWIR) <<<")
        process_csv(train_csv, out_train)

    else:
        print("No se encontró training_granules.csv")
