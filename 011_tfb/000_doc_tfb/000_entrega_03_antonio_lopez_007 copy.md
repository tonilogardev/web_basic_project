<div style="text-align: center; margin-top: 150px; margin-bottom: 50px;">
    <img src="img/logo-sello-universitat-carlemany.png.webp" alt="Logo Universitat Carlemany" width="300" />
</div>

<br><br>

<h1 align="center" style="font-size: 3em; margin-bottom: 10px;">Trabajo Final de Grado (TFB)</h1>
<h2 align="center" style="color: #FFC000; font-size: 2em; margin-bottom: 50px;">Desarrollar un entorno escalable (pipeline geoespacial) para imágenes Sentinel-2, diseñado para integrar y ejecutar un modelo de Machine Learning</h2>

<br><br><br>

<div align="center" style="font-size: 1.5em; line-height: 1.8;">
  <strong>Autor:</strong> Antonio López<br>
  <strong>Fase:</strong> Entrega 3: ENTREGA COMPLETA DEL TFT (100% del avance)<br>
  <strong>Fecha:</strong> 31/08/2026 - 06/09/2026
</div>

<br><br><br><br><br>

<div align="center" style="font-size: 1.2em;">
  <strong>Página web del proyecto:</strong> <a href="https://tonilogar.github.io/tfb/tfb.html">tonilogar.github.io/tfb</a><br>
  <strong>Repositorio y control de versiones:</strong> <a href="https://github.com/tonilogardev/web_basic_project/tree/main_dev_pro_tfb/011_tfb">GitHub - Master Roadmap</a>
</div>

<div style="page-break-after: always;"></div>

## Resumen con palabras clave

El presente Trabajo Final de Bàtxelor (TFB) tiene como objetivo principal el desarrollo de una infraestructura Web GIS escalable y diseñada para procesar datos satelitales del programa Copernicus para permitir la integración de **cualquier modelo de *Machine Learning***. Para validar empíricamente esta arquitectura desacoplada, se aborda como caso de estudio práctico:la clasificación errónea de pixeles por parte del algoritmo estándar Sen2Cor en zonas de Cataluña. Como solución a esta deficiencia, se ha implementado y ejecutado un modelo de aprendizaje profundo (*Deep Learning*) utilizando la red neuronal convolucional U-Net. La orquestación abarca la descarga automatizada de gránulos Sentinel-2, la edición y clasificación manual de máscaras mediante GIMP para el entrenamiento, y el diseño del propio modelo. El resultado se desplegará en una infraestructura *WEB GIS*, demostrando que esta arquitectura modular sirve de base para resolver distintas problemáticas geoespaciales de Observación de la Tierra.

**Palabras clave:** *Deep Learning, Sentinel-2, Segmentación Semántica, U-Net, Observación de la Tierra, Copernicus.*

<br><br>

## Abstract

This Bachelor's Final Project (TFB) aims primarily to develop a scalable Web GIS infrastructure designed to process satellite data from the Copernicus program to allow the integration of **any *Machine Learning* model**. To empirically validate this decoupled architecture, a practical case study is addressed: the misclassification of pixels by the standard Sen2Cor algorithm in areas of Catalonia. As a solution to this deficiency, a deep learning model has been implemented and executed using the U-Net convolutional neural network. The orchestration encompasses the automated download of Sentinel-2 granules, the manual editing and classification of masks via GIMP for training, and the design of the model itself. The result will be deployed in a *WEB GIS* infrastructure, demonstrating that this modular architecture serves as a foundation for solving diverse Earth Observation geospatial challenges.

**Keywords:** *Deep Learning, Sentinel-2, Semantic Segmentation, U-Net, Earth Observation, Copernicus.*

<br><br>

<div style="page-break-after: always;"></div>

## Índice interactivo

