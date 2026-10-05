# Ingeniería del Conjunto de Datos (Feature Engineering y Tiling)

Este documento detalla la estructura lógica y arquitectónica del módulo de preprocesamiento espacial [`004_create_dataset.py`](../scripts/004_create_dataset.py), encargado de transformar las matrices satelitales crudas (.jp2) en tensores numéricos tridimensionales (.npy) compatibles con la red neuronal convolucional U-Net.

## 1. Objetivo del Script

El propósito del módulo es actuar como un **Data Pipeline** automatizado. Su flujo principal consiste en la lectura del archivo de catalogación maestro [`training_granules.csv`](../scripts/training_granules.csv), la localización de los gránulos ingeridos y su procesamiento iterativo para generar un *dataset* curado estadísticamente.

El proceso resuelve tres disfunciones inherentes a la ingeniería de datos en teledetección óptica:
1. **Alineación Espacial (Coregistro):** Todas las bandas espectrales deben presentar dimensiones y resolución geométrica unificadas (10 metros por píxel).
2. **Ingeniería de Características (Feature Engineering):** Pre-cálculo de índices matemáticos termodinámicos (NDSI) para asistir al modelo de segmentación en la convergencia.
3. **Particionado (Tiling) y Filtrado:** Segmentación de las matrices de gran dimensión en tensores estandarizados (512x512) y purgado sistemático de cuadrantes sin validez probabilística (zonas de no-cobertura y dominio pelágico).

## 2. Flujo de Trabajo y Determinaciones Técnicas

### 2.1. Resolución Dinámica y Alineación Espacial
El instrumental del Sentinel-2 captura espectros a distintas resoluciones nativas (e.g. B02 a 10m y B12 a 20m). La arquitectura U-Net exige estructuras matriciales paramétricamente idénticas.
- Se ejecuta la lectura preliminar de la banda **B02** (10m) para establecer la cuadrícula espacial de referencia o *Target Shape* (típicamente 10980x10980 píxeles).
- Las bandas de resolución inferida (**B11** y **B12**, a 20m) se someten a **remuestreo espacial (Upsampling)** hacia la resolución objetivo de 10m. Se emplea interpolación **Bilineal** (`Resampling.bilinear`), técnica que suaviza los artefactos de transición preservando la distribución física y continua de la radiancia.
- La máscara paramétrica del *Ground Truth* (**SCL**) presenta una resolución original de 20m. Al constituir un mapa categórico discreto (clase 1, clase 2, etc.), se fuerza un remuestreo mediante **Vecino Más Cercano** (`Resampling.nearest`) para garantizar la pureza algorítmica de los límites enteros, evitando valores fraccionarios inexistentes.

### 2.2. Ingeniería de Características: Índice NDSI
Para mitigar la carga de descubrimiento paramétrico de la red convolucional, se procede al pre-cálculo del *Normalized Difference Snow Index* (NDSI), inyectando conocimiento termodinámico explícito en el espacio de entrada:
```python
NDSI = (B03 - B11) / (B03 + B11 + 1e-8)
```
- **B03 (Verde):** Espectro donde las coberturas nivales registran máxima reflectancia.
- **B11 (SWIR):** Espectro donde la nieve absorbe la práctica totalidad de la radiación incidente.
- Se incorpora el coeficiente `1e-8` en el denominador como mecanismo de contención paramétrica frente a divisiones por cero (anomalía común en el borde exterior sin datos del gránulo).
El NDSI resultante se apila conformando el séptimo canal (dimensión extra) del tensor de entrada.

### 2.3. Composición del Tensor
El algoritmo ejecuta el apilamiento de las matrices bidimensionales utilizando funciones matriciales avanzadas (`numpy.stack`) para conformar el volumen denso tridimensional. El **Tensor Final de Entrada (X)** consolida 7 canales espectrales:
`[B02, B03, B04, B08, B11, B12, NDSI]`

### 2.4. Particionado (Tiling) y Filtrado OOM (Out-of-Memory)
Las dimensiones originales de una imagen Sentinel-2 (aproximadamente 10000x10000 píxeles) exceden severamente la capacidad de memoria VRAM de arquitecturas comerciales (*Out of Memory*).
- Se implementa un doble bucle iterativo que particiona la matriz principal en celdas o ventanas paramétricas estructuradas a **512x512** píxeles.
- **Filtro de Relevancia (Void Filtering):** Un elevado porcentaje de parches se localiza fuera del umbral de captura útil del satélite o sobre masas oceánicas homogéneas. Dado que la rutina [`download_sentinel.py`](../scripts/download_sentinel.py) agrupa previamente estas áreas bajo la **Clase 0 (Descarte)**, el proceso de *tiling* evalúa estadísticamente el bloque del *Ground Truth* (`Y`) de cada parche: si la volumetría de la Clase 0 **supera el 90%** del área integral, **el parche es purgado de la iteración de entrenamiento**.
- Esta reducción de la carga volumétrica optimiza drásticamente los tiempos de convergencia y el almacenamiento físico, previniendo el procesamiento cíclico de cuadrantes geográficamente nulos o desprovistos de información analítica.

## 3. Salida de Datos (Output)
Cada segmento topológico que satisface los controles paramétricos genera dos matrices binarias serializadas, almacenadas en el directorio `dataset/patches/train/<id_granule>/`:
- `X_<id>_<row>_<col>.npy`: Tensor multicanal de entrada satelital con los 7 canales espaciales.
- `Y_<id>_<row>_<col>.npy`: Matriz categórica bidimensional (*Ground Truth Tensor*) extraída de la capa consolidada SCL.

Este flujo operativo consolida la preparación integral del conjunto de datos, posibilitando la posterior asimilación mediante constructores de carga nativos (`DataLoader`) en entornos PyTorch o TensorFlow.
