# Pipeline de Machine Learning

## Index

1. [Descarga de Entrenamiento](#1-descarga-de-entrenamiento)
2. [Descarga de Test](#2-descarga-de-test)
3. [Edición Manual (GIMP) y Decodificación](#3-edición-manual-gimp-y-decodificación)
4. [Creación y Carga del Dataset](#4-creación-y-carga-del-dataset)
5. [Entrenamiento del Modelo](#5-entrenamiento-del-modelo)
6. [Inferencia y Examen Final](#6-inferencia-y-examen-final)
7. [Evaluación Matemática](#7-evaluación-matemática)

---

## 1 Descarga de Entrenamiento

- Ejecuta [`001_download_training.py`](../scripts/001_download_training.py).
- Lee la lista de gránulos de [`training_granules.csv`](../scripts/training_granules.csv).
- Descarga los 30 gránulos de entrenamiento en `download/training/`.

[←Index](#index)

## 2 Descarga de Test

- Ejecuta [`002_download_test.py`](../scripts/002_download_test.py).
- Lee la lista de gránulos ocultos de [`test_granules.csv`](../scripts/test_granules.csv).
- Descarga los 10 gránulos en `download/test/`.

*Nota: Es indiferente bajar Test antes o después de entrenar, pero es muy eficiente bajarlo ahora para que puedas editar manualmente todas las imágenes (Train y Test) de una sola vez en el Paso 3.*

[←Index](#index)

## 3 Edición Manual (GIMP) y Decodificación

- Edita a color los archivos originales `_SCL_GIMP.tif` de las carpetas de descargas utilizando GIMP (pintando mares, corrigiendo nieve/nubes).
- Ejecuta [`003_decode_gimp_edits.py`](../scripts/003_decode_gimp_edits.py).
- Reconstruye los archivos editados en formato puro matemático, generando la Verdad Terreno Absoluta (`_SCL_edited.tif`) en las mismas carpetas.

[←Index](#index)

## 4 Creación y Carga del Dataset

- Ejecuta [`004_create_dataset.py`](../scripts/004_create_dataset.py). El script priorizará tus máscaras manuales (`_SCL_edited.tif`) para recortar las imágenes gigantes en parches puros de 512x512 píxeles (guardados en `dataset/patches/train/`).
- Referencia [`dataset.py`](../scripts/dataset.py) para cargar estos parches en la memoria GPU de forma ordenada.

[←Index](#index)

## 5 Entrenamiento del Modelo

- Ejecuta [`004_train.py`](../scripts/004_train.py) para entrenar la red neuronal (U-Net) con tus parches limpios.
- Crea el archivo de pesos de PyTorch `baseline_model.pth` en el directorio [`checkpoints/`](../checkpoints/).

[←Index](#index)

## 6 Inferencia y Examen Final

- Ejecuta [`006_predict.py`](../scripts/006_predict.py) cargando el modelo recién entrenado.
- La IA predice sobre los gránulos de Test, creando sus propias máscaras matemáticas (`_SCL_UNET.tif`) en el directorio [`visualizations/SCL_UNET/`](../visualizations/SCL_UNET/).

[←Index](#index)

## 7 Evaluación Matemática

- Ejecuta [`005_evaluate.py`](../scripts/005_evaluate.py) para cruzar píxel a píxel las inferencias de la IA contra tu Verdad Terreno del Set de Test.
- Extrae métricas de IoU, Precisión y Recall por clase (ahora sobre 6 clases).
- Crea el gráfico térmico `confusion_matrix.png` en el directorio de visualizaciones.

[←Index](#index)