- [Glosario de Términos](#glosario-de-términos)
- [1. Introducción](#1-introducción)
- [2. Justificación](#2-justificación)
- [3. Contextualización clasificación de píxeles](#3-contextualización-clasificación-de-píxeles)
- [4. Objetivos generales y específicos](#4-objetivos-generales-y-específicos)
  - [4.1. Objetivo general](#41-objetivo-general)
  - [4.2. Objetivos específicos](#42-objetivos-específicos)
- [5. Marco teórico y conceptos clave](#5-marco-teórico-y-conceptos-clave)
  - [5.1. Datos espaciales: Sentinel-2 y el espectro electromagnético](#51-datos-espaciales-sentinel-2-y-el-espectro-electromagnético)
  - [5.2. Estrategia de Datos y Decisiones Arquitectónicas](#53-estrategia-de-datos-y-decisiones-arquitectónicas)
  - [5.3. Bibliografía Científica Base (Core References)](#54-bibliografía-científica-base-core-references)
- [6. Metodología aplicada](#6-metodología-aplicada)
  - [6.1. Instrumentos](#61-instrumentos)
  - [6.2. Materiales (Conjunto de datos)](#62-materiales-conjunto-de-datos)
  - [6.3. Secuencia Metodológica (Pipeline ETL)](#63-secuencia-metodológica-pipeline-etl)
  - [6.4. Metodología de Evaluación](#64-metodología-de-evaluación)
- [7. Desarrollo viable y sostenible](#7-desarrollo-viable-y-sostenible)
  - [7.1. Temporalización e hitos](#71-temporalización-e-hitos)
  - [7.2. Alineación con los ODS y Códigos UNESCO](#72-alineación-con-los-ods-y-códigos-unesco)
  - [7.3. Condicionantes ambientales, sociales y económicos](#73-condicionantes-ambientales-sociales-y-económicos)
- [8. Proceso y resultados](#8-proceso-y-resultados)
  - [8.1. Cronología de Pivotes Arquitectónicos](#81-cronología-de-pivotes-arquitectónicos)
  - [8.2. Resultados Finales de la Evaluación](#82-resultados-finales-de-la-evaluación)
- [9. Discusión y limitaciones](#9-discusión-y-limitaciones)
- [10. Conclusiones y líneas futuras](#10-conclusiones-y-líneas-futuras)
- [11. Referencias Bibliográficas](#11-referencias-bibliográficas)

<div style="page-break-after: always;"></div>

## Glosario de Términos

Para facilitar la lectura a evaluadores y personas no especialistas en Sistemas de Información Geográfica (GIS) se definen los siguientes términos clave utilizados en este documento:

- **Sentinel-2:** Misión de satélites ópticos de alta resolución de la constelación copernicus.
- **Sen2Cor:** Software de la Agencia Espacial Europea (ESA) para la corrección atmosférica (incluye un detector de nubes básico que este proyecto pretende mejorar).
- **Tiling:** Técnica geoespacial que consiste en "trocear" imágenes satelitales gigantes en cuadrados más pequeños para que el ordenador pueda procesarlos sin saturar la memoria RAM.
- **OOM:** *Out of Memory* (Fuera de memoria). Colapso del ordenador por intentar cargar demasiados datos gráficos a la vez.
- **COG:** *Cloud Optimized GeoTIFF*. Formato de imagen satelital optimizado para ser consultado y procesado de forma rápida y directa en la nube.
- **PMTiles:** Formato de archivo de mapa diseñado para almacenar teselas geoespaciales en la nube de forma estática, optimizando la velocidad y coste del servidor.
- **gpkg:** *GeoPackage*. Formato de base de datos geoespacial open source.
- **shp:** *Shapefile*. Formato de archivo informático vectorial clásico y muy extendido para almacenar sistemas de información geográfica.
- **On the fly:** Procesamiento o renderizado en tiempo real. Siendo ejecutado dinámicamente por el backend sin necesidad de procesarlo en el servidor de la herramienta.
- **ESA:** *European Space Agency* (Agencia Espacial Europea).
- **ACA:** Agencia Catalana del Agua.
- **ICGC:** Instituto Cartográfico y Geológico de Cataluña.
- **DEM:** *Digital Elevation Model* (Modelo Digital de Elevaciones). Representación en 3D del relieve terrestre.
- **U-Net:** Arquitectura de red neuronal convolucional diseñada para la segmentación semántica de imágenes (asignación de clases píxel a píxel).
- **Ground Truth:** (Verdad Terreno). El patrón o mapa de referencia perfecto que se usa para entrenar al modelo de *Machine Learning*. En este proyecto se ha construido y auditado manualmente.
- **L1C / L2A:** Niveles de procesamiento de imágenes satelitales. L1C es la imagen "cruda" tal cual llega del espacio, y L2A es la imagen tras aplicarle correcciones atmosféricas algorítmicas.
- **IoU:** *(Intersection over Union)*. Métrica matemática utilizada en *Machine Learning* para evaluar el porcentaje exacto de acierto espacial al predecir la forma de un objeto.
- **Recall:** (Exhaustividad). Métrica estadística que mide la capacidad del modelo predictivo para encontrar y señalar todas las nubes reales que existen en la imagen sin dejarse ninguna.
- **VRAM:** Memoria de acceso aleatorio de vídeo. Es la memoria exclusiva de las tarjetas gráficas (GPUs), la cual se colapsa al cargar imágenes espaciales inmensas si no se emplea el Tiling.
- **NDSI:** *(Normalized Difference Snow Index)*. Índice matemático adicional que resalta la reflectancia de la nieve frente a las nubes altas basándose en la luz infrarroja.

<div style="page-break-after: always;"></div>

# 1. Introducción

El programa Copernicus, de la Agencia Espacial Europea (ESA) y la Unión Europea, representa actualmente uno de los mayores esfuerzos tecnológicos para la observación de la Tierra. Sentinel-2 es una misión compuesta por dos satélites gemelos (Sentinel-2A y Sentinel-2B) que proporcionan imágenes ópticas multiespectrales de alta resolución. Los satélites capturan información en 13 bandas espectrales que abarcan desde el espectro visible (RGB) hasta el infrarrojo cercano (NIR) y de onda corta (SWIR). Su resolución espacial es altamente detallada, alcanzando los 10 metros por píxel en las bandas principales, 20 metros en las bandas infrarrojas y 60 metros para correcciones atmosféricas. Además, gracias al desfase orbital de sus dos satélites, ofrece una resolución temporal de 5 días. Los datos que estos satélites envían son fundamentales para la observación de la Tierra, lo que permite el seguimiento continuo de fenómenos globales, como el control de la agricultura de precisión, la predicción, detección y prevención de desastres naturales, entre otros.

Uno de los productos derivados de estas observaciones es el mapa de clasificación de píxeles (producto SCL), generado mediante el procesador estándar de la ESA (Sen2Cor). Sin embargo, dada la heterogeneidad de la superficie terrestre, este algoritmo presenta deficiencias y fallos al enfrentarse a geografías complejas. Para solucionar esta limitación, el presente proyecto propone el desarrollo de un modelo predictivo de Aprendizaje Profundo (Deep Learning), para el territorio de Cataluña, capaz de interpretar el contexto espacial y garantizar una segmentación semántica de alta precisión.

**Leyenda producto SCL:**

- **0**: Sin datos (*No Data*)
- **1**: Píxeles saturados o defectuosos
- **2**: Áreas oscuras
- **3**: Sombras de nubes
- **4**: Vegetación
- **5**: Suelo desnudo (no vegetado)
- **6**: Agua
- **7**: Sin clasificar
- **8**: Nubes de probabilidad media
- **9**: Nubes de alta probabilidad
- **10**: Cirros finos
- **11**: Nieve o hielo

# 2. Justificación

2. Justificación
A pesar de que el algoritmo Sen2Cor es el estándar global para la generación de máscaras SCL, su enfoque metodológico presenta una debilidad estructural fundamental: opera basándose en árboles de decisión empíricos y umbrales radiométricos fijos que evalúan la imagen de forma aislada, píxel a píxel. Esta "ceguera espacial" le impide interpretar el contexto, provocando que elementos con firmas espectrales similares se confundan sistemáticamente cuando se enfrentan a ecosistemas geográficamente heterogéneos.

En el caso específico de Cataluña, esta limitación algorítmica se traduce en tres anomalías críticas que comprometen la integridad de los datos satelitales: en primer lugar, la ambigüedad espectral en los Pirineos, donde la alta reflectancia de la nieve se confunde recurrentemente con nubes gruesas; en segundo lugar, la generación de falsos positivos al catalogar las sombras topográficas del relieve escarpado como sombras de nubes; y finalmente, los errores de absorción en superficies hídricas, donde zonas como los arrozales inundados del Delta del Ebro o el mar profundo desestabilizan las predicciones del procesador estándar.

Pero el aprendizaje profundo (Deep Learning) ofrece una solución. A diferencia de las heurísticas tradicionales, las Redes Neuronales Convolucionales (CNN) poseen la capacidad de asimilar el contexto espacial, las texturas y la morfología del entorno. Esto permite a la Inteligencia Artificial diferenciar una nube de una cumbre nevada basándose no solo en su brillo individual, sino en su geometría y su relación con el territorio físico subyacente.

La correcta monitorización de las coberturas terrestres mediante satélites es un pilar fundamental para la toma de decisiones estratégicas, desde la gestión de recursos hídricos frente a sequías —vital para organismos territoriales como el Institut Cartogràfic i Geològic de Catalunya (ICGC)— hasta el monitoreo de la masa forestal. Depender de mapas espaciales defectuosos genera decisiones analíticas tardías y perjudiciales. Por consiguiente, este Trabajo Final de Bàtxelor se justifica por la necesidad de superar las limitaciones matemáticas de los algoritmos clásicos.

# 3. Contextualización del problema (El límite de Sen2Cor)

Para comprender el alcance del reto técnico, es necesario analizar dónde colapsa la precisión del estándar europeo Sen2Cor. Al depender de árboles de decisión estáticos y umbrales radiométricos rígidos, la algoritmia clásica muestra deficiencias críticas en ecosistemas geográficamente heterogéneos como Cataluña, dando lugar a tres anomalías de clasificación principales que este proyecto pretende erradicar:

1. **Ambigüedad espectral de la Nieve:** Sen2Cor confunde frecuentemente la firma espectral altamente reflectiva de la nieve de alta montaña (Pirineos) con los frentes de nubes gruesas.
2. **Falsos positivos por Sombras Topográficas:** El algoritmo europeo carece de percepción orográfica profunda, por lo que a menudo clasifica la sombra oscura natural que proyecta un relieve escarpado como si fuera la sombra proyectada por una nube, llenando los valles de falsas nubes.
3. **Anomalías hídricas (El Delta del Ebro):** Las grandes masas de agua profunda son diagnosticadas erróneamente como sombras, mientras que los terrenos con alta saturación hídrica (arrozales inundados) generan destellos especulares (*Sun Glint*) que ciegan al algoritmo, induciéndole a predecir densos bancos de nubes inexistentes.

# 4. Objetivos generales y específicos

## 4.1. Objetivo general

El propósito de este proyecto es construir una arquitectura base que, siendo agnóstica al proveedor de infraestructura, permita la integración modular de modelos de Deep Learning y sus inferencias a una herramienta WEB GIS.

Para validar empíricamente la viabilidad de este sistema, se presenta como caso de estudio la integración de una red neuronal U-Net específica para la detección de nubes sobre Cataluña. Esto demuestra la capacidad del pipeline para orquestar flujos de datos complejos e ilustra su escalabilidad futura para integrar otros modelos que resuelvan distintas problemáticas territoriales.

## 4.2. Objetivos específicos

Para alcanzar este fin global, el proyecto se disgrega en los siguientes hitos operativos medibles:

1. **Construir una infraestructura de datos replicable (Pipeline ETL):** Desarrollar un flujo automatizado de extracción, transformación y carga (ETL) que abarque: la descarga de datos satelitales (Nivel L1C y L2A) y la extracción de las máscaras de clasificación SCL generadas por Sen2Cor. Edición y clasificación manual de dichas máscaras para construir una Verdad Terrestre (Ground Truth) rigurosa, indispensable para el entrenamiento supervisado del modelo con datos de alta calidad.  

2. **Entrenar y evaluar una arquitectura U-Net:** Diseñar, entrenar y validar una red neuronal convolucional orientada específicamente a la segmentación semántica de nubes en la región de Cataluña, acotando el espacio de trabajo a las órbitas relativas R008 y R051 del satélite Sentinel-2.

3. **Superar métricamente a Sen2Cor:** Mitigar las anomalías de clasificación diagnosticadas (ambigüedad espectral de la nieve, falsos positivos por sombras topográficas y errores de absorción en masas hídricas). Para ello, se realizará un análisis comparativo evaluando métricas técnicas rigurosas (como Recall e Intersection over Union - IoU) entre tres fuentes:
**1**: Imágenes de clasificación de píxeles bajadas del servidor de la ESA y generadas por Sen2Cor.  
**2**: Imágenes de clasificación de píxeles generadas por la U-Net con nuestro entrenamiento.  
**3**: Imágenes de clasificación de píxeles editadas y clasificadas manualmente con GIMP.   
El objetivo es demostrar empíricamente la superioridad de la IA frente al algoritmo oficial de la ESA.  

4. **Desarrollar la plataforma Web GIS:** Construir la infraestructura tecnológica web gis necesaria en un servidor web. Trabajar con librerías geoespaciales (MapLibre GL JS y Svelte) para la visualización fluida de cartografía bidimensional (2D), y servir las inferencias generadas por el modelo en formatos optimizados para la nube (como Cloud Optimized GeoTIFF o PMTiles), demostrando la viabilidad de su integración y consumo de datos en entornos web.


# 5. Marco teórico y conceptos clave

Para comprender la solución tecnológica propuesta, es necesario asentar brevemente los pilares científicos sobre los que se sustenta la arquitectura del proyecto.

## 5.1. Datos espaciales: Sentinel-2 y el espectro electromagnético

Para optimizar la capacidad de discriminación del modelo de inteligencia artificial, no se procesa una composición RGB tradicional, sino que se alimenta a la red con un tensor multiespectral estructurado en 7 canales simultáneos:

- **Espectro visible (Bandas 2, 3 y 4):** Azul, verde y rojo. Capturan las texturas físicas, los verdaderos colores de las cubiertas terrestres y las sombras topográficas.  
- **Infrarrojo Cercano o NIR (Banda 8):** Crítico para identificar la vegetación (caracterizada por una alta reflectancia en el NIR) y los cuerpos de agua (que absorben intensamente esta radiación, presentando firmas espectrales muy oscuras).  
- **Infrarrojo de Onda Corta o SWIR (Bandas 11 y 12):** Fundamental para resolver la ambigüedad espectral de la nieve. Físicamente, las nubes presentan alta reflectancia en el SWIR, mientras que la nieve lo absorbe fuertemente, permitiendo su separación matemática.  
- **NDSI (*Normalized Difference Snow Index*):** Un índice matemático pre-calculado derivado de las bandas Verde y SWIR. Funciona como un canal adicional que inyecta conocimiento físico explícito sobre el comportamiento de la nieve directamente a la red neuronal, facilitando la convergencia del modelo.  

## 5.2. Inteligencia Artificial: La Arquitectura U-Net

Los algoritmos paramétricos tradicionales evalúan el terreno píxel a píxel sin interpretar su vecindario, este proyecto fundamenta su avance técnico en el **Aprendizaje Profundo (*Deep Learning*)**, concretamente en el campo de la **Visión Artificial (*Computer Vision*)**. La arquitectura convolucional elegida es la **U-Net**, implementada desde cero (*From Scratch*) utilizando el *framework* **PyTorch**, el estándar actual de la industria y la investigación científica para el desarrollo y entrenamiento de tensores en Inteligencia Artificial.

### 5.2.1. Teoría de Funcionamiento
La arquitectura U-Net (Ronneberger, Fischer y Brox, 2015) es uno de los modelos de Inteligencia Artificial más consolidados para la **segmentación semántica espacial**. Esto significa que la red no se conforma con decir "en esta imagen hay nubes", sino que analiza y decide a qué clase pertenece cada píxel de forma individual, dibujando sus contornos exactos. Su nombre proviene de su estructura matemática en forma de "U", la cual consta de tres mecanismos muy intuitivos:     

1. **El Encoder (Ruta de Compresión o Bajada):** A medida que la imagen satelital entra en la red, el modelo le aplica filtros matemáticos y va reduciendo su tamaño progresivamente, como si alejáramos la vista para ver el panorama general. En este proceso, la imagen pierde resolución (pierde detalle en los bordes), pero la red gana comprensión de los patrones generales y texturas. Conceptualmente, el Encoder aprende a identificar el **"QUÉ"** (comprende las características abstractas que diferencian las nubes de las masas de nieve y de las sombras).  

2. **El Decoder (Ruta de Expansión o Subida):** Es la segunda mitad del proceso. Toma esa información abstracta y altamente comprimida, y la vuelve a ampliar progresivamente hasta recuperar el tamaño original de la imagen (por ejemplo, 512x512 píxeles). Su objetivo es proyectar lo aprendido de nuevo sobre el terreno real; es decir, el Decoder determina el **"DÓNDE"** (la ubicación geográfica de esas nubes o nieve).  

3. **Las Skip Connections (Los puentes de detalle):** Existe un problema técnico: al comprimir tanto la imagen en el primer paso y luego expandirla, el resultado final tendería a ser borroso y los bordes quedarían imprecisos. Para evitarlo, la U-Net establece "puentes directos" que conectan las capas iniciales (antes de perder resolución) con las capas finales de reconstrucción. Estos puentes rescatan los detalles nítidos originales y los inyectan en la salida, logrando que la red dibuje las fronteras de los elementos con una precisión a nivel de píxel.  

### 5.2.2. Diseño Arquitectónico y Estructura de Datos (*Data Shapes*)
- **Inferencia (Tratamiento de Entrada y Salida):** Al modelo se le inyecta un tensor espacial de **7 canales simultáneos**. Tras atravesar la "U", el *Decoder* expulsa **6 canales paralelos** (mapas de probabilidad o *logits* correspondientes a las 6 Clases Maestras). Una función de activación matemática (`Softmax`) evalúa cada píxel a lo largo de esos 6 canales y decide estadísticamente qué clase tiene la probabilidad más alta, colapsando el tensor tridimensional en la imagen 2D final donde cada píxel tiene un valor absoluto del 0 al 5.
- **Entradas (*Inputs - X*):** Su forma matricial es `(N, 7, 512, 512)`. Los tensores están almacenados en disco como `Float16` (reduciendo exactamente a la mitad el peso y acelerando la lectura), pero entran en la red obligatoriamente como `Float32`. Si la IA usara la baja precisión matemática de `Float16` durante el aprendizaje activo, no tendría suficientes decimales para guardar los ajustes microscópicos, redondeándolos a cero y colapsando el entrenamiento.
- **Salidas (*Outputs - Y_pred*):** Su forma es `(N, 6, 512, 512)`, representando los *logits* por Clase Maestra: 0 (Descarte), 1 (Suelo), 2 (Nube), 3 (Sombra Nube), 4 (Nieve), 5 (Agua).

### 5.2.3. Justificación de la programación "From Scratch" frente a redes pre-entrenadas
A pesar de la popularidad del *Transfer Learning* (adaptar un modelo ya pre-entrenado por terceros), en este proyecto se tomó la decisión estratégica de programar y entrenar la red U-Net totalmente desde cero (*From Scratch*). Esta decisión se fundamenta en un análisis crítico de las siguientes incompatibilidades:

- **Incompatibilidad de Entradas (Canales y Dimensionalidad):** Los modelos satelitales públicos están diseñados para ingerir las 10 o 13 bandas nativas de Sentinel-2. Nuestra arquitectura realiza una reducción selectiva de dimensionalidad a 7 canales específicos (6 bandas ópticas + el índice NDSI calculado). Esta reducción previene la saturación de memoria de la GPU (*Out of Memory - OOM*) y acelera la convergencia. Modificar la capa de entrada de un modelo pre-entrenado para que acepte una topología de 7 canales invalida los pesos matemáticos iniciales transferidos, anulando la principal ventaja del *Transfer Learning*.
- **Incompatibilidad de Salidas y Taxonomía Semántica:** Las redes pre-entrenadas genéricas para detección de nubes suelen devolver máscaras binarias (Nube / Despejado). Este proyecto exige mapear una taxonomía de 6 Clases Maestras. Aunque en *Transfer Learning* es estándar sustituir la capa final de clasificación, el hecho de tener que rediseñar simultáneamente tanto la capa de entrada como la de salida provoca que los pesos de las capas intermedias pierdan su contexto espacial. Implementar la topología desde cero garantiza que la red asimile nuestra taxonomía multiclase de forma nativa en todas sus capas.
- **Abundancia de Datos y Mitigación del Sesgo Geográfico:** El *Transfer Learning* es una técnica concebida principalmente para paliar la escasez de datos. Sin embargo, el exhaustivo trabajo de Ingeniería de Datos de este proyecto ha logrado consolidar una Verdad Terrestre (*Ground Truth*) compuesta por miles de tensores espaciales validados y específicos de la orografía de Cataluña. Iniciar el entrenamiento con los pesos aleatorios inicializados desde cero, utilizando exclusivamente este *dataset* local, asegura que el modelo extraiga los patrones geomorfológicos reales de nuestro terreno de estudio, evitando heredar sesgos geográficos o atmosféricos de modelos globales.

### 5.2.4. Evaluación y Función de Pérdida
Para asegurar el correcto aprendizaje de la red neuronal, se han establecido mecanismos matemáticos de corrección y métricas rigurosas:
- **Función de Pérdida (`CrossEntropyLoss`):** Se ha implementado una estrategia crítica de enmascarado (`ignore_index=0`). Las imágenes satelitales a menudo contienen áreas de "NoData" (píxeles nulos fuera de órbita o mares muy oscuros descartados). Al ignorar la clase 0, la función evita penalizar o recompensar a la red en estas áreas nulas, concentrando el 100% de la capacidad de cómputo en la geografía real.
- **Métrica Principal - *Intersection over Union* (IoU):** En teledetección óptica existe un grave riesgo de sesgo por desbalanceo de clases (ej. 95% de cielo despejado frente a 5% de nieve). La precisión global (*Overall Accuracy*) es engañosa, ya que predecir siempre "despejado" daría un 95% de acierto. Para evitar esto, se emplea el índice IoU o de Jaccard por cada clase individualmente, el cual penaliza de forma implacable tanto la sobre-predicción (falsos positivos) como la sub-predicción (falsos negativos).


## 5.3. Estrategia de Datos y Decisiones Arquitectónicas

Este apartado centraliza y justifica las decisiones científicas tomadas en el procesamiento de datos satelitales para entrenar el modelo de segmentación semántica:

### 5.3.1. Nivel de Procesamiento: L1C frente a L2A
**Decisión:** Utilizar imágenes crudas L1C (*Top of Atmosphere*).
**Justificación:** Las nubes se encuentran físicamente en las capas altas/medias de la atmósfera. Aplicar correcciones atmosféricas (L2A) sobre píxeles de nubes no tiene rigor físico. Además, el algoritmo estándar (Sen2Cor) utilizado para generar L2A contiene errores confundiendo nieve con nubes; entrenar el modelo con L2A implicaría heredar este sesgo algorítmico. Operar sobre L1C permite a la red extraer las características físicas puras desde cero, siendo el estándar metodológico en modelos avanzados como *s2cloudless* o *Fmask*.

### 5.3.2. Descarte de Múltiples Modelos por Órbita (R008 vs R051)
**Decisión:** Se entrena un **único modelo** unificado para ambas órbitas relativas.
**Justificación:** Las órbitas R008 y R051 ocurren en días distintos, proporcionando ángulos de observación y acimutales diferentes. Al mezclarlas, se aplica un *Data Augmentation* natural que hace a la U-Net invariante a la rotación e iluminación solar. Separar los modelos duplicaría la carga de mantenimiento y limitaría severamente su generalización, contradiciendo los principios básicos del diseño en *Deep Learning*.

### 5.3.3. Descarte de Múltiples Modelos Geográficos (Norte vs Sur)
**Decisión:** Se utiliza un **único modelo** con muestreo estratificado para todo el territorio.
**Justificación:** Crear un modelo exclusivo para el Sur impediría que la red aprendiera sobre la nieve, fallando estrepitosamente si ocurriera una nevada atípica en la costa. Exponer al modelo a los "casos más difíciles" simultáneamente (Nieve/Sombras orográficas en el Pirineo y Agua/Agricultura en el Sur) asegura la Generalización del Dominio (*Domain Generalization*), haciéndolo robusto ante datos fuera de distribución.

### 5.3.4. Estrategia de Ingesta: Tiling Directo vs Mosaico Previo
**Decisión:** Realizar el recorte (*tiling* en parches de 512x512) directamente sobre los gránulos MGRS, **descartando el mosaico previo**.
**Justificación:** Unir gránulos de diferentes días genera "costuras" (*seamlines*) con cambios bruscos de iluminación. Las redes convolucionales son muy sensibles a estos bordes artificiales, aprendiendo patrones espectrales que no existen en la naturaleza (ruido de alta frecuencia). Procesar en la malla nativa de captura preserva la coherencia física y evita el colapso de memoria RAM (*Out of Memory*).

### 5.3.5. Composición del Input Tensor
**Decisión:** Tensor multicanal (7 bandas) que prescinde de modelos digitales de elevación (DEM).
**Justificación:** Las bandas Infrarrojas de Onda Corta (SWIR, 20m) son fundamentales, ya que la nieve las absorbe y las nubes las reflejan, haciendo innecesario el uso del DEM. Las bandas Visibles y el Infrarrojo Cercano (NIR, 10m) proveen la alta resolución necesaria para detectar nubes finas. Adicionalmente, el índice NDSI inyecta directamente fronteras de decisión matemáticas a la red neuronal.

### 5.3.6. Descarte de Imágenes de Referencia (Single-Image)
**Decisión:** Se descarta el análisis multitemporal (usar una imagen previa libre de nubes).
**Justificación:** La orografía catalana es altamente dinámica. En los Pirineos la nieve es efímera, y en llanuras como el Delta del Ebro, las prácticas agrícolas modifican drásticamente la reflectancia del terreno en cuestión de días. Una red multitemporal interpretaría estos cambios bruscos como nubes (alta tasa de Falsos Positivos). La aproximación *Single-Image* evalúa únicamente el estado atmosférico del momento presente, aportando mucha mayor robustez.

### 5.3.7. Descarte de Máscaras Vectoriales de Agua
**Decisión:** No inyectar cartografía estática (lagos o ríos predefinidos).
**Justificación:** En épocas de sequía (ej. embalse de Sau), un mapa vectorial indicará "agua" donde ahora hay tierra brillante. Esta disonancia confundiría severamente a la red. El agua pura ya absorbe el espectro NIR y SWIR casi por completo; la U-Net extrae esta característica hidrológica instantáneamente a partir de los canales espectrales sin depender de cartografía desactualizada.

### 5.3.8. Excepción Teórica: Viabilidad del *Tile* Urbano (Trabajo Futuro)
**Propuesta:** Aunque se descarta como norma general, el uso de "imágenes ideales" sí sería aplicable exclusivamente a parches 100% urbanos.
**Justificación:** A diferencia de campos o montañas, el asfalto y el hormigón urbano mantienen su firma espectral estable durante todo el año. En un sistema avanzado de inteligencia artificial, se podría inyectar la referencia urbana libre de nubes solo tras haber clasificado previamente el parche como "Ciudad" (*Land Use Classification*). Esta arquitectura híbrida se perfila como una línea prometedora de investigación futura para anular los falsos positivos en zonas industriales muy reflectantes.


# 6. Metodología aplicada

Para la consecución de los objetivos planteados y garantizar un ciclo de vida completo del desarrollo tecnológico, la metodología de este proyecto se ha estructurado como un flujo de trabajo iterativo. Esta arquitectura abarca desde la adquisición automatizada del dato bruto satelital hasta su despliegue final interactivo, pasando por el pilar central: la construcción manual de un conjunto de datos sin sesgos y el entrenamiento de la Inteligencia Artificial.

## 6.1. Instrumentos
El desarrollo metodológico se ha sustentado en los siguientes instrumentos de *software* y orígenes de datos:
- **Fuente de observación de la Tierra:** Satélite Sentinel-2 (programa Copernicus de la ESA). Se han empleado tanto los datos radiométricos en bruto (Nivel L1C) como las máscaras preexistentes del procesador oficial (Sen2Cor) a modo de base comparativa. Las descargas se han realizado a través de las APIs del *Copernicus Data Space Ecosystem (CDSE)*.
- **Desarrollo del modelo y *pipeline* ETL:** Máquina de trabajo local equipada con procesadores gráficos (GPUs CUDA) para entrenar las redes neuronales, efectuar las inferencias masivas y ejecutar los *scripts* en Python de descarga, ingeniería de datos y recorte espacial (*tiling*).
- **Edición y clasificación visual:** Software libre de edición de imágenes GIMP, empleado como instrumento principal para la reclasificación manual de los píxeles conflictivos y la generación de la Verdad Terrestre.
- **Modelado de Inteligencia Artificial:** *Framework* PyTorch, estándar de la industria para el entrenamiento matemático de la arquitectura U-Net.
- **Arquitectura de despliegue web:** *Frameworks* de desarrollo Frontend de alto rendimiento (*Svelte*) combinados con motores cartográficos (*MapLibre GL JS*) para renderizar los resultados geoespaciales estáticos precalculados (*Serverless*).

## 6.2. Materiales (Conjunto de datos)
Las arquitecturas de segmentación profunda aprenden de forma más eficiente y generalizan mejor a partir de un conjunto de datos acotado pero estratégicamente curado ("casos difíciles") que de un conjunto masivo pero redundante. Con el objetivo de maximizar la solidez del modelo ante casos geográficamente complejos (*Hard Negatives*), se ha diseñado un *Dataset* de **40 gránulos** específicos de Cataluña, divididos metodológicamente en dos bloques estancos:

1. **Conjunto de Entrenamiento y Validación (30 gránulos):** Seleccionados para enseñar a la red neuronal a resolver los principales desafíos orográficos y espectrales, forzando la invarianza espacial:
   - *Alta Montaña (Pirineos):* Gránulos de invierno (T31TCH, T31TDH) con nieve pura en valles y nubes bajas.
   - *Niebla por Inversión Térmica:* Gránulos de invierno sobre la llanura de Lleida (T31TCG, T31TDG).
   - *Costas y Urbano:* Escenas sobre Barcelona y el mar Mediterráneo (T31TDF) para evitar falsos positivos por naves industriales altamente reflectantes.
   - *Superficies Hídricas:* Gránulos sobre el Delta del Ebro (T31TCE, T31TCF) para mitigar la confusión matemática entre el agua de los arrozales y las sombras oscuras de las nubes.
2. **Conjunto de Test Ciego o *Blind Test* (10 gránulos):** Un bloque de validación aislado que la Inteligencia Artificial jamás observa durante la fase de entrenamiento, evitando la filtración de datos (*Data Leakage*). Consta de 10 imágenes con condiciones atmosféricas extremas para evaluar el rendimiento empírico del modelo frente a Sen2Cor de forma imparcial.

## 6.3. Secuencia Metodológica (Pipeline ETL)
La metodología ha sido codificada en un *pipeline* automatizado de Extracción, Transformación y Carga (ETL) secuencial de cuatro fases:

1. **Fase 1: Ingesta de datos y Orquestación:** Mediante peticiones OData al *Copernicus Data Space Ecosystem*, se descargan los gránulos de entrenamiento y de test en directorios estancos. Se aíslan las 6 bandas multiespectrales ópticas e infrarrojas de interés (L1C), descartando la información redundante y recuperando el fichero de clasificación SCL (L2A) oficial a modo de línea base.
2. **Fase 2: Ingeniería de Datos y Verdad Terreno (*GIMP Bridge*):** 
   - **Tiling (Troceado espacial):** Para evitar colapsos de memoria (OOM) en la GPU, el territorio satelital se recorta dinámicamente en teselas manejables de 512x512 píxeles de 7 canales (las 6 bandas + el índice NDSI inyectado). Un filtro destruye sistemáticamente cualquier cuadrante que contenga más de un 90% de vacío (océano profundo).
   - **Edición Fotográfica:** Para corregir los falsos positivos históricos de Sen2Cor, se diseñó un "GIMP Bridge". Un *script* de Python codifica temporalmente las matrices matemáticas de clasificación (0-5) en tensores de color RGB. Esto permite al investigador abrir los parches en el *software* GIMP y redibujar a mano los contornos de las nubes y la nieve con suma agilidad. Posteriormente, un decodificador revierte el arte visual a un estado matemático estricto, materializando una Verdad Terrestre (*Ground Truth*) absoluta y libre de sesgos para entrenar a la red.
3. **Fase 3: Entrenamiento del Modelo (*Deep Learning*):** La red convolucional U-Net iterativiza sobre el conjunto de datos curado de entrenamiento, minimizando la función de pérdida *Cross Entropy Loss* (configurada con `ignore_index=0` para no penalizar el "NoData" geográfico). Al converger, se congela el estado de los pesos neuronales, consolidando el modelo central.
4. **Fase 4: Inferencia y MLOps (*Human-in-the-Loop*):** El modelo entrenado se despliega sobre el conjunto de Test para generar predicciones algorítmicas, las cuales se integran directamente en el visor GIS web desarrollado en Svelte. Este ciclo de vida está diseñado para una mejora continua: cuando se detecta un error de inferencia en producción, se audita y corrige el parche específico con GIMP, re-entrenando periódicamente la red mediante técnicas de *Active Learning* para generar versiones superiores del modelo.

## 6.4. Metodología de Evaluación
Para certificar empíricamente que el modelo propio supera al estándar europeo, la fase de evaluación técnica se diseñó bajo una regla inquebrantable: **Bajo ningún concepto se evalúa el rendimiento estadístico de la IA contra las máscaras originales defectuosas de Sen2Cor.** Utilizar la salida del procesador oficial como "verdad" generaría un sesgo crítico donde el sistema informático penalizaría a la U-Net precisamente en los casos en los que acierta corrigiendo errores de la ESA. 

El flujo de evaluación establecido es:
1. **Verdad Terreno Auditada en el Test:** Se aplica la misma edición y clasificación manual exhaustiva (*GIMP Bridge*) sobre la totalidad de los 10 gránulos de evaluación extrema.
2. **Cálculo de Métricas Científicas:** Las predicciones emitidas por la red neuronal se enfrentan exclusivamente a esta nueva Verdad Terreno auditada manualmente, empleando métricas de extrema severidad espacial:
   - **Intersection over Union (IoU):** Para medir la superposición geométrica exacta entre la nube/nieve predicha y la real.
   - **F1-Score y Recall (Exhaustividad):** Para evitar métricas de precisión engañosas en clases geográficamente desbalanceadas (como la nieve, que ocupa un porcentaje muy bajo del total del territorio catalán).

# 7. Desarrollo viable y sostenible

En la era del *Big Data*, el desarrollo de proyectos tecnológicos masivos exige un compromiso íntegro con la sostenibilidad. Este caso de estudio ha sido orquestado bajo tres perspectivas fundamentales de viabilidad y ética: ambiental, social y económica.

## 7.1. Temporalización e hitos

La complejidad de orquestar un *pipeline* geoespacial masivo interconectado con modelado predictivo exige un control de tareas meticuloso. Atendiendo al calendario del TFB, a continuación se detallan las fases alcanzadas y planificadas:

### Fases de Ejecución (Desarrollo *End-to-End*):

Este proyecto trasciende el mero análisis estadístico aislado para constituirse como una solución tecnológica integral (*End-to-End*). El ciclo de vida de la herramienta abarca desde la idea inicial, la investigación de los requisitos de la Agencia Espacial Europea (ESA) para el acceso a datos de satélite, la adquisición cruda de la información espacial, la preparación y limpieza de datos, el entrenamiento del modelo, la evaluación científica y la puesta en producción, edición manual ETL con software de imagen, flujos ETL automatizados para extracción de gránulos vía API, edición manual con software de imagen hasta la puesta en producción de una herramienta web fusionando Ingeniería de Datos (*Data Engineering*), *Machine Learning* y *DevOps/Web Development*.

1. **Fase 1 - Fundamentación e Ingeniería de Datos (Completada):** Conceptualización del problema analítico, evaluación teórica de los sensores de la ESA, viabilidad técnica de los datos y primer planteamiento arquitectónico.
2. **Fase 2 - Arquitectura MLOps y Modelado (Actual - 60%):** Programación y automatización del flujo de datos ETL masivo para extracción de gránulos vía API. Diseño y colapso de la matriz de características. Refinamiento e investigación del concepto *Ground Truth Humano*. Entrenamiento algorítmico de la red neuronal convolucional (U-Net) y justificación estadística de la pérdida paramétrica. Para garantizar la reproducibilidad científica y técnica, todo el código fuente de esta orquestación se encuentra versionado en un repositorio público de GitHub, estando cada *script* rigurosamente documentado mediante *Docstrings* bajo estándares de ingeniería de *software* profesional.
3. **Fase 3 - Inferencia Cloud y Validaciones (Próxima):** Ejecución algorítmica sobre un set de Test puro y sin contaminar para su validación científica frente al algoritmo nativo Sen2Cor. Paralelamente, se iniciará el proceso de desacople del modelo para preparar su despliegue en infraestructuras *Cloud*.
4. **Fase 4 - Despliegue Web y Defensas (Definitiva):** Cierre del ciclo tecnológico mediante el desarrollo de una Aplicación Web que servirá el modelo entrenado, permitiendo inferencias *on-the-fly* a nivel de usuario. Culminará con el empaquetado del trabajo escrito y la creación de las defensas argumentativas interactivas.

![Diagrama de Gantt TFB](gantt.svg)
*Figura 2: Diagrama de Gantt ilustrando el cronograma general del proyecto.*

## 7.2. Alineación con los ODS y Códigos UNESCO

ParaEl rigor académico y técnico de este Trabajo Final de Bàtxelor se enmarca dentro de las clasificaciones científicas internacionales y persigue un impacto directo en la sostenibilidad global.

### Códigos UNESCO
La naturaleza de la investigación se clasifica bajo los siguientes códigos nomencladores:
- **1207.94 (Aprendizaje automático):** Justificado por el entrenamiento de un modelo de *Deep Learning* (Redes Neuronales U-Net) para la segmentación semántica de imágenes satelitales.
- **1203.93 (Cloud Computing):** Aplicado en el diseño y despliegue del entorno escalable (*pipeline* geoespacial) y la futura infraestructura de procesamiento *online*.
- **1203.96 (Bases de Datos):** Requerido para la orquestación y estructuración de la arquitectura orientada a la nube mediante formatos geoespaciales optimizados (*Cloud Optimized GeoTIFF* y *PMTiles*).

### Objetivos de Desarrollo Sostenible (ODS)
El impacto del análisis geográfico desarrollado está firmemente cimentado sobre el marco de los Objetivos de Desarrollo Sostenible de las Naciones Unidas:
- **ODS 9 (Industria, Innovación e Infraestructura):** El proyecto construye una infraestructura tecnológica geoespacial innovadora que mejora sustancialmente las capacidades de procesamiento y análisis de datos de la industria satelital europea.
- **ODS 13 (Acción por el clima):** La monitorización precisa de la superficie terrestre (diferenciando de forma empírica y fiable la nieve de la nubosidad) proporciona datos limpios y veraces, fundamentales para evaluar el impacto del cambio climático y facilitar la gestión estratégica de los recursos hídricos en el territorio de Cataluña.

## 7.3. Condicionantes ambientales, sociales y económicos

### Condicionantes Ambientales (*Green Computing*)
El proceso de entrenamiento de grandes redes neuronales exige ciclos masivos de cómputo gráfico (GPU), los cuales requieren un gasto de energía eléctrica considerable y, por ende, generan una huella de carbono subyacente. Para transformar este proyecto en un desarrollo sostenible medioambientalmente:
- Se ha diseñado una técnica algorítmica denominada **Tiling**, que fragmenta las imágenes satelitales y somete a evaluación matemática la riqueza de datos de cada cuadrante. Si un área geográfica contiene predominantemente datos nulos (ej. océano negro o franjas vacías), el parche no se procesa ni se envía a la tarjeta gráfica. Esta optimización algorítmica reduce el gasto energético del *hardware* drásticamente.
- A nivel aplicativo, el modelo resultante facilitará a organismos como la **Agencia Catalana del Agua (ACA)** una herramienta computacional robusta para monitorizar el deshielo pirenaico y las cuencas fluviales, actuando como un escudo tecnológico en la prevención y gestión eficiente de la sequía. Asimismo, resultará de valor para el **Institut Cartogràfic i Geològic de Catalunya (ICGC)**, al permitir la generación automática de mosaicos territoriales ortofotográficos completamente limpios de nubosidad. Por extensión, esta tecnología democratiza el acceso a máscaras espaciales de alta fidelidad para cualquier universidad, institución o empresa privada que requiera imágenes nítidas para realizar estudios sobre el terreno, monitorización de masas forestales, control de plantaciones agrícolas o detección de construcciones ilegales. Además, su arquitectura altamente escalable permite la futura integración de nuevas constelaciones satelitales (como los datos de temperatura superficial de Sentinel-3 y los datos de radar SAR de Sentinel-1). Esta fusión multisensor posibilitará calcular el volumen y la estabilidad térmica de las masas de nieve en los Pirineos para predecir el riesgo de aludes, así como detectar corrimientos y movimientos de tierra con precisión milimétrica.

### Condicionantes Sociales y Replicabilidad Científica (Open Source)
Los mapas satelitales defectuosos generan decisiones tardías y perjudiciales. Al proporcionar a los profesionales del territorio (ej. agricultores del Delta del Ebro o responsables de parques naturales) máscaras geoespaciales, se promueve un ecosistema de información civil de calidad. La democratización de estos datos empíricos habilita respuestas gubernamentales mucho más ágiles en momentos críticos como sequías, inundaciones o grandes incendios forestales.

Bajo la premisa innegociable de la **Replicabilidad Científica**, tanto los datos satelitales de la ESA como la totalidad de la arquitectura de código subyacente de este proyecto son de dominio público y código abierto (*Open Source*). El *pipeline* completo de ingeniería se encuentra alojado y versionado en el repositorio de **GitHub**. Para asegurar que la investigación académica pueda ser auditada, heredada y ejecutada por cualquier entidad científica del mundo, todo el ecosistema de *scripts* (desde la extracción en red OData hasta el orquestador de inferencia PyTorch) ha sido programado de forma modular y está exhaustivamente documentado internamente mediante *Docstrings* técnicos. Esto permite que cualquier usuario o investigador, con independencia de su presupuesto informático, pueda clonar el repositorio, comprender línea a línea el flujo de tensores, reproducir exactamente los mismos modelos matemáticos y utilizar este trabajo como núcleo tecnológico para desplegar nuevos sistemas GIS a escala global.

### Condicionantes Económicos
Para garantizar que la metodología pueda ser heredada sin restricciones financieras, toda la orquestación del proyecto huye del *software* propietario:
- Se ha empleado íntegramente código abierto (lenguaje Python, librerías geoespaciales y el *framework* PyTorch).
- Para el crítico proceso de edición y clasificación manual de píxeles (forja del *Ground Truth*), se ha utilizado GIMP, una alternativa libre y gratuita que democratiza el acceso a la edición cartográfica de alto nivel.
- Las fuentes de datos provienen del catálogo abierto de la Unión Europea a través de la API OData de Copernicus.
- A largo plazo, el despliegue del *software* mediante estándares geoespaciales modernos permite operar en un entorno web *Serverless* de ínfimo coste en la nube, eliminando la dependencia de servidores dedicados costosos.

# 8. Proceso y resultados

Este apartado detalla la ejecución técnica del *pipeline* geoespacial y presenta los resultados cuantitativos de la evaluación del modelo frente al algoritmo estándar Sen2Cor.

## 8.1. Cronología de Pivotes Arquitectónicos
El desarrollo del proyecto siguió un enfoque iterativo (*Agile*) debido a la extrema complejidad topográfica y radiométrica de Cataluña. A lo largo del ciclo de vida del software, la investigación colisionó con severas barreras que exigieron cambios estratégicos drásticos de rumbo (*pivotes* arquitectónicos):

- **Pivote 1. El abandono de Sen2Cor:** Al auditar el relieve de los Pirineos, se constató la incapacidad crítica del algoritmo Sen2Cor de la ESA para separar la nieve de la nube gruesa. Se determinó construir desde cero (*From Scratch*) nuestra propia Red Neuronal U-Net.
- **Pivote 2. El Dilema Topográfico:** Para diferenciar las nubes densas de la nieve, la arquitectura inicial contempló inyectar el Modelo Digital de Elevaciones (DEM) de Cataluña. Por criterios de simplicidad arquitectónica, se descartó su integración para apostar exclusivamente por la física espectral (bandas SWIR y NDSI). Esto agilizó inmensamente el cómputo pero provocó que el modelo presente debilidades algorítmicas frente a las sombras orográficas oscuras en laderas escarpadas, estableciendo una clara línea de investigación futura.
- **Pivote 3. El colapso del Delta del Ebro (Clase Masas de Agua):** Durante las primeras épocas de entrenamiento con 5 clases, las inferencias sobre el Mediterráneo y los arrozales del Delta del Ebro colapsaron. El sol, al reflejarse especularmente en el mar (*Sun Glint*), cegaba a la red neuronal, haciéndole predecir inmensos bancos de nubes inexistentes. El problema se solucionó paralizando el entrenamiento, rediseñando el espacio latente matemático y aislando una sexta Clase Maestra específica para las Masas de Agua.

## 8.2. Resultados Finales de la Evaluación
Hemos finalizado con éxito la evaluación estadística de la red neuronal U-Net validándola matemáticamente frente a la Edición y Clasificación Manual de Píxeles (la Verdad Terreno extraída de los 10 gránulos ocultos de Test, editados manualmente con GIMP para corregir los fallos nativos de la ESA). 

Se evaluaron un total de **1.100.892.668 píxeles geográficos válidos**. Dado el volumen descomunal de datos, el motor estadístico implementó un remuestreo al vuelo por *Nearest Neighbor* y agregación matemática directa (`np.bincount`) para cruzar toda la geografía de test sin colapsar la RAM del sistema.

### 8.2.1. Métricas Agregadas por Clase
Los resultados demuestran de forma empírica que se han cumplido los objetivos del proyecto:

| Clase Geográfica | IoU (%) | Precisión (%) | Recall (%) | F1-Score (%) |
| :--- | :--- | :--- | :--- | :--- |
| **Suelo (1)** | 90.94% | 95.17% | 95.35% | 95.26% |
| **Nube (2)** | 80.43% | 90.07% | 88.26% | 89.16% |
| **Sombra Nube (3)** | 46.96% | 64.03% | 63.78% | 63.90% |
| **Nieve (4)** | **84.64%** | **89.73%** | **93.72%** | **91.68%** |
| **Masas de Agua (5)** | 86.79% | 89.54% | 96.57% | 92.93% |

**Análisis de la detección de nieve:**
El modelo ha alcanzado un IoU sobresaliente del 84.64% con un Recall del 93.72%. Esto demuestra categóricamente que la inyección conjunta de bandas físicas ópticas, infrarrojas (SWIR) y el índice matemático NDSI consigue separar topológicamente la nieve de las nubes, resolviendo la confusión histórica de Sen2Cor.

**Análisis de las Sombras de Nube:**
La clase "Sombra Nube" obtiene un IoU más moderado (46.96%). Lejos de ser un fallo de la red, es un fenómeno documentado: la transición lumínica gradual hace que las sombras proyectadas sobre laderas montañosas escarpadas sean imposibles de discernir de las verdaderas sombras de las nubes, a menos que se crucen los datos ópticos bidimensionales con un modelo altimétrico (DEM) tridimensional.

### 8.2.2. Matriz de Confusión Global
A continuación, se representa el mapa térmico (*Heatmap*) generado a partir de la matriz de contingencia, que acumula más de mil cien millones de intersecciones lógicas:

![Matriz de Confusión Global Test](img/confusion_matrix.png)
*Figura 3: Matriz de confusión global acumulando más de 1.100 millones de inferencias sobre el conjunto de test ciego.*

La diagonal principal concentra de manera aplastante las celdas más oscuras (aciertos verdaderos), encapsulando los errores en umbrales lógicos muy bajos fuera de la diagonal. El modelo resuelve de forma implacable la detección de nieve y controla exitosamente los destellos hídricos especulares.

# 9. Discusión y Análisis Crítico

El desarrollo empírico de este Trabajo Final de Bàtxelor ha demostrado que es viable construir un *pipeline* geoespacial capaz de entrenar una red neuronal (U-Net) para superar en precisión al estándar industrial europeo (Sen2Cor) en geografías complejas. Sin embargo, un análisis riguroso exige exponer las severas deficiencias arquitectónicas y metodológicas que aún limitan la escalabilidad operativa de esta solución:

1. **La barrera de la física óptica (El problema de las sombras topográficas):**
   Al apostar por un diseño de red puramente espectral para maximizar la eficiencia computacional (*Green Computing*), se descartó deliberadamente la integración de un Modelo Digital de Elevaciones (DEM). Los resultados demuestran que, en terrenos sumamente escarpados como los Pirineos, la diferencia fotométrica entre una sombra orográfica y la sombra de una nube densa es nula. Al obligar a la U-Net a resolver este problema matemático utilizando exclusivamente bandas ópticas e infrarrojas, la red sufre un alto índice de falsos positivos. Es un defecto arquitectónico de base: no se puede deducir la orografía 3D a partir de fotones 2D.
2. **Escalabilidad nula del *Ground Truth* (El cuello de botella artesanal):**
   Forjar un *dataset* 100% puro requirió cientos de horas de edición manual de píxeles en GIMP. Aunque esta aproximación artesanal fue necesaria para aislar y superar los sesgos de la ESA, metodológicamente es un modelo insostenible. Resulta imposible escalar esta técnica a nivel continental o global por el factor de fatiga humana y el tiempo inasumible. El proyecto es altamente dependiente de la intervención de un operador experto.
3. **Omisión de Índices Espectrales Clave:**
   Aunque la inyección del índice NDSI (Nieve) resolvió con éxito la confusión nieve-nube, la detección masiva de falsos mares en el Delta del Ebro demostró una miopía en el *Feature Engineering*. Si se hubiera inyectado adicionalmente el Índice Diferencial de Agua Normalizado (NDWI), la red probablemente habría discriminado el agua somera agrícola del agua marina profunda de forma nativa, evitando horas de repintado manual.
4. **Limitaciones de Hardware y Gradientes (OOM):**
   Procesar tensores multidimensionales de 512x512 píxeles con precisión `Float32` saturó rápidamente la memoria VRAM (Out of Memory). Para evitar el colapso del sistema, se tuvo que penalizar drásticamente el tamaño del *Batch Size* durante el entrenamiento, lo que provocó una convergencia matemática más lenta y gradientes más inestables durante las primeras épocas de aprendizaje.

# 10. Conclusiones y Futuras Líneas de Investigación

Como síntesis técnica del proyecto, se establecen las siguientes directrices y vías evolutivas para transformar esta prueba de concepto de laboratorio en un producto empresarial (*Web GIS*):

1. **Fusión Multimodal y Topográfica (El fin de las sombras):**
   El siguiente hito innegociable es inyectar metadatos tridimensionales directamente en la primera capa convolucional de la red (ej. Modelo de Elevaciones del ICGC). Proveer a la IA del contexto del relieve catalán erradicará casi al 100% las colisiones de sombras topográficas.
2. **Despliegue *Serverless* con Rust (Backend de alto rendimiento):**
   Actualmente, el *pipeline* es estático y procesa la inferencia *offline* (guardando TIFs en disco). Para materializar un Web GIS interactivo, es obligatorio reescribir la canalización de *backend* empleando **Rust**. Este lenguaje de sistemas sin recolector de basura permitirá cargar la inferencia geoespacial *on-the-fly* mediante arquitecturas *Serverless*, consumiendo fracciones de megabyte y sirviendo resultados ultra-rápidos mediante el estándar *Cloud Optimized GeoTIFF* a la web del usuario.
3. **Auditoría Automatizada mediante Modelos Visuales (VLM):**
   Para romper el cuello de botella de la edición manual en GIMP, se propone un ecosistema de retroalimentación donde Modelos de Lenguaje Visual (*LLaVA*, *PaliGemma*) funcionen como "analistas ciegos". La IA auditaría las salidas de la U-Net, detectando anomalías lógicas de forma automatizada y guiando al operador humano únicamente hacia los polígonos que requieren revisión, instaurando un auténtico *Active Learning*.
4. **Ampliación de Clases Semánticas Operativas:**
   Escalar la capacidad de segmentación para monitorizar cicatrices de incendios forestales, estrés hídrico en viñedos o la fluctuación volumétrica de pantanos.
5. **Sustituir las convoluciones estándar del Encoder por bloques residuales**

- **Integración de Bloques Residuales (ResUNet):** Sustituir las convoluciones estándar del Encoder por bloques residuales. Esta modificación arquitectónica mitigaría el problema del desvanecimiento del gradiente (*vanishing gradient*), permitiendo el entrenamiento de redes topológicamente más profundas con mayor capacidad de extracción de características abstractas.
- **Mecanismos de Atención (Attention U-Net):** La introducción de puertas de atención (*Attention Gates*) en las *Skip Connections* permitiría al modelo suprimir matemáticamente la información redundante del fondo de la imagen. Esto focalizaría la capacidad de inferencia de la red en las áreas de alta ambigüedad espectral, mejorando la discriminación en los límites difusos entre la nieve de alta montaña y la nubosidad gruesa.
- **Captura de Contexto Global (TransUNet / Vision Transformers):** Como salto arquitectónico a largo plazo, se plantea la transición hacia modelos híbridos que incorporen *Vision Transformers (ViT)*. A diferencia del campo receptivo local inherente a los *kernels* convolucionales, los Transformers permitirían evaluar el contexto espacial global de la imagen satelital desde las etapas iniciales de la red, resolviendo definitivamente las confusiones derivadas de la morfología del terreno a gran escala.
# 11. Referencias Bibliográficas

Baetens, L., Desjardins, C., & Hagolle, O. (2019). Validation of Copernicus Sentinel-2 Cloud Masks Obtained from MAJA, Sen2Cor, and FMask Processors Using Reference Cloud Masks Generated with a Supervised Active Learning Procedure. *Remote Sensing, 11*(4), 433. https://doi.org/10.3390/rs11040433

European Space Agency [ESA]. (2026). *Copernicus Open Access Hub - Sentinel-2 Data Access*. Recuperado el 25 de junio de 2026, de https://scihub.copernicus.eu/

Hollstein, A., Segl, K., Guanter, L., Kneubühler, M., & Legleiter, C. (2016). Ready-to-Use Methods for the Detection of Clouds, Cirrus, Snow, Shadow, Water and Clear Sky Pixels in Sentinel-2 MSI Images. *Remote Sensing, 8*(8), 666. https://doi.org/10.3390/rs8080666

Institut Cartogràfic i Geològic de Catalunya [ICGC]. (2026). *Models d'Elevacions del Terreny de Catalunya*. Recuperado el 25 de junio de 2026, de https://www.icgc.cat/

Ronneberger, O., Fischer, P., & Brox, T. (2015). U-Net: Convolutional Networks for Biomedical Image Segmentation. *Medical Image Computing and Computer-Assisted Intervention – MICCAI 2015*, 234–241. https://doi.org/10.1007/978-3-319-24574-4_28

Wieland, M., Li, Y., & Martinis, S. (2019). Multi-sensor cloud and cloud shadow segmentation with a convolutional neural network. *Remote Sensing of Environment, 230*, 111203. https://doi.org/10.1016/j.rse.2019.05.022

Zhu, Z., & Woodcock, C. E. (2012). Object-based cloud and cloud shadow detection in Landsat imagery. *Remote Sensing of Environment, 118*, 83-94. https://doi.org/10.1016/j.rse.2011.10.028

Zupanc, A. (2017). Improving Cloud Detection with Machine Learning. *Sentinel Hub Blog*. Recuperado de https://medium.com/sentinel-hub/improving-cloud-detection-with-machine-learning-c09dc5d7cf13
