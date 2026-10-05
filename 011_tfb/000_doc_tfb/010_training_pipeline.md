# Módulo de Flujo: Entrenamiento Convolucional (Baseline)

## Índice

1. [Integración Módulo Dataset](#1-integración-módulo-dataset)
2. [Estructuración Módulo Model](#2-estructuración-módulo-model)
3. [Secuenciación Módulo Train](#3-secuenciación-módulo-train)

---

## 1 Integración Módulo Dataset

- **Módulo**: [dataset.py](../scripts/dataset.py)
- **Función Analítica**: Intermediador algorítmico entre el sistema de almacenamiento periférico y el procesador de cálculo matricial avanzado (GPU).
- **Esquema Secuencial de Ejecución**:
  - Lectura en cascada del directorio físico `dataset/patches/train/` extrayendo el catálogo de tensores geométricos serializados (`.npy`).
  - Segregación estocástica (estableciendo parámetros de rigidez probabilística mediante *seed* matemática) segregando el censo en: 80% como fracción de asimilación activa (Entrenamiento) y 20% como bloque de validación ciega.
  - Ingesta analítica del volumen tridimensional (`X`) seguido por su escalado topológico, ejecutando la conversión paramétrica obligatoria del estándar compacto de archivo (`Float16`) al estándar denso exigido por PyTorch (`Float32`) para prevenir desbordamientos u omisiones fraccionarias durante el *Backpropagation*.
  - Parseado bidimensional de la matriz categórica referencial (`Y`), forzando el tipado nativo `Long` a nivel matriz para su correcto procesamiento por la capa matemática inferencial (`CrossEntropyLoss`).

[←Índice](#índice)

## 2 Estructuración Módulo Model

- **Módulo**: [model.py](../scripts/model.py)
- **Función Analítica**: Parametrización matemática profunda de la arquitectura convolucional neuronal.
- **Esquema Secuencial de Ejecución**:
  - **Topología UNet**: Arquitectura convolucional espacial implementada desde cero (From Scratch).
  - **Eje Codificador (Contracción/Bajada)**: Recepta la dimensionalidad nativa (7 canales híbridos espectrales). Instrumenta reducciones topográficas progresivas con un ratio expansivo en la profundidad paramétrica (estableciendo 1024 canales como matriz densa latente en el umbral crítico/cuello de botella).
  - **Eje Decodificador (Expansión/Subida)**: Estructura la interpolación matricial ascendente hasta recuperar la cuadratura perimetral originaria dictada de entrada (resolución fija a 512x512 celdas espaciales).
  - **Vectores Híbridos (Skip Connections)**: Interconecta directamente flujos iterativos de activación provenientes del eje codificador frente al eje decodificador. Esta adición paramétrica lateral garantiza la preservación exhaustiva de los descriptores de alta frecuencia visual (limitaciones de bordes abruptos hidrometeorológicos y nivales).
  - **Estrato Predictivo Terminal**: Condensa la matriz hiper-profunda del bloque precedente colapsándola paramétricamente frente al vector categórico estructurado sobre 6 Clases Maestras lógicas ("Logits" de inferencia estocástica).

[←Índice](#índice)

## 3 Secuenciación Módulo Train

- **Módulo**: [005_train.py](../scripts/005_train.py)
- **Función Analítica**: Orquestación y control termodinámico matemático del ciclo repetitivo de descenso de gradiente (Epocas/Epochs).
- **Esquema Secuencial de Ejecución**:
  - Direccionamiento logístico forzoso contra un procesador hardware GPU capacitado (en este marco de ejecución: vector `cuda:1`).
  - Creación de los esquemas estructurales en estado latente (Cargadores lógicos iterativos y Topología Convolucional).
  - Instauración de la ecuación de disimetría `CrossEntropyLoss(ignore_index=0)`. Mediante la inyección de este factor mitigante de anulación analítica (`ignore_index=0`), se cancela taxativamente cualquier penalización estadística derivada de la inferencia fallida sobre coordenadas purgadas o exentas de carga reflectiva (*Zonas de Basura*).
  - Instauración del marco estabilizador de optimización de gradientes (`Adam`).
  - Inicialización programática del flujo de iteración profunda, determinando 20 periodos orbitales o épocas sobre la matriz de entrenamiento de forma íntegra.
  - Por cada iteración secuencial completada, el motor computa el diferencial del sesgo inferido, calculando y consolidando matemáticamente el re-ajuste retroactivo general de pesos (`Backpropagation`).
  - Interrupción periódica iterativa para su evaluación paralela frente a la métrica aislada del subconjunto validador. En caso de detectarse optimización objetiva en la tasa de minimización (indicador `Loss` depreciado en contrapunto frente a rondas previas de iteración), el orquestador ordena un volcado automático binario persistente congelando el estadio de la arquitectura a disco físico (`baseline_model.pth` dentro de la carpeta local paramétrica `checkpoints`).

[←Índice](#índice)
