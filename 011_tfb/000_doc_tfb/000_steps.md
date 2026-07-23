# Pipeline de Machine Learning

## Index

1. [Descarga de Entrenamiento](#1-descarga-de-entrenamiento)
2. [Descarga de Test](#2-descarga-de-test)
3. [Creación y Carga del Dataset](#3-creación-y-carga-del-dataset)
4. [Entrenamiento del Modelo](#4-entrenamiento-del-modelo)
5. [Inferencia y Examen Final](#5-inferencia-y-examen-final)
6. [Curación Humana](#6-curación-humana)
7. [Evaluación Matemática](#7-evaluación-matemática)

---

## 1 Descarga de Entrenamiento

- Ejecuta [`download_training.py`](../scripts/download_training.py).
- Lee la lista de gránulos de [`training_granules.csv`](../scripts/training_granules.csv).
- Descarga los 30 gránulos de entrenamiento en `download/training/`.

[←Index](#index)

## 2 Descarga de Test

- Ejecuta [`download_test.py`](../scripts/download_test.py).
- Lee la lista de gránulos ocultos de [`test_granules.csv`](../scripts/test_granules.csv).
- Descarga los 10 gránulos en `download/test/`.

[←Index](#index)

## 3 Creación y Carga del Dataset

- Ejecuta [`create_dataset.py`](../scripts/create_dataset.py) para recortar las imágenes gigantes en parches de 512x512 píxeles (guardados en `dataset/patches/train/`).
- Referencia [`dataset.py`](../scripts/dataset.py) para cargar estos parches en la memoria GPU de forma ordenada durante la fase de entrenamiento.

[←Index](#index)

## 4 Entrenamiento del Modelo

- Ejecuta [`train.py`](../scripts/train.py) para entrenar la red neuronal (U-Net) con los parches.
- Crea el archivo de pesos de PyTorch `baseline_model.pth` en el directorio [`checkpoints/`](../checkpoints/).

[←Index](#index)

## 5 Inferencia y Examen Final

- Ejecuta [`predict.py`](../scripts/predict.py) cargando el modelo entrenado.
- Crea las máscaras matemáticas (`_SCL_UNET.tif`) y las versiones coloreadas (`_SCL_UNET_GIMP.tif`) en el directorio [`visualizations/SCL_UNET/`](../visualizations/SCL_UNET/).

[←Index](#index)

## 6 Edición manual

- Edita a color los archivos `_SCL_UNET_GIMP.tif` utilizando GIMP para corregir la IA.
- Ejecuta [`decode_gimp_edits.py`](../scripts/decode_gimp_edits.py).
- Reconstruye el archivo editado en un formato puro matemático, generando la Verdad Terreno (`_SCL_edited.tif`).

[←Index](#index)

## 7 Evaluación Matemática

- Ejecuta [`evaluate.py`](../scripts/evaluate.py) para cruzar píxel a píxel las inferencias contra la Verdad Terreno.
- Extrae métricas de IoU, Precisión y Recall por clase.
- Crea el gráfico térmico `confusion_matrix.png` en el directorio de visualizaciones.

[←Index](#index)
