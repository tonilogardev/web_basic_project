# Pipeline de Entrenamiento (Baseline)

## Index

1. [Script dataset](#1-script-dataset)
2. [Script model](#2-script-model)
3. [Script train](#3-script-train)

---

## 1 Script dataset

- **Archivo**: [dataset.py](../scripts/dataset.py)
- **Misión**: Actuar como puente entre el disco duro y la tarjeta gráfica.
- **Flujo de Ejecución**:
  - Escanea la carpeta `dataset/patches/train/` en busca de los ficheros espaciales `.npy`.
  - Separa aleatoriamente (pero con semilla matemática fija) un 80% para Entrenamiento y un 20% para Validación.
  - Lee las matrices de entrada (`X`) y las "infla" de `Float16` a `Float32` para evitar errores matemáticos en PyTorch.
  - Lee las matrices de salida o etiquetas (`Y`) y las convierte a enteros `Long`, formato exigido por la función de pérdida.

[←Index](#index)

## 2 Script model

- **Archivo**: [model.py](../scripts/model.py)
- **Misión**: Definir matemáticamente el "Cerebro" de Inteligencia Artificial.
- **Flujo de Ejecución**:
  - **Clase UNet**: Red Neuronal Convolucional programada desde cero.
  - **Encoder (Bajada)**: Recibe una imagen de 7 canales. Aplica convoluciones reduciendo el tamaño espacial y aumentando la profundidad (hasta 1024 canales en el cuello de botella).
  - **Decoder (Subida)**: Expande la imagen de nuevo a la resolución original (512x512).
  - **Skip Connections**: Conecta físicamente las capas de bajada con las de subida para no perder la resolución espacial fina de los bordes de la nieve y nubes.
  - **Capa Final**: Convierte la profundidad a 5 canales exactos (los "Logits" de las 5 Clases Maestras).

[←Index](#index)

## 3 Script train

- **Archivo**: [train.py](../scripts/train.py)
- **Misión**: Orquestar el proceso de aprendizaje repetitivo (Épocas).
- **Flujo de Ejecución**:
  - Selecciona la tarjeta gráfica libre (en este caso `cuda:1`).
  - Instancia el modelo y el cargador de datos.
  - Define la función de castigo `CrossEntropyLoss(ignore_index=0)`. El parámetro `ignore_index` prohíbe castigar a la red por fallar en zonas de "Basura" (Mar profundo, bordes sin datos).
  - Define el Optimizador `Adam`.
  - Inicia un bucle de 20 vueltas completas sobre todos los datos (Épocas).
  - En cada vuelta, ajusta los pesos matemáticos basándose en los errores calculados (Backpropagation).
  - Evalúa a la red en el Dataset de Validación. Si aprueba con mejor nota (menor Loss) que en épocas anteriores, guarda el archivo físico de pesos `baseline_model.pth` en la carpeta `checkpoints`.

[←Index](#index)
