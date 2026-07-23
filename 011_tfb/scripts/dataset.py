import os
import numpy as np
import torch
from torch.utils.data import Dataset
from pathlib import Path

class SentinelDataset(Dataset):
    """
    Cargador de datos personalizado para el TFB.
    Lee los parches pre-procesados de 512x512 y los inyecta en la U-Net.
    """
    def __init__(self, data_dir, split="train", val_ratio=0.2, seed=42):
        self.data_dir = Path(data_dir)
        
        # Buscar todos los archivos X_*.npy (features)
        # Buscar recursivamente en todas las subcarpetas de los gránulos
        all_x_paths = list(self.data_dir.rglob("X_*.npy"))
        
        # Ordenar para mantener consistencia antes del split
        all_x_paths.sort()
        
        # Mezclar aleatoriamente pero con semilla fija para reproducibilidad
        np.random.seed(seed)
        np.random.shuffle(all_x_paths)
        
        # Calcular el punto de corte para el split
        split_idx = int(len(all_x_paths) * (1 - val_ratio))
        
        if split == "train":
            self.x_paths = all_x_paths[:split_idx]
        elif split == "val":
            self.x_paths = all_x_paths[split_idx:]
        else:
            raise ValueError("Split debe ser 'train' o 'val'")
            
        print(f"[*] Dataset '{split}' inicializado con {len(self.x_paths)} parches.")

    def __len__(self):
        return len(self.x_paths)

    def __getitem__(self, idx):
        x_path = self.x_paths[idx]
        
        # El archivo Y correspondiente se llama igual pero empieza por 'Y_'
        y_name = x_path.name.replace("X_", "Y_")
        y_path = x_path.parent / y_name
        
        # Cargar numpy arrays
        x_arr = np.load(x_path)
        y_arr = np.load(y_path)
        
        # 1. Conversión de Tipos (Crucial para el backpropagation)
        # X estaba en float16 en disco para ahorrar espacio, pero PyTorch necesita float32
        x_tensor = torch.from_numpy(x_arr).float()
        
        # Y estaba en uint8, pero CrossEntropyLoss en PyTorch exige que las clases sean enteros largos (long)
        y_tensor = torch.from_numpy(y_arr).long()
        
        return x_tensor, y_tensor
