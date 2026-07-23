"""
Motor de evaluación estadística y generación de métricas.

Cruza simultáneamente las matrices predichas por la red neuronal con el *Ground Truth*
editado manualmente. Calcula métricas rigorosas como *Intersection over Union* (IoU),
Precisión, *Recall*, y consolida la auditoría generando la Matriz de Confusión.
"""

import os
import rasterio
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score
from pathlib import Path

# Definición de las clases
CLASS_NAMES = ["Suelo (1)", "Nube (2)", "Sombra Nube (3)", "Nieve (4)"]
CLASSES = [1, 2, 3, 4]


def calculate_iou_per_class(cm):
    """
    Calcula el IoU para cada clase a partir de la Matriz de Confusión.
    IoU = TP / (TP + FP + FN)
    """
    ious = []
    for i in range(len(CLASSES)):
        tp = cm[i, i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp

        denominator = tp + fp + fn
        if denominator == 0:
            iou = 0.0
        else:
            iou = tp / denominator
        ious.append(iou)
    return np.array(ious)


def fast_confusion_matrix(y_true, y_pred, n_classes=5):
    cm_1d = np.bincount(y_true * n_classes + y_pred, minlength=n_classes**2)
    cm_2d = cm_1d.reshape((n_classes, n_classes))
    return cm_2d[1:, 1:]  # Extraer solo clases 1,2,3,4


def main():
    base_path = Path(__file__).parent
    viz_dir = base_path.parent / "visualizations" / "SCL_UNET"

    if not viz_dir.exists():
        print(f"[-] Directorio no encontrado: {viz_dir}")
        return

    # Buscar todos los archivos _SCL_edited.tif (Ground Truth)
    edited_files = sorted(list(viz_dir.glob("*_SCL_edited.tif")))

    if not edited_files:
        print("[-] No se encontraron archivos *_SCL_edited.tif.")
        return

    print(
        f"[*] Se encontraron {len(edited_files)} archivos de Test curados manualmente."
    )

    # Matriz global acumulativa de 4x4 (clases 1 a 4)
    global_cm = np.zeros((4, 4), dtype=np.int64)
    total_valid = 0

    for gt_path in edited_files:
        pred_filename = gt_path.name.replace("_SCL_edited.tif", "_SCL_UNET.tif")
        pred_path = viz_dir / pred_filename

        if not pred_path.exists():
            print(
                f"    [!] Advertencia: No se encontró la predicción para {gt_path.name}"
            )
            continue

        print(f"    [+] Procesando: {gt_path.name}")

        with rasterio.open(gt_path) as src_gt:
            y_true_2d = src_gt.read(1)

        with rasterio.open(pred_path) as src_pred:
            y_pred_2d = src_pred.read(1)

        # Aplanar matrices
        y_true_1d = y_true_2d.flatten()
        y_pred_1d = y_pred_2d.flatten()

        # Filtrar la clase 0 (Basura / NoData)
        valid_pixels = y_true_1d > 0

        y_true_valid = y_true_1d[valid_pixels]
        y_pred_valid = y_pred_1d[valid_pixels]

        total_valid += len(y_true_valid)

        # Actualizar Matriz de Confusión Global en tiempo real (evita OOM)
        cm = fast_confusion_matrix(y_true_valid, y_pred_valid)
        global_cm += cm

    if total_valid == 0:
        print("[-] No hay datos válidos para evaluar.")
        return

    print("\n[*] Agregando matrices y calculando métricas finales...")
    print(f"    [i] Total de píxeles válidos evaluados: {total_valid:,}")

    # Calcular Métricas desde la Matriz de Confusión
    cm = global_cm

    # Precisión = TP / (TP + FP)  -> diag / sum_col
    sum_col = cm.sum(axis=0)
    precision = np.divide(
        np.diag(cm),
        sum_col,
        out=np.zeros_like(sum_col, dtype=float),
        where=sum_col != 0,
    )

    # Recall = TP / (TP + FN) -> diag / sum_row
    sum_row = cm.sum(axis=1)
    recall = np.divide(
        np.diag(cm),
        sum_row,
        out=np.zeros_like(sum_row, dtype=float),
        where=sum_row != 0,
    )

    # F1 = 2 * (P*R)/(P+R)
    f1_denom = precision + recall
    f1 = np.divide(
        2 * precision * recall,
        f1_denom,
        out=np.zeros_like(f1_denom, dtype=float),
        where=f1_denom != 0,
    )

    ious = calculate_iou_per_class(cm)

    # Imprimir Reporte
    print("\n" + "=" * 50)
    print("   REPORTE DE MÉTRICAS (Conjunto de Test)")
    print("=" * 50)

    for i, class_name in enumerate(CLASS_NAMES):
        print(f"\n--- {class_name.upper()} ---")
        print(f" IoU       : {ious[i]*100:.2f} %")
        print(f" F1-Score  : {f1[i]*100:.2f} %")
        print(f" Precision : {precision[i]*100:.2f} %")
        print(f" Recall    : {recall[i]*100:.2f} %")

    print("\n" + "=" * 50)
    print("   MATRIZ DE CONFUSIÓN GLOBAL (Píxeles)")
    print("=" * 50)
    # Print formatted matrix
    print(
        f"{'':>15} | {'Pred: Suelo':>12} | {'Pred: Nube':>12} | {'Pred: Sombra':>12} | {'Pred: Nieve':>12}"
    )
    print("-" * 75)
    for i, class_name in enumerate(
        ["Real: Suelo", "Real: Nube", "Real: Sombra", "Real: Nieve"]
    ):
        row = cm[i]
        print(
            f"{class_name:>15} | {row[0]:>12,} | {row[1]:>12,} | {row[2]:>12,} | {row[3]:>12,}"
        )

    # Generar gráfico visual
    print("\n[*] Generando gráfico visual de la Matriz de Confusión...")
    plt.figure(figsize=(10, 8))

    # Calcular porcentajes por fila (Recall) para el Heatmap
    cm_normalized = cm.astype("float") / cm.sum(axis=1)[:, np.newaxis]
    cm_normalized = np.nan_to_num(cm_normalized) * 100  # Evitar divisiones por cero

    # Anotaciones duales (Absoluto y Porcentaje)
    annot = np.empty_like(cm).astype(str)
    nrows, ncols = cm.shape
    for i in range(nrows):
        for j in range(ncols):
            c = cm[i, j]
            p = cm_normalized[i, j]
            annot[i, j] = f"{p:.1f}%\n({c:,})"

    sns.heatmap(
        cm_normalized,
        annot=annot,
        fmt="",
        cmap="Blues",
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
        cbar_kws={"label": "Porcentaje de predicción (%)"},
    )

    plt.title(
        "Matriz de Confusión Agregada - Test Set\n(Verdad Terreno vs Predicción U-Net)"
    )
    plt.xlabel("Clase Predicha (U-Net)")
    plt.ylabel("Clase Real (Curación Manual)")

    out_plot = base_path.parent / "visualizations" / "confusion_matrix.png"
    plt.tight_layout()
    plt.savefig(out_plot, dpi=300)
    plt.close()

    print(f"    [v] Gráfico guardado exitosamente en: {out_plot}")
    print("\n[+] EVALUACIÓN FINALIZADA.\n")


if __name__ == "__main__":
    main()
