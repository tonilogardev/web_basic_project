"""
Script principal de entrenamiento del modelo espacial.

Orquesta la iteración de la arquitectura U-Net sobre el conjunto de datos de
entrenamiento. Minimiza la función de pérdida *Cross Entropy Loss* (ignorando
ruido geográfico mediante `ignore_index=0`) y guarda los pesos optimizados
en el archivo `checkpoints/baseline_model.pth`.
"""

import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from dataset import SentinelDataset
from model import UNet
from tqdm import tqdm
from pathlib import Path
import argparse

# Configuración predeterminada (modificada por argparse)
LEARNING_RATE = 1e-4

# Dispositivo: Forzamos cuda:1 porque la GPU 0 está ocupada por otro proceso
DEVICE = torch.device(
    "cuda:1"
    if torch.cuda.device_count() > 1
    else "cuda:0" if torch.cuda.is_available() else "cpu"
)


def train_baseline(data_dir, checkpoint_dir, epochs, batch_size, lr=LEARNING_RATE):
    print(f"[*] Usando dispositivo: {DEVICE}")
    checkpoint_dir = Path(checkpoint_dir)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    # 1. Preparar Datasets y DataLoaders
    train_dataset = SentinelDataset(data_dir, split="train")
    val_dataset = SentinelDataset(data_dir, split="val")

    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, shuffle=True, num_workers=4
    )
    val_loader = DataLoader(
        val_dataset, batch_size=batch_size, shuffle=False, num_workers=4
    )

    # 2. Inicializar Modelo, Loss y Optimizador
    model = UNet(in_channels=7, out_classes=6).to(DEVICE)

    # ignore_index=0 es el secreto para no entrenar sobre el Mar Profundo y los bordes negros
    criterion = nn.CrossEntropyLoss(ignore_index=0)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

    best_val_loss = float("inf")

    print("==================================================")
    print(" INICIANDO ENTRENAMIENTO BASELINE NOCTURNO")
    print("==================================================")

    # 3. Bucle de Épocas
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0

        # tqdm para ver la barra de progreso en la terminal
        train_bar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs} [Train]")
        for x, y in train_bar:
            x, y = x.to(DEVICE), y.to(DEVICE)

            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)

            loss.backward()
            optimizer.step()

            train_loss += loss.item()
            train_bar.set_postfix({"loss": f"{loss.item():.4f}"})

        avg_train_loss = train_loss / len(train_loader)

        # 4. Validación
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            val_bar = tqdm(val_loader, desc=f"Epoch {epoch+1}/{epochs} [Val]")
            for x, y in val_bar:
                x, y = x.to(DEVICE), y.to(DEVICE)
                logits = model(x)
                loss = criterion(logits, y)
                val_loss += loss.item()
                val_bar.set_postfix({"loss": f"{loss.item():.4f}"})

        avg_val_loss = val_loss / len(val_loader)

        print(f"\n--- Epoch {epoch+1} Resume ---")
        print(f"Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}")

        # 5. Guardar el mejor modelo
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), checkpoint_dir / "baseline_model.pth")
            print(
                f"[*] ¡Mejora detectada! Modelo guardado con Val Loss: {best_val_loss:.4f}"
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Entrenamiento U-Net Sentinel")
    parser.add_argument("--data_dir", type=str, required=True, help="Ruta de los parches de entrenamiento")
    parser.add_argument("--checkpoint_dir", type=str, default="checkpoints", help="Ruta de guardado de modelos")
    parser.add_argument("--epochs", type=int, default=20, help="Número de épocas")
    parser.add_argument("--batch_size", type=int, default=8, help="Tamaño del batch")
    args = parser.parse_args()

    train_baseline(args.data_dir, args.checkpoint_dir, args.epochs, args.batch_size)
