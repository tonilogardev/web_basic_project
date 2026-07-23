import os
from pathlib import Path
from sentinel_downloader import process_csv

if __name__ == "__main__":
    base_path = Path(__file__).parent
    test_csv = base_path / "test_granules.csv"
    out_test = base_path.parent / "download" / "test"
    
    if test_csv.exists():
        print("\n>>> INICIANDO DESCARGAS DE TEST <<<")
        process_csv(test_csv, out_test)
    else:
        print("No se encontró test_granules.csv")
