# Estrategia Arquitectónica del Modelo de Machine Learning (U-Net)

Este documento centraliza y justifica las decisiones científicas y de arquitectura de datos tomadas para el entrenamiento del modelo de segmentación semántica (Detección de Nubes vs Nieve) sobre imágenes Copernicus Sentinel-2 en Cataluña.

## Índice
- [1. Nivel de Procesamiento: L1C (Top of Atmosphere) vs L2A (Bottom of Atmosphere)](#1-nivel-de-procesamiento-l1c-top-of-atmosphere-vs-l2a-bottom-of-atmosphere)
- [2. Inclusión del Modelo Digital de Elevaciones (DEM)](#2-inclusión-del-modelo-digital-de-elevaciones-dem)
- [3. Descarte de Múltiples Modelos por Órbita (Este "R008" vs Oeste "R051")](#3-descarte-de-múltiples-modelos-por-órbita-este-r008-vs-oeste-r051)
- [4. Descarte de Múltiples Modelos Geográficos (Norte vs Sur)](#4-descarte-de-múltiples-modelos-geográficos-norte-vs-sur)
- [5. Estrategia de Ingesta: Tiling Directo vs Mosaico Previo](#5-estrategia-de-ingesta-tiling-directo-vs-mosaico-previo)
- [6. Composición del Input Tensor (Selección de Bandas)](#6-composición-del-input-tensor-selección-de-bandas)
- [7. Descarte de Imágenes de Referencia (Gránulo Ideal / Multi-temporal)](#7-descarte-de-imágenes-de-referencia-gránulo-ideal--multi-temporal)
- [8. Descarte de Máscaras Vectoriales de Agua (Water Masks Estáticas)](#8-descarte-de-máscaras-vectoriales-de-agua-water-masks-estáticas)
- [9. Excepción Teórica: Viabilidad de la Imagen Ideal a escala de "Tile" Urbano](#9-excepción-teórica-viabilidad-de-la-imagen-ideal-a-escala-de-tile-urbano)
- [10. Bibliografía Científica Base (Core References)](#10-bibliografía-científica-base-core-references)

## 1. Nivel de Procesamiento: L1C (Top of Atmosphere) vs L2A (Bottom of Atmosphere)
**Decisión:** Utilización de imágenes crudas L1C (TOA).
**Justificación:** 
- Las formaciones nubosas se encuentran físicamente en las capas medias y altas de la atmósfera. Aplicar correcciones atmosféricas (L2A) sobre píxeles nubosos carece de rigor físico.
- El algoritmo estándar de la ESA (Sen2Cor) utilizado para la generación de L2A contiene errores tipificados relativos a la confusión entre nieve y nubes. El entrenamiento del modelo mediante L2A implicaría la herencia y propagación de dicho sesgo algorítmico.
- Las imágenes L1C ofrecen una firma espectral pura, permitiendo a la red neuronal (U-Net) extraer características físicas fundamentales.
- **Respaldo Científico:** Esta aproximación representa el estándar metodológico en el estado del arte (por ejemplo, el modelo *s2cloudless* de Synergise o el algoritmo *Fmask*), los cuales operan estrictamente sobre reflectancias L1C para evitar la inyección de sesgos originados en procesadores atmosféricos.

## 2. Inclusión del Modelo Digital de Elevaciones (DEM)
**Decisión:** **Se descarta** el uso del Modelo Digital de Elevaciones (DEM).
**Justificación:**
Inicialmente se contempló la inclusión del DEM fundamentada en los siguientes supuestos teóricos:
- *Cota de Nieve:* La precipitación nival está condicionada por la altitud, proporcionando teóricamente un umbral probabilístico para discriminar nubes (baja altitud) de nieve (alta altitud).
- *Sombras Topográficas:* El bajo ángulo cenital solar invernal proyecta extensas sombras orográficas (confundibles con sombras proyectadas por nubes). Se postuló que la inyección del DEM aportaría contexto topográfico a la red neuronal.

Sin embargo, tras un análisis riguroso de la literatura y pruebas de viabilidad, se procedió a descartar su uso. La información contenida en las bandas SWIR permite resolver la ambigüedad nube/nieve de forma espectral, y los algoritmos referentes del estado del arte prescinden del DEM, evitando la complejidad inherente a la ingeniería de datos altimétricos.

La justificación técnica detallada se encuentra en el documento anexo: [006_DEM_not_DEM.md](006_DEM_not_DEM.md).

## 3. Descarte de Múltiples Modelos por Órbita (Este "R008" vs Oeste "R051")
**Decisión:** **Se descarta** el entrenamiento segmentado por órbita satelital. Se entrenará un **único modelo** unificado.
**Justificación:**
- Las órbitas R008 y R051 corresponden a pasadas temporales diferentes, induciendo variaciones en los ángulos acimutales y de observación (alterando la proyección de las sombras).
- La integración de ambas geometrías en el mismo conjunto de entrenamiento actúa como técnica de *Data Augmentation* intrínseca. Se fuerza a la red a alcanzar la invarianza respecto a la rotación y la iluminación solar, incrementando la robustez del modelo.
- La partición de modelos no aporta valor metodológico; implicaría duplicar la infraestructura de inferencia y penalizaría la capacidad de generalización algorítmica.
- **Respaldo Científico:** En la literatura de *Deep Learning* (e.g., *Goodfellow et al., 2016*), la exposición de las redes convolucionales a alta varianza en la entrada (como variabilidad de ángulos acimutales) constituye una técnica fundamental para lograr la **generalización del modelo** y la invarianza a la iluminación.

## 4. Descarte de Múltiples Modelos Geográficos (Norte vs Sur)
**Decisión:** **Se descarta** el entrenamiento de modelos especializados por región (Pirineos vs. Litoral). Se empleará un **único modelo** apoyado en un Muestreo Estratificado.
**Justificación:**
- El entrenamiento de una red exclusiva para ecosistemas litorales inhibiría el aprendizaje sobre firmas espectrales nivales. Ante un fenómeno meteorológico anómalo (e.g., nevadas costeras) o anomalías reflectantes, la capacidad inferencial del modelo colapsaría.
- La red debe exponerse a la varianza geográfica de forma simultánea en la misma matriz de pesos: zonas septentrionales para la parametrización de nieve extrema y orografía, y zonas meridionales para parametrizar cuerpos de agua y sombras de convección. Su consolidación genera un modelo analítico holístico.
- **Respaldo Científico:** La segmentación geográfica de los datos de entrenamiento genera modelos altamente vulnerables a datos fuera de distribución (*Out-of-Distribution*, OOD). El uso de un único modelo con muestreo estratificado garantiza la **Generalización del Dominio** (*Domain Generalization*).

## 5. Estrategia de Ingesta: Tiling Directo vs Mosaico Previo
**Decisión:** Ejecución de *tiling* (partición en parches de 512x512) directamente sobre la malla nativa de gránulos MGRS. **Se descarta la generación de mosaicos previos al entrenamiento.**
**Justificación:**
- **Prevención OOM (Out of Memory):** La composición de mosaicos regionales genera estructuras matriciales que superan las capacidades de memoria RAM y VRAM convencionales, sin aportar beneficio analítico (al estar destinadas al particionado posterior).
- **Pureza Temporal y Radiométrica:** La unión de gránulos de pasadas temporales distintas genera discontinuidades (*seamlines*) con cambios abruptos de iluminación. La ingesta de estos parches inyectaría ruido espacial sintético en la red neuronal, forzándola a modelar patrones radiométricos inexistentes en la naturaleza.
- **Respaldo Científico:** Las redes neuronales convolucionales (CNN) son altamente sensibles a los gradientes espaciales de alta frecuencia (bordes). Las *seamlines* inyectan sesgos artificiales. La literatura recomienda el procesamiento sobre la cuadrícula de captura original (*sensor grid* o MGRS) para preservar la integridad radiométrica.

## 6. Composición del Input Tensor (Selección de Bandas y Feature Engineering)
**Decisión:** Alimentación de la red con un tensor multicanal que fusiona resolución espacial de alta frecuencia (10m) y caracterización espectral del infrarrojo (20m SWIR), integrando un índice matemático derivado (NDSI). Se descartan variables topográficas.
**Justificación:**
La conformación del *stack* de bandas se fundamenta en principios analíticos y en la herencia de algoritmos referentes (*Fmask*):
- **Bandas SWIR (B11 y B12, 20m):** De inclusión obligatoria. Las coberturas nivales presentan alta absorción de radiación SWIR, frente a la alta reflectancia de las formaciones nubosas. La omisión del rango SWIR anula la capacidad discriminatoria del modelo frente a nubes densas y nieve.
- **Bandas Visibles y NIR (B2, B3, B4, B8, 10m):** Su resolución espacial nativa (10m) permite la detección de nubosidad fragmentada o de escala reducida, no caracterizable a 20m.
- **Índice NDSI (Feature Engineering):** Inclusión de la relación normalizada `(B03 - B11) / (B03 + B11)` precalculada, facilitando a la red las fronteras de decisión nube/nieve.
- **Tensor Final:** El input consiste en matrices espaciales de 512x512x7 (B02, B03, B04, B08, B11, B12 y NDSI). Las bandas de resolución nominal inferior (20m) se resamplean mediante interpolación para garantizar la coherencia matricial de la arquitectura convolucional.

## 7. Descarte de Imágenes de Referencia (Gránulo Ideal / Multi-temporal)
**Decisión:** **Se descarta** la aplicación de metodologías de detección de cambios multitemporales. Se adopta el paradigma analítico **"Single-Image"**.
**Justificación:**
- **Dinámica Nival:** Las coberturas nivales presentan ciclos efímeros. El uso de imágenes de referencia ("clear-sky") atemporales genera falsos positivos por alteración radiométrica frente a nevadas o deshielos.
- **Dinámica Agrícola (Antropogénica):** La intervención agrícola (labranza, inundación, cosecha) produce alteraciones espectrales abruptas. Si la referencia temporal difiere fenológicamente de la imagen objetivo, el modelo clasifica el cambio de cobertura de suelo como anomalía atmosférica.
- **Logística MLOps:** El mantenimiento de una base de datos de referencias históricas ortorrectificadas temporalmente es operativamente ineficiente e introduce riesgos geométricos.
- **Respaldo Científico:** En ecosistemas altamente dinámicos, las estrategias multitemporales incurren en elevadas tasas de falsas alarmas (*False Alarm Rate*) inducidas por cambios en la cobertura terrestre (*Land Cover Change*). Las arquitecturas punteras (e.g., *Fmask*, *s2cloudless*) operan bajo el paradigma *Single-Image*, demostrando que la firma multiespectral instantánea es superior analíticamente.

## 8. Descarte de Máscaras Vectoriales de Agua (Water Masks Estáticas)
**Decisión:** **Se descarta** la inclusión de rasters binarios de cuerpos de agua (Water Masks) como bandas de input auxiliar.
**Justificación:**
- **Asincronía Topológica:** Las entidades hidrológicas sufren contracciones y expansiones temporales (e.g., periodos de sequía). La inyección de metadatos hidrológicos estáticos sobre superficies temporalmente áridas introduce ruido de etiquetado (*Label Noise*), provocando que la red asocie valores radiométricos de suelo árido a la clase hídrica.
- **Suficiencia Radiométrica:** Las masas de agua absorben la casi totalidad de la radiación NIR y SWIR. La red convolucional es capaz de abstraer máscaras de agua intrínsecas a partir del tensor espectral.
- **Conciencia del Contexto Espacial:** Frente al procesamiento basado en umbrales píxel a píxel, la arquitectura U-Net evalúa el contexto espacial (texturas y geometrías poligonales). Esto permite discriminar los efectos de reflectancia especular (sunglint) en cuerpos de agua superficiales o arrozales de verdaderas formaciones nubosas convectivas.
- **Respaldo Científico:** La inyección de máscaras temporales en arquitecturas espaciales conlleva problemas severos de Redundancia de Características (*Feature Redundancy*), degradando el rendimiento general. La Separabilidad Espectral (*Spectral Separability*) del agua en las bandas infrarrojas es suficiente para la segmentación directa.

## 9. Excepción Teórica: Viabilidad de la Imagen Ideal a escala de "Tile" Urbano
**Propuesta:** Se plantea un uso condicional del gránulo ideal limitado estrictamente a entornos urbanos, procesados a escala local (tiles de 512x512).
**Justificación:**
- **Estabilidad Radiométrica Urbana:** A diferencia de las clases agrícolas o naturales, las superficies antropogénicas consolidadas (tejidos urbanos, infraestructuras de transporte) mantienen una firma espectral inalterable a lo largo del tiempo.
- **Tiling Urbano Homogéneo:** Mientras que el análisis multitemporal a escala de gránulo (100x100 km) es inviable debido a la heterogeneidad de coberturas, los sectores locales de 5.12x5.12 km permiten identificar celdas espacialmente homogéneas y estables.
- **Modelo Híbrido Condicional:** Una arquitectura avanzada contemplaría la inyección de canales de referencia "clear-sky" únicamente bajo la condición de operar en un dominio espacial caracterizado previamente como tejido urbano, logrando mitigar los falsos positivos derivados de cubiertas de alta reflectancia.
- **Limitación de Alcance (TFB):** La implementación de esta solución requiere el desarrollo paralelo de un modelo de Clasificación de Cobertura de Suelo (*Land Use Classification*) para la segregación inicial de cuadrículas, lo cual excede el alcance del presente trabajo. Esta propuesta se consolida como línea de **Investigación Futura** en entornos de monitorización de cambios LULC.

## 10. Bibliografía Científica Base (Core References)

1. **Limitaciones de Sen2Cor y Necesidad de Edición y Clasificación Manual (Ground Truth)**
   > Baetens, L., Desjardins, C., & Hagolle, O. (2019). Validation of Copernicus Sentinel-2 Cloud Masks Obtained from MAJA, Sen2Cor, and FMask Processors Using Reference Cloud Masks Generated with a Supervised Active Learning Procedure. *Remote Sensing, 11*(4), 433. https://doi.org/10.3390/rs11040433

2. **La Física Óptica de Nubes y Nieve (Bandas SWIR)**
   > Hollstein, A., Segl, K., Guanter, L., Kneubühler, M., & Legleiter, C. (2016). Ready-to-Use Methods for the Detection of Clouds, Cirrus, Snow, Shadow, Water and Clear Sky Pixels in Sentinel-2 MSI Images. *Remote Sensing, 8*(8), 666. https://doi.org/10.3390/rs8080666

3. **Arquitectura Base (U-Net) y Superioridad de las CNN en Teledetección**
   > Ronneberger, O., Fischer, P., & Brox, T. (2015). U-Net: Convolutional Networks for Biomedical Image Segmentation. *Medical Image Computing and Computer-Assisted Intervention – MICCAI 2015*, 234–241. https://doi.org/10.1007/978-3-319-24574-4_28
   
   > Wieland, M., Li, Y., & Martinis, S. (2019). Multi-sensor cloud and cloud shadow segmentation with a convolutional neural network. *Remote Sensing of Environment, 230*, 111203. https://doi.org/10.1016/j.rse.2019.05.022

4. **Fuentes de Datos Oficiales (Satélite y Topografía)**
   > European Space Agency [ESA]. (2026). *Copernicus Open Access Hub - Sentinel-2 Data Access*. Recuperado el 25 de junio de 2026, de https://scihub.copernicus.eu/
   
   > Institut Cartogràfic i Geològic de Catalunya [ICGC]. (2026). *Models d'Elevacions del Terreny de Catalunya*. Recuperado el 25 de junio de 2026, de https://www.icgc.cat/
