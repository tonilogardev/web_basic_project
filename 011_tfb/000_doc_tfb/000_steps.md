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

- Se ejecuta el script [`001_download_training.py`](../scripts/001_download_training.py).
- Se procesa la lista de gránulos contenida en [`training_granules.csv`](../scripts/training_granules.csv).
- Se descargan los 30 gránulos de entrenamiento en el directorio `download/training/`.

[←Index](#index)

## 2 Descarga de Test

- Se ejecuta el script [`002_download_test.py`](../scripts/002_download_test.py).
- Se procesa la lista de gránulos de validación aislada contenida en [`test_granules.csv`](../scripts/test_granules.csv).
- Se descargan los 10 gránulos en el directorio `download/test/`.

*Nota: Metodológicamente es indistinto descargar el conjunto de Test antes o después del entrenamiento, pero resulta operativamente eficiente realizar la descarga conjunta para abordar la curación visual (Train y Test) en una única fase.*

[←Index](#index)

## 3 Edición Manual (GIMP) y Decodificación

- Se editan visualmente los archivos originales `_SCL_GIMP.tif` de las carpetas de descarga empleando GIMP (clasificando masas de agua y corrigiendo clasificaciones erróneas de nieve/nubes).
- Se ejecuta el script [`003_decode_gimp_edits.py`](../scripts/003_decode_gimp_edits.py).
- Se reconstruyen los archivos editados a formato matricial matemático, generando la Verdad Terreno (`_SCL_edited.tif`) en sus respectivos directorios.

[←Index](#index)

## 4 Creación y Carga del Dataset

- Se ejecuta el script [`004_create_dataset.py`](../scripts/004_create_dataset.py). El algoritmo prioriza la lectura de las máscaras editadas manualmente (`_SCL_edited.tif`) para extraer parches de 512x512 píxeles (almacenados en `dataset/patches/train/`).
- Se utiliza la clase definida en [`dataset.py`](../scripts/dataset.py) para estructurar la carga de parches en la memoria GPU.

[←Index](#index)

## 5 Entrenamiento del Modelo

- Se ejecuta [`004_train.py`](../scripts/004_train.py) para iniciar el entrenamiento de la red neuronal (U-Net) utilizando los datos curados.
- Se exportan los pesos del modelo entrenado al archivo `baseline_model.pth` dentro del directorio [`checkpoints/`](../checkpoints/).

[←Index](#index)

## 6 Inferencia y Examen Final

- Se ejecuta [`006_predict.py`](../scripts/006_predict.py) cargando el modelo entrenado previamente.
- El modelo realiza predicciones sobre los gránulos de Test, generando máscaras matemáticas de inferencia (`_SCL_UNET.tif`) en el directorio [`visualizations/SCL_UNET/`](../visualizations/SCL_UNET/).

[←Index](#index)

## 7 Evaluación Matemática

- Se ejecuta [`005_evaluate.py`](../scripts/005_evaluate.py) para cruzar espacialmente las inferencias del modelo contra la Verdad Terreno del conjunto de Test.
- Se extraen las métricas estadísticas (IoU, Precisión y Recall) para las 6 clases definidas.
- Se genera la matriz de confusión agregada térmica (`confusion_matrix.png`) en el directorio de visualizaciones.

[←Index](#index)
