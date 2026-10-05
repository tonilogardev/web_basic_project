# Definición del Dataset (Copernicus Sentinel-2 L1C)

Este documento establece la volumetría y los criterios de selección para el conjunto de datos referencial utilizado para entrenar y evaluar la arquitectura de red neuronal U-Net.

## Índice
- [1. Volumetría Global (Enfoque Metodológico)](#1-volumetría-global-enfoque-metodológico)
- [2. Partición del Dataset (Train vs Test)](#2-partición-del-dataset-train-vs-test)
  - [2.1. Conjunto de Entrenamiento y Validación (Train/Val) - 30 Gránulos](#21-conjunto-de-entrenamiento-y-validación-trainval---30-gránulos)
  - [2.2. Conjunto de Test (Blind Test) - 10 Gránulos](#22-conjunto-de-test-blind-test---10-gránulos)
- [3. Particionado Espacial (Tiling)](#3-particionado-espacial-tiling)

## 1. Volumetría Global (Enfoque Metodológico)
Se desestima el uso de técnicas de descarga masiva e indiscriminada de imágenes. El diseño y entrenamiento de arquitecturas de segmentación profunda (Deep Learning) se beneficia en mayor medida del uso de conjuntos de datos de dimensiones reducidas pero con alta representatividad estadística y curación analítica (priorizando escenarios geográficos y atmosféricos complejos), evitando la redundancia observacional.

**Volumetría Acotada:** **40 Gránulos** en total (aproximadamente 40 GB de datos satelitales L1C).

## 2. Partición del Dataset (Train vs Test)

### 2.1. Conjunto de Entrenamiento y Validación (Train/Val) - 30 Gránulos
El ajuste paramétrico de los pesos de la red neuronal se basa en este bloque de 30 gránulos. Su selección se ha estratificado para garantizar que la red aprenda la distribución completa de variabilidad del problema:
- **Variabilidad Estacional:** 
  - 15 gránulos de periodo invernal (presencia de cobertura nival, bajo ángulo de elevación solar, sombras orográficas extensas y nubosidad superpuesta).
  - 15 gránulos de periodo estival/primaveral (ausencia de nieve, nubosidad convectiva, presencia de cirros y variabilidad fenológica agrícola).
- **Variabilidad Orbital:** Selección equilibrada entre órbitas satelitales (R008 Este y R051 Oeste) para dotar al modelo de invarianza geométrica frente a las distintas posiciones y ángulos de iluminación.
- **Variabilidad Geográfica:** Inclusión de cuadrículas de alta criticidad, como las regiones pirenaicas (e.g., T31TCH/T31TDE), entornos deltaicos o masas hídricas (e.g., T31TDF - Delta del Ebro) y entornos metropolitanos para parametrizar superficies de estabilidad espectral (e.g., Barcelona).

### 2.2. Conjunto de Test (Blind Test) - 10 Gránulos
El bloque de evaluación se mantiene en estricto aislamiento durante la totalidad del ciclo de entrenamiento, impidiendo el cruce de datos (*Data Leakage*).
Estos datos se reservan exclusivamente para la etapa de inferencia final, permitiendo obtener el cálculo de las métricas de rendimiento (IoU, F1-Score). Este aislamiento garantiza empíricamente que la red posee capacidad de generalización sobre morfologías geográficas no analizadas previamente.
- 5 gránulos de invierno (Nieve extrema).
- 5 gránulos de verano.

## 3. Particionado Espacial (Tiling)
Las dimensiones originales de las capturas (10980x10980 píxeles a 10m de resolución) superan las capacidades de procesamiento en VRAM. Por ello, se implementa un esquema de pre-procesamiento espacial:

1. **Partición Estructural:** Cada gránulo es subdividido matemáticamente en matrices cuadradas (*tiles*) de **512x512 píxeles**. Teóricamente, cada gránulo genera 441 celdas completas.
2. **Volumen Bruto Estimado:** 40 gránulos × 441 parches = ~17.640 celdas totales.
3. **Filtrado Analítico (Hard Negative Mining):** Dada la alta presencia de datos sin valor probabilístico, se descartan de forma automatizada:
   - Celdas que presentan cobertura total de mar despejado.
   - Celdas que presentan nucleos convectivos 100% densos (su ausencia de bordes induce un sesgo estadístico que compromete el aprendizaje del algoritmo).
   Se retienen de forma exclusiva aquellos cuadrantes sujetos a la metodología de *Hard Negative Mining*: parches que evidencian bordes nubosos difusos, interacciones complejas nube/nieve/sombras, sombras orográficas prominentes y áreas urbanas altamente reflectantes.
4. **Volumen Neto (Input de Entrenamiento):** Se estima una reducción del conjunto bruto hasta obtener un volumen final operativo situado entre **2.500 y 3.500 parches de 512x512 píxeles**.

**Conclusión:** El volumen operativo de aproximadamente 3.000 tensores de 512x512 (con 7 canales espectrales de profundidad) representa un estado de equilibrio óptimo metodológico para entrenar la red U-Net. Esta volumetría previene riesgos de sobreajuste masivo (*overfitting*), permite la ejecución de ciclos iterativos de entrenamiento en periodos de tiempo razonables y es eficiente en términos de infraestructura de almacenamiento.
