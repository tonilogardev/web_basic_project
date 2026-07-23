# Diseño Arquitectónico: Red Neuronal Convolucional (U-Net)

## Index

1. [Framework Tecnológico](#1-framework-tecnologico)
2. [Data Shapes](#2-data-shapes)
3. [Custom U-Net vs Transfer Learning](#3-custom-u-net-vs-transfer-learning)
4. [Loss Function](#4-loss-function)
5. [Métricas de Evaluación](#5-metricas-de-evaluacion)

---

## 1 Framework Tecnológico

- **Framework**: PyTorch.
- **Justificación**: Estándar de la industria para imágenes multiespectrales.
- **Teoría de Funcionamiento (Arquitectura U-Net)**:
  La U-Net es una Red Neuronal Convolucional (CNN) de última generación diseñada específicamente para la **segmentación semántica espacial** (*Ronneberger, Fischer & Brox, 2015*); es decir, no solo infiere qué elementos hay en una imagen (clasificación), sino que predice exactamente a qué clase pertenece **cada píxel individualmente**. Su nombre proviene de su característica topología matemática en forma de "U", que consta de tres mecanismos críticos:
  1. **El Encoder (Ruta de Contracción/Bajada)**: A medida que la imagen satelital avanza por esta ruta, la red aplica filtros matemáticos (convoluciones) y reduce agresivamente el tamaño de la imagen (mediante *Max Pooling*). En este descenso, la red pierde resolución espacial pero multiplica su profundidad, extrayendo los patrones espectrales de alto nivel. Es decir, el Encoder aprende el **"QUÉ"** (ej. aprende la firma espectral que diferencia la nieve de la nube).
  2. **El Decoder (Ruta de Expansión/Subida)**: Es el lado ascendente de la "U". Toma la información abstracta hipercomprimida del fondo de la red y la vuelve a escalar progresivamente hacia arriba (*Up-convolutions*) hasta recuperar el tamaño original (512x512 píxeles). Su objetivo es proyectar lo aprendido de nuevo en el espacio geográfico. Es decir, el Decoder aprende el **"DÓNDE"** (las coordenadas físicas del píxel).
  3. **Skip Connections (El Secreto de la Resolución)**: Si solo usáramos el Encoder y el Decoder, la imagen final saldría extremadamente borrosa tras haber sido tan comprimida. Para solucionarlo, la U-Net lanza "puentes horizontales" que conectan la bajada directamente con la subida. Estos puentes inyectan los bordes y texturas nítidas originales de alta resolución directamente en las capas de reconstrucción, logrando mapear con extrema precisión la frontera milimétrica entre la nieve y el terreno subyacente.
  - **Inferencia (Tratamiento de Entrada y Salida)**: Al modelo se le inyecta un tensor espacial de **7 canales** simultáneos. Tras atravesar la "U", el Decoder expulsa **5 canales paralelos** (mapas de probabilidad). Una función de activación matemática (`Softmax`) evalúa cada píxel a lo largo de esos 5 canales y decide estadísticamente qué clase tiene la probabilidad más alta, colapsando el tensor tridimensional en la imagen 2D final donde cada píxel tiene un valor absoluto del 0 al 4.

[←Index](#index)

## 2 Data Shapes

- **Inputs (`X`)**:
  - Forma: `(N, 7, 512, 512)`
  - 7 Canales (Información proporcionada):
    - `B02` (Azul), `B03` (Verde), `B04` (Rojo): Espectro visible. Capturan texturas físicas y sombras.
    - `B08` (NIR - Infrarrojo Cercano): Identifica vegetación y cuerpos de agua (absorben NIR).
    - `B11`, `B12` (SWIR - Infrarrojo de Onda Corta): Físicamente críticos para separar nube (refleja SWIR, brilla) de nieve (absorbe SWIR, se oscurece).
    - `NDSI` (Normalized Difference Snow Index): Índice matemático pre-calculado `(B03-B11)/(B03+B11)`. Inyecta conocimiento físico explícito sobre la nieve a la red.
  - Tipos de Datos (Tipado):
    - Almacenados en disco como `Float16`: Reduce exactamente a la mitad el peso en disco de los miles de tensores y acelera la velocidad de lectura (I/O).
    - Entran en la red como `Float32`: Cuando la red neuronal está aprendiendo, hace ajustes matemáticos microscópicos. Si usáramos la baja precisión de `Float16`, el ordenador no tendría suficientes decimales para guardar números tan diminutos, los redondearía a cero o daría error, y el aprendizaje colapsaría. Por eso necesitamos la alta precisión de `Float32` para los cálculos internos.

- **Outputs (`Y_pred`)**:
  - Forma: `(N, 5, 512, 512)`
  - Logits por Clase Maestra: 0 (Basura), 1 (Suelo), 2 (Nube), 3 (Sombra), 4 (Nieve).
  - Función Final: `Softmax` (suma 1.0 por píxel).

[←Index](#index)

## 3. Justificación de la programación desde cero frente a redes pre-entrenadas

**¿Por qué no se utiliza una red U-Net pre-entrenada?**

- **Arquitectura**: U-Net programada *From Scratch*.
- **Análisis Crítico**:
  - **Incompatibilidad de Entradas (Canales Físicos)**: Los modelos públicos de Sentinel-2 están rígidamente diseñados para ingerir las 10 bandas crudas. La arquitectura propuesta utiliza 7 canales específicos (6 bandas filtradas + el índice NDSI explícito). Modificar la capa de entrada de un modelo pre-entrenado para que acepte 7 canales en lugar de 10 corrompe sus pesos matemáticos iniciales, anulando la ventaja del *Transfer Learning*.
  - **Incompatibilidad de Salidas (Taxonomía)**: Las redes pre-entrenadas devuelven máscaras binarias (Nube / Despejado) o de 3 clases. El proyecto exige mapear una taxonomía semántica de 5 Clases Maestras (incluyendo sombras complejas, nieve y píxeles de descarte). Adaptar el modelo requeriría amputar y reemplazar completamente su capa final de predicción.
  - **Abundancia de Datos (Volumen)**: El *Transfer Learning* es una técnica para paliar la falta de datos. El proceso de Ingeniería de Datos ha extraído más de 8.000 tensores espaciales de 512x512 píxeles. Este volumen masivo de información proporciona suficiente varianza estadística para que una U-Net iniciada en blanco aprenda la física multiespectral por sí misma.
  - **Superioridad de las CNN**: La literatura científica actual (e.g., *Wieland, Li & Martinis, 2019*) demuestra que las arquitecturas CNN convolucionales superan ampliamente a los algoritmos heurísticos tradicionales en la segmentación de nubes y sombras complejas multisensores, justificando el diseño "From Scratch" frente a herramientas algorítmicas heredadas.
  

[←Index](#index)

## 4. Loss Function (Función de Pérdida)

- **Función Principal**: `CrossEntropyLoss` (Implementada en el script de entrenamiento [`train.py`](../scripts/train.py)).
- **Estrategia Crítica de Enmascarado (`ignore_index`)**:
  - Se configura matemáticamente como `nn.CrossEntropyLoss(ignore_index=0)`.
  - **Justificación Extensa**: Las imágenes satelitales Sentinel-2 contienen habitualmente vastas áreas de "Basura / NoData" (ej. mares profundos oscuros, o triángulos negros fuera de la órbita del satélite). Si la función de pérdida procesa estos píxeles, la red neuronal intentará encontrar patrones ópticos donde solo hay "ruido geográfico", corrompiendo la actualización de sus pesos matemáticos. Al inyectar el parámetro `ignore_index=0`, el algoritmo anula cualquier castigo o recompensa en estas áreas. De esta forma, la U-Net concentra el 100% de su capacidad de cálculo y aprendizaje exclusivamente en la física real: la nieve, las nubes y el terreno.

[←Index](#index)

## 5. Métricas de Evaluación

- **Métrica Principal**: `Intersection over Union (IoU)` (Índice Jaccard).
- **Justificación contra la Precisión Global (*Overall Accuracy*)**:
  - En la teledetección óptica existe un grave riesgo de sesgo por desbalanceo de clases. Una imagen satelital puede tener un 95% de cielo despejado y apenas un 5% de nieve en las cumbres. Si la Inteligencia Artificial desarrolla un sesgo perezoso y predice "Suelo Útil" en toda la imagen, obtendría una *Overall Accuracy* del 95%, aparentando ser un modelo excelente cuando en realidad es incapaz de detectar la nieve.
  - **El Enfoque IoU**: Para evitar este engaño estadístico, el proyecto descarta la precisión global y pasa a evaluar el modelo calculando el IoU de forma independiente por clase (ej. IoU exclusivo de la Nieve). Esta métrica mide geométricamente cuánto se solapa la mancha inferida por la IA frente a la mancha real delimitada por el humano, penalizando de forma implacable tanto la sobre-predicción (falsos positivos) como la sub-predicción (falsos negativos).

[←Index](#index)
