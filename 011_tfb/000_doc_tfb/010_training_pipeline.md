# Módulo de Flujo: Entrenamiento Convolucional (Baseline)

## Índice

1. [Integración Módulo Dataset](#1-integración-módulo-dataset)
2. [Estructuración Módulo Model](#2-estructuración-módulo-model)
3. [Secuenciación Módulo Train](#3-secuenciación-módulo-train)

---

## 1 Integración Módulo Dataset

- **Módulo**: [dataset.py](../scripts/dataset.py)
- **Función**: Actúa como el puente que lee los datos del disco duro y se los entrega listos a la tarjeta gráfica (GPU) para entrenar.
- **Flujo de Trabajo**:
  - Lee la carpeta `dataset/patches/train/` donde están todos los recortes (baldosas) guardados como archivos `.npy`.
  - Mezcla y separa los datos automáticamente: guarda un 80% para entrenar (enseñar a la red) y un 20% para validación (examinar a la red).
  - Convierte las imágenes satelitales del formato comprimido `Float16` (que ahorra espacio en disco) al formato estándar `Float32` que necesita PyTorch para hacer sus cálculos sin perder precisión.
  - Prepara las etiquetas (la Verdad Terreno) en el formato numérico correcto (`Long`) para que la función de error pueda evaluarlas.

[←Índice](#índice)

## 2 Estructuración Módulo Model

- **Módulo**: [model.py](../scripts/model.py)
- **Función**: Contiene los planos o el diseño arquitectónico de la red neuronal (la U-Net).
- **Flujo de Trabajo**:
  - **Codificador (Bajada)**: Recibe la imagen de 7 canales y va reduciendo su tamaño físico mientras aumenta su profundidad matemática (hasta 1024 canales) para extraer los conceptos más complejos.
  - **Decodificador (Subida)**: Vuelve a ampliar la imagen paso a paso hasta devolverle su tamaño original de 512x512 píxeles.
  - **Skip Connections (Conexiones Laterales)**: Son "atajos" que unen la bajada con la subida. Sirven para que la red no olvide los detalles finos (como los bordes exactos de una nube o de un parche de nieve) al volver a ampliar la imagen.
  - **Capa Final**: Una última transformación que coge toda la información procesada y genera un mapa con las 6 clases finales del proyecto.

[←Índice](#índice)

## 3 Secuenciación Módulo Train

- **Módulo**: [005_train.py](../scripts/005_train.py)
- **Función**: Entrenar a la red neuronal.
- **Flujo de Trabajo**:
  - Configura el sistema para que todos los cálculos matemáticos pesados se hagan en la tarjeta gráfica (`cuda:1`).
  - Configura la función de error `CrossEntropyLoss` incluyendo el parámetro `ignore_index=0`. Esto es vital para que la red ignore por completo el mar abierto y los bordes vacíos, y no pierda tiempo intentando aprender de ellos.
  - Inicia el bucle de entrenamiento, que repetirá el proceso durante 20 iteraciones completas (Épocas).
  - En cada vuelta, la red intenta predecir la imagen, compara su fallo con la Verdad Terreno, y ajusta sus engranajes internos para equivocarse menos la próxima vez (Backpropagation).
  - Al final de cada vuelta, evalúa a la red con el 20% de datos separados al principio. Si la red saca mejor nota (el error o `Loss` baja), guarda una copia de seguridad del modelo automáticamente (`baseline_model.pth`).

[←Índice](#índice)
