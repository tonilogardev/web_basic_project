# Definición del Dataset (Copernicus Sentinel-2 L1C)

Este documento establece la volumetría y los criterios de selección para el "Golden Dataset" que se utilizará para entrenar y evaluar la red neuronal U-Net.

## Índice
- [1. Volumetría Global (El Mito del Big Data)](#1-volumetría-global-el-mito-del-big-data)
- [2. Partición del Dataset (Train vs Test)](#2-partición-del-dataset-train-vs-test)
  - [2.1. Conjunto de Entrenamiento y Validación (Train/Val) - 30 Gránulos](#21-conjunto-de-entrenamiento-y-validación-trainval---30-gránulos)
  - [2.2. Conjunto de Test (Blind Test) - 10 Gránulos](#22-conjunto-de-test-blind-test---10-gránulos)
- [3. Del Gránulo al Parche (Tiling)](#3-del-gránulo-al-parche-tiling)

## 1. Volumetría Global (El Mito del Big Data)
No es necesario ni recomendable descargar miles de imágenes. Las arquitecturas de segmentación profunda (Deep Learning) aprenden mejor de un conjunto de datos pequeño pero altamente curado, diverso y representativo (los "casos difíciles") que de un conjunto masivo pero redundante.

**Total de Gránulos a Descargar:** **40 Gránulos** (aprox. 40 GB de datos L1C en bruto).

## 2. Partición del Dataset (Train vs Test)

### 2.1. Conjunto de Entrenamiento y Validación (Train/Val) - 30 Gránulos
Estos 30 gránulos se utilizarán para ajustar los pesos de la red neuronal. Deben estar estratégicamente seleccionados a mano para forzar a la red a aprender:
- **Distribución Estacional:** 
  - 15 gránulos de Invierno (con abundante nieve en el Pirineo, sol bajo, sombras largas y nubes superpuestas).
  - 15 gránulos de Verano/Primavera (sin nieve, con nubes convectivas, cirros finos y cultivos cambiando de color).
- **Distribución Orbital:** Mezclados equitativamente entre las órbitas R008 (Este) y R051 (Oeste) para enseñar a la red a ser invariante a la geometría de iluminación solar.
- **Distribución Geográfica:** Que incluyan los gránulos más críticos: T31TCH/T31TDE (Pirineo puro), T31TDF (Delta del Ebro / Mar oscuro profundo), y el área metropolitana de Barcelona (Estabilidad espectral).

### 2.2. Conjunto de Test (Blind Test) - 10 Gránulos
Estos 10 gránulos se mantendrán estrictamente **ocultos** a la red durante todo el proceso de entrenamiento. 
Solo se usarán el día final para inferir las máscaras y calcular las métricas objetivas (IoU, F1-Score) que se presentarán al tribunal del TFB. Esto garantiza científicamente que la red no ha memorizado el relieve, sino que sabe generalizar a imágenes que jamás ha visto.
- 5 gránulos de invierno (Nieve extrema).
- 5 gránulos de verano.

## 3. Del Gránulo al Parche (Tiling)
Las redes neuronales de segmentación no pueden procesar imágenes completas de 10980x10980 píxeles en memoria de GPU. El flujo de pre-procesamiento será:

1. **Troceado:** Cada uno de los 40 gránulos se recortará matemáticamente en parches (tiles) de **512x512 píxeles**. Un gránulo produce teóricamente unos 441 parches completos.
2. **Volumen Teórico Inicial:** 40 gránulos × 441 parches = ~17.640 parches en total.
3. **Curación (Filtrado Inteligente):** Gran parte de esos parches aportan nulo valor científico. Se descartarán por software:
   - Parches que sean 100% mar despejado (no enseñan nada nuevo tras ver el primero).
   - Parches que sean 100% núcleo sólido de nube densa (son demasiado fáciles y sesgan la red).
   Nos quedaremos exclusivamente con el "Hard Negative Mining": parches que contengan bordes sutiles de nubes, mezclas de nieve/nube/sombra, sombras topográficas pirenaicas y zonas urbanas brillantes.
4. **Volumen Final (Input Real de la U-Net):** Se estima destilar el conjunto hasta obtener un dataset final de entre **2.500 y 3.500 parches de 512x512**. 

**Conclusión:** Un volumen de 3.000 parches de 512x512 con 7 canales de profundidad es el *Sweet Spot* (punto óptimo) para entrenar una U-Net desde cero. Permite una convergencia rápida, evita el sobreajuste (overfitting) masivo, es manejable en un disco SSD estándar y permite realizar iteraciones de entrenamiento en tiempos razonables (horas, no semanas).
