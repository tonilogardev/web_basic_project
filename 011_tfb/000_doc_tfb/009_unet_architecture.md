# Diseño Arquitectónico: Red Neuronal Convolucional (U-Net)

## Índice

1. [Marco Tecnológico de Desarrollo](#1-marco-tecnológico-de-desarrollo)
2. [Estructuración Dimensional (Data Shapes)](#2-estructuración-dimensional-data-shapes)
3. [Implementación From Scratch vs Modelos Preentrenados](#3-implementación-from-scratch-vs-modelos-preentrenados)
4. [Ecuación de Convergencia (Loss Function)](#4-ecuación-de-convergencia-loss-function)
5. [Métricas Estadísticas de Validación](#5-métricas-estadísticas-de-validación)

---

## 1 Marco Tecnológico de Desarrollo

- **Ecosistema**: PyTorch.
- **Justificación Científica**: Representa el estándar bibliográfico consolidado para la ingesta y parametrización de teledetección multiespectral.
- **Paradigma Heurístico (Arquitectura U-Net)**:
  La arquitectura U-Net se encuadra como una Red Neuronal Convolucional (CNN) optimizada para las dinámicas de **segmentación semántica espacial** (*Ronneberger, Fischer & Brox, 2015*). Su capacidad reside no solo en inferir los elementos estocásticos de la escena, sino en predecir la probabilidad condicional de pertenencia a una clase para cada píxel individual. La estructura se fundamenta en su icónica topología matricial dual, soportada por tres motores matemáticos independientes:
  1. **El Codificador (Bloque de Contracción/Encoder)**: Durante la propagación frontal del parche satelital, la arquitectura aplica secuencias de convoluciones acopladas a la reducción espacial agresiva (*Max Pooling*). En este segmento de descenso paramétrico, se produce una contracción de la resolución geográfica de la matriz que compensa una amplificación exponencial del volumen de filtros latentes (profundidad geométrica), lo que facilita el aislamiento paramétrico de las respuestas espectrales de alto nivel. En síntesis, el bloque codificador parametriza la semántica radiométrica (extrayendo las firmas que disocian nieve de nubosidad).
  2. **El Decodificador (Bloque de Expansión/Decoder)**: Ejerce de mecanismo restitutivo de la "U". Extrae la información hipercomprimida del sub-bloque anterior y proyecta un escalado espacial progresivo (*Up-convolutions*) hasta recuperar la resolución de entrada (512x512 píxeles). Su finalidad empírica reside en reconstruir y localizar topológicamente los descriptores en el espacio. En síntesis, el bloque decodificador recupera la referenciación espacial.
  3. **Vectores de Conexión (Skip Connections)**: La ausencia de estos flujos generaría representaciones inferenciales de baja nitidez y acusada difracción. Para subsanarlo, la U-Net integra conexiones intercapa ortogonales, transfiriendo directamente los tensores de alta resolución de las etapas tempranas de convolución hacia los procesos homólogos de subida. Estas conexiones injertan la referenciación de los gradientes espectrales y los contornos milimétricos (e.g., límites nubosos-nivales), garantizando un mapeo reconstructivo ultra-detallado.
  - **Inferencia (Procesado de Output)**: Se inyecta un tensor espacial de **7 canales** de alta dimensionalidad. Tras sortear el embudo arquitectónico, el decodificador genera **5 canales paralelos** estructurados como densidades de probabilidad. Una función de distribución paramétrica final (`Softmax`) evalúa estadísticamente el conjunto de tensores y determina vectorialmente la clase dominante, colapsando el volumen multidimensional hacia una salida plana matricial segmentada en 5 escalas absolutas (0-4).

[←Índice](#índice)

## 2 Estructuración Dimensional (Data Shapes)

- **Vector de Entrada (`X`)**:
  - Topología Estructural: `(N, 7, 512, 512)`
  - 7 Canales Espectrales Híbridos:
    - `B02` (Azul), `B03` (Verde), `B04` (Rojo): Rango visible puro. Proveen la base del análisis de texturas físicas y sombras topográficas.
    - `B08` (NIR - Infrarrojo Cercano): Factor disociativo esencial frente a biomasa vegetal y absorciones hídricas.
    - `B11`, `B12` (SWIR - Infrarrojo de Onda Corta): Longitudes de onda críticas para la separación binaria de nubes (fenómenos de máxima reflectancia SWIR) frente a nieve (procesos de máxima atenuación radiométrica).
    - `NDSI` (Normalized Difference Snow Index): Índice algebraico pre-calculado derivado del cociente normalizado `(B03-B11)/(B03+B11)`. Transfiere directamente a la base heurística pautas relativas al comportamiento físico de la precipitación nival.
  - Dinámica Numérica y Tipado:
    - Formato Estacionario en Disco (`Float16`): Permite una mitigación extrema del almacenamiento periférico y maximiza las tasas de transferencia (I/O).
    - Formato de Ejecución GPU (`Float32`): Durante el proceso de entrenamiento, el descenso del gradiente computa diferenciales fraccionales ínfimos. La utilización de formatos `Float16` en este escenario limitaría severamente la precisión numérica, originando fenómenos de truncamiento (*underflow*) y provocando el colapso integral de las métricas de aprendizaje de la CNN. Por consiguiente, se fuerza operativamente la inflación a `Float32` durante la estancia en memoria de vídeo.

- **Vector de Predicción (`Y_pred`)**:
  - Topología Estructural: `(N, 6, 512, 512)`
  - Distribución Logit sobre la taxonomía de Clases Maestras: 0 (Supresión), 1 (Cobertura Continental), 2 (Entidad Nubosa), 3 (Proyección de Sombra), 4 (Nieve Pura), 5 (Entidad Hídrica).
  - Normalización final vía capa estadística `Softmax` (restringiendo la sumatoria estocástica a 1.0 por ubicación pixel).

[←Índice](#índice)

## 3. Justificación del Entrenamiento From Scratch (Modelos Propios vs Preentrenados)

**Razones determinantes para la implementación aislada (From Scratch) de la arquitectura:**

- **Desarrollo**: Generación endógena de la topología U-Net.
- **Bases Analíticas y de Riesgo Operativo**:
  - **Reestructuración Drástica de Tensores (Incompatibilidad Input)**: Los modelos preentrenados del dominio Sentinel-2 presuponen la inyección integral de la cabecera geométrica del satélite (10 o 13 bandas). La arquitectura diseñada en el presente proyecto implementa una reducción dimensional severa a 7 vectores de información depurada (6 bandas físicas + NDSI). Dicha reducción paramétrica persigue acelerar de manera directa los periodos convectivos, limitando la ocupación extrema de la VRAM. A nivel heurístico, pre-inyectar el cálculo paramétrico explícito del índice nival direcciona los tensores de activación tempranos. Sustituir o amputar la capa tensorial originaria de una red pública corrompería integralmente su estructura de pesos, convirtiendo la ventaja teórica del *Transfer Learning* en inestabilidad matricial crónica.
  - **Rigidez Taxonómica (Incompatibilidad Output)**: Las implementaciones públicas se rigen convencionalmente por salidas binarias restrictivas (Máscara/No-Máscara). La investigación en curso establece como dogma la resolución paramétrica paralela sobre un clúster geográfico compuesto de 6 Clases Maestras, orientadas a disociar la complejidad de sombras pirenaicas, biomasa litoral, nubes oclusivas y estratos acuáticos. Intentar ajustar una arquitectura pre-convergida a un rango taxonómico triplicado exigiría destruir la capa de inferencia nativa, descalibrando las jerarquías internas previas. El diseño endógeno de la capa predictora desde la base asimila intrínsecamente este espectro complejo.
  - **Sesgo Paramétrico y Suficiencia de Muestra (Volumen y Localización)**: El uso de modelos pre-convergidos atiende primordialmente a escasez crítica de datos. Contrapuesto a ello, las dinámicas de Ingeniería de Datos del marco de trabajo han aislado con éxito una biblioteca estadística robusta (con superación de los 8.000 tensores operativos de 512x512) circunscritos a la diversidad climática de Cataluña. La inicialización estocástica basal (*From Scratch*) forzada únicamente contra datos representativos, previene la importación de un "sesgo heurístico residual" (matrices condicionadas para selvas tropicales o planicies árticas), anclando la red neuronal paramétricamente a las latitudes referenciadas de estudio.
  - **Dominancia CNN frente a Algoritmos Empíricos**: Múltiples vertientes científicas (*Wieland, Li & Martinis, 2019*) certifican la dominancia incontestable de enfoques topológicos segmentados CNN por sobre marcos algorítmicos secuenciales paramétricos limitados. El enfoque de base legitima un sistema endógeno con adaptabilidad exponencial.

[←Índice](#índice)

## 4. Ecuación de Convergencia (Loss Function)

- **Núcleo de Coste**: Entropía Cruzada Múltiple (`CrossEntropyLoss`, instrumentada en el módulo [`005_train.py`](../scripts/005_train.py)).
- **Protocolo de Enmascaramiento Paramétrico (`ignore_index`)**:
  - Queda estructurada en código como: `nn.CrossEntropyLoss(ignore_index=0)`.
  - **Fundamento Matemático**: Las capturas ópticas geoespaciales acusan porcentajes dominantes de regiones estructurales vacías (barridos externos de órbita satelital o dominio pelágico descartado). De permitirse su asimilación por la función paramétrica de error, los pesos de convolución entrarían en retroalimentación ruidosa intentando derivar correlaciones falsas o inexistentes a costa de estabilizar vacíos lógicos. La habilitación explícita del parámetro de supresión estadístico `ignore_index=0` previene computar descensos de gradiente o aplicar recompensas paramétricas en dichas coordenadas. Esto maximiza el esfuerzo computacional de la arquitectura neuronal hacia los rangos lógicos del relieve territorial.

[←Índice](#índice)

## 5. Métricas Estadísticas de Validación

- **Métrica Referencial**: `Intersection over Union (IoU)` (Índice o Coeficiente de Jaccard).
- **Justificación de Abandono de Métricas Estáticas Globales (*Overall Accuracy*)**:
  - La ciencia de teledetección espectral afronta de base un desequilibrio categórico de clases severo. Resulta habitual examinar dominios con tasas de cielo raso superiores al 95% y coberturas nivales marginales del 5%. Si la arquitectura convolucional degenera hacia predicciones conservadoras y arroja un mapeo íntegramente rotulado como "Suelo" por defecto (ignorando totalmente las entidades residuales), registraría matemáticamente un Accuracy Global del 95%, proyectando una métrica estadística enormemente engañosa que valida de manera fraudulenta a un modelo estadístico inservible.
  - **Paradigma IoU**: A efectos de eliminar este error estructural, la metodología descarta la precisión global agregada y dictamina la evaluación paramétrica fundamentada en la extracción geométrica del IoU de forma estratificada (ej., validando el IoU del vector de clase nival independientemente). Esta constante determina algorítmicamente la fracción paramétrica del recubrimiento entre el tensor generado (predicción matemática) y el tensor referenciado, castigando drásticamente dinámicas infladas por sub-predicción y sobre-predicción georreferencial, y brindando una escala asertiva de confianza en contextos con datos extremadamente dispares.

[←Índice](#índice)
