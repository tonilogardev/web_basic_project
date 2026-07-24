# Creación del Dataset de Entrenamiento (Feature Engineering y Tiling)

Este documento detalla el funcionamiento lógico y arquitectónico del script [`004_create_dataset.py`](../scripts/004_create_dataset.py), encargado de transformar las imágenes satelitales crudas (.jp2) descargadas en tensores matemáticos (.npy) listos para ser consumidos por la red neuronal U-Net.

## 1. Objetivo del Script

El propósito del script es actuar como un **Data Pipeline** automatizado. Su flujo principal es leer el archivo maestro [`training_granules.csv`](../scripts/training_granules.csv), localizar los gránulos descargados y procesarlos iterativamente para generar un *dataset* curado.

El proceso resuelve tres grandes retos de ingeniería de datos en teledetección:
1. **Alineación Espacial (Coregistro):** Todas las bandas deben tener exactamente las mismas dimensiones y resolución (10 metros por píxel).
2. **Feature Engineering:** Cálculo de índices matemáticos (NDSI) para ayudar a la red.
3. **Tiling y Filtrado:** Recorte de la inmensa imagen original en parches manejables (512x512) y purgado de datos inútiles (zonas vacías o mar abierto).

## 2. Flujo de Trabajo y Decisiones Técnicas

### 2.1. Resolución Dinámica y Alineación Espacial
Sentinel-2 captura bandas físicas a diferentes resoluciones nativas (ej. B02 a 10m y B12 a 20m). La red U-Net exige matrices estandarizadas.
- Se lee la banda **B02** (10m) primero para establecer la cuadrícula espacial objetivo o *Target Shape* (usualmente 10980x10980 píxeles).
- Las bandas de baja resolución (**B11** y **B12**, a 20m) se **remuestrean por software (Upsampling)** a la resolución objetivo de 10m utilizando interpolación **Bilineal** (`Resampling.bilinear`), lo que suaviza las transiciones preservando la distribución física de la radiación continua.
- La máscara de Ground Truth (**SCL**) también está a 20m, pero al ser un mapa categórico (clase 1, clase 2, clase 3), se remuestrea obligatoriamente usando **Vecino Más Cercano** (`Resampling.nearest`) para no corromper la pureza de las clases enteras.

### 2.2. Feature Engineering: Índice NDSI
En lugar de forzar a la red a descubrir la relación física por sí sola, el script precalcula el *Normalized Difference Snow Index* (NDSI) inyectando conocimiento termodinámico explícito:
```python
NDSI = (B03 - B11) / (B03 + B11 + 1e-8)
```
- **B03 (Verde):** Donde la nieve refleja muchísimo.
- **B11 (SWIR):** Donde la nieve absorbe toda la luz (aparece negra).
- Se añade `1e-8` en el denominador como mecanismo de seguridad contra divisiones por cero (frecuentes en el borde negro exterior del gránulo).
El NDSI resultante se apila como el séptimo canal (Canal Extra) de la entrada.

### 2.3. Composición del Tensor
El script apila todas las matrices 2D utilizando `numpy.stack` para conformar el volumen denso tridimensional. El **Tensor Final X** tiene 7 canales:
`[B02, B03, B04, B08, B11, B12, NDSI]`

### 2.4. Troceado (Tiling) y Filtrado de OOM (Out-of-Memory)
Una imagen Sentinel-2 de ~10000x10000 píxeles destruiría la RAM de cualquier GPU comercial (Out of Memory).
- Se implementa un doble bucle iterativo que recorta la gran matriz en miles de "parches" o ventanas cuadradas de **512x512** píxeles.
- **Filtro de Relevancia (Void Filtering):** Muchos parches caen fuera del rombo útil del satélite o en medio del mar Mediterráneo. Gracias a que [`download_sentinel.py`](../scripts/download_sentinel.py) colapsó previamente estas áreas inútiles en la **Clase 0 (Basura)**, el script evalúa estadísticamente el Ground Truth (`Y`) de cada parche: si los píxeles de la Clase 0 **superan el 90%** del área total (512x512), **el parche se descarta**.
- Esto reduce masivamente los tiempos de entrenamiento y el uso del disco duro, evitando que la red neuronal malgaste épocas enteras mirando parches negros u olas en el mar.

## 3. Salida de Datos (Output)
Cada parche útil que supera los controles de calidad genera dos archivos binarios de alto rendimiento, guardados en la carpeta `dataset/patches/train/<id_granule>/`:
- `X_<id>_<row>_<col>.npy`: El cubo de datos satelitales (Input Tensor) con los 7 canales espaciales.
- `Y_<id>_<row>_<col>.npy`: La matriz 2D categórica (Ground Truth Tensor) extraída de la banda SCL.

Este flujo deja el terreno 100% preparado para la posterior construcción del objeto `DataLoader` en PyTorch / TensorFlow.
