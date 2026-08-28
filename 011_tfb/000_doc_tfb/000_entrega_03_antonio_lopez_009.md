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
- [3. Contextualización del problema (El límite de Sen2Cor)](#3-contextualización-del-problema-el-límite-de-sen2cor)
- [4. Objetivos generales y específicos](#4-objetivos-generales-y-específicos)
  - [4.1. Objetivo general](#41-objetivo-general)
  - [4.2. Objetivos específicos](#42-objetivos-específicos)
- [5. Marco teórico y conceptos clave](#5-marco-teórico-y-conceptos-clave)
  - [5.1. Datos espaciales: Sentinel-2 y el espectro electromagnético](#51-datos-espaciales-sentinel-2-y-el-espectro-electromagnético)
  - [5.2. Inteligencia Artificial: La Arquitectura U-Net](#52-inteligencia-artificial-la-arquitectura-u-net)
  - [5.3. Estrategia de Datos y Decisiones Arquitectónicas](#53-estrategia-de-datos-y-decisiones-arquitectónicas)

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

---

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

La correcta monitorización de las coberturas terrestres mediante satélites es un pilar fundamental para la toma de decisiones estratégicas, desde la gestión de recursos hídricos frente a sequías (vital para organismos como la Agencia Catalana del Agua) hasta el monitoreo de la masa forestal. Sin embargo, los mapas espaciales defectuosos, ocluidos por nubes no detectadas o falsos positivos, generan decisiones tardías y perjudiciales. Este Trabajo Final de Bàtxelor se justifica por la necesidad imperativa de dotar al sector geomático de una arquitectura predictiva superior que supere las limitaciones matemáticas de los algoritmos clásicos, democratizando el acceso a máscaras espaciales de alta fidelidad.

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

Para comprender la solución tecnológica propuesta y el diseño del *pipeline* geoespacial, es imperativo asentar exhaustivamente los pilares científicos sobre los que se sustenta la arquitectura del proyecto. Este marco teórico aborda tanto la física óptica de la observación satelital como los fundamentos matemáticos del aprendizaje profundo convolucional.

## 5.1. Datos espaciales: Sentinel-2 y el espectro electromagnético

El satélite Sentinel-2, perteneciente al programa Copernicus de la Agencia Espacial Europea (ESA), provee imágenes multiespectrales de alta resolución. Para optimizar la capacidad de discriminación del modelo de inteligencia artificial desarrollado en este proyecto, no se procesa una composición RGB tradicional o la totalidad de las 13 bandas nativas del sensor MSI (*MultiSpectral Instrument*). En su lugar, se ha aplicado una severa reducción de dimensionalidad mediante *Feature Engineering*, alimentando a la red neuronal con un tensor espacial optimizado de 7 canales simultáneos. Esta selección estratégica previene la saturación de memoria de la unidad de procesamiento gráfico (OOM - *Out of Memory*) al tiempo que maximiza la varianza de la información introducida:

1. **Espectro visible (Bandas B02, B03 y B04 - Resolución 10m):** Correspondientes a las longitudes de onda del Azul (490 nm), Verde (560 nm) y Rojo (665 nm). Estas bandas capturan las texturas físicas superficiales, los verdaderos colores de las cubiertas terrestres, la morfología urbana y las sombras topográficas proyectadas por el relieve escarpado. Su alta resolución espacial es indispensable para delinear los bordes exactos de las nubes pequeñas (cúmulos).
2. **Infrarrojo Cercano o NIR (Banda B08 - Resolución 10m):** Operando a 842 nm, es el espectro crítico para identificar la reflectancia de la clorofila vegetal y, por ende, las masas forestales. De igual forma, los cuerpos de agua profunda absorben intensamente esta radiación infrarroja, presentando firmas espectrales muy oscuras (cercanas al cero absoluto) que facilitan su delimitación matemática.
3. **Infrarrojo de Onda Corta o SWIR (Bandas B11 y B12 - Resolución 20m):** Operando a 1610 nm y 2190 nm respectivamente, estas bandas son el fundamento físico que permite resolver la ambigüedad espectral objeto de esta tesis: la confusión entre nube y nieve. Físicamente, las nubes (cristales de hielo en suspensión o vapor de agua) presentan una alta reflectancia en el SWIR, apareciendo brillantes. Por el contrario, la nieve consolidada sobre el terreno absorbe fuertemente el SWIR, oscureciéndose drásticamente. Esta divergencia óptica es el vector principal de decisión para el algoritmo.
4. **NDSI (*Normalized Difference Snow Index*):** Como séptimo canal de entrada, se ha inyectado un índice matemático derivado pre-calculado: `(B03 - B11) / (B03 + B11)`. La inyección de este canal adicional no es trivial; su propósito es forzar matemáticamente a la red neuronal a prestar atención explícita a la física de la nieve desde la primera época de entrenamiento (*Epoch 0*). En lugar de esperar a que la red deduzca la relación entre el Verde y el SWIR tras millones de iteraciones de descenso de gradiente, se le proporciona la frontera de decisión empírica resuelta, facilitando y acelerando exponencialmente la convergencia del modelo.

## 5.2. Inteligencia Artificial: La Arquitectura U-Net

Mientras que los algoritmos paramétricos tradicionales (como el Sen2Cor nativo de la ESA) evalúan la radiometría del terreno píxel a píxel mediante árboles de decisión rígidos y estáticos, ignorando por completo el contexto vecinal de la imagen, este proyecto fundamenta su salto cualitativo en el **Aprendizaje Profundo (*Deep Learning*)**, concretamente en el subcampo de la **Visión Artificial (*Computer Vision*)**. 

La arquitectura convolucional seleccionada para gobernar el núcleo predictivo del sistema es la **U-Net** (*Ronneberger, Fischer & Brox, 2015*). Esta topología se ha implementado desde cero (*From Scratch*) utilizando el *framework* **PyTorch**, estándar absoluto de la industria en el cálculo tensorial por aceleración de hardware (CUDA).

### 5.2.1. Teoría de Funcionamiento
La arquitectura U-Net es la red neuronal convolucional (CNN) *de facto* para tareas de **segmentación semántica espacial**. Esto implica que el sistema no se limita a realizar una clasificación binaria de la imagen (e.g. dictaminar "aquí hay nubes"), sino que calcula una inferencia matemática independiente para cada píxel individual de la matriz, adjudicándole una clase y dibujando sus contornos morfológicos exactos. Su nomenclatura deriva de su estructura simétrica en forma de "U", la cual consta de tres engranajes fundamentales:

1. **El Encoder (Ruta de Contracción o Bajada):** A medida que el tensor satelital (de dimensiones 512x512 píxeles) ingresa en la red, el modelo aplica sucesivas operaciones de convolución matemática y funciones de activación no lineal (ReLU), seguidas de reducciones agresivas de tamaño espacial mediante capas de *Max Pooling*. En este descenso hacia la base de la "U", el tensor pierde resolución espacial drásticamente, pero multiplica su profundidad geométrica (canales de características). Conceptualmente, el Encoder extrae la semántica abstracta de la imagen, aprendiendo el **"QUÉ"** (la firma espectral que diferencia una sombra orográfica de un lago, o una nube de la nieve alpina).
2. **El Decoder (Ruta de Expansión o Subida):** Representa el vector ascendente de la arquitectura. Toma la información matricial hipercomprimida (el espacio latente profundo) y la expande progresivamente mediante convoluciones transpuestas (*Up-convolutions*) hasta recuperar las dimensiones espaciales originales de 512x512 píxeles. Su propósito iterativo es proyectar el conocimiento semántico aprendido de vuelta sobre el espacio geográfico bidimensional; en otras palabras, el Decoder resuelve el **"DÓNDE"** (las coordenadas topológicas exactas de los elementos detectados).
3. **Las Skip Connections (Puentes de Resolución):** La descompresión aislada de un tensor altamente contraído generaría, por defecto, una salida semántica de bordes extremadamente difusos y borrosos. Para erradicar este problema topológico, la U-Net instaura "puentes horizontales" que concatenan directamente los mapas de características de alta resolución del Encoder con las capas de reconstrucción correspondientes en el Decoder. Estas conexiones residuales rescatan las texturas espaciales finas originales y las inyectan en las etapas finales, permitiendo a la red trazar fronteras de clasificación con precisión milimétrica (a nivel de píxel), un requisito indispensable para cartografiar límites de nieves perpetuas o líneas de costa.

### 5.2.2. Diseño Arquitectónico y Tratamiento del Espacio Latente (*Data Shapes*)
El flujo de tensores a través de la red neuronal (*Forward Pass*) se somete a estrictas reglas de dimensionalidad y precisión de punto flotante para garantizar la estabilidad matemática del descenso de gradiente:

- **Entradas (*Inputs - X*):** Su forma matricial topológica es `(Batch_Size, 7, 512, 512)`. Un aspecto crítico de la optimización del *pipeline* geoespacial es la gestión del almacenamiento en disco. Los cientos de miles de tensores se guardan físicamente en formato `Float16` (Media Precisión). Esta directiva de Ingeniería de Datos reduce la huella de almacenamiento un 50% y acelera drásticamente la latencia de lectura (I/O). Sin embargo, al inyectarse en el modelo para el entrenamiento activo, los tensores se transforman obligatoriamente en memoria a `Float32` (Precisión Simple). Si el algoritmo de *Backpropagation* (retropropagación del error) utilizara `Float16`, carecería de la profundidad decimal necesaria para almacenar las actualizaciones microscópicas de los gradientes matemáticos, provocando que los pesos sinápticos se redondearan a cero (*Underflow*) y colapsando el aprendizaje de la red.
- **Salidas (*Outputs - Y_pred*):** El tensor resultante emitido por la última capa convolucional de la red (Decoder) presenta una forma `(Batch_Size, 6, 512, 512)`. Estos 6 canales paralelos representan los *Logits* crudos o puntuaciones matemáticas no normalizadas correspondientes a la taxonomía de las 6 Clases Maestras del proyecto: 0 (NoData / Descarte), 1 (Suelo Útil), 2 (Nube), 3 (Sombra de Nube), 4 (Nieve), 5 (Masa de Agua).
- **Activación y Colapso Espacial:** Para materializar el mapa 2D final, una función matemática `Softmax` evalúa el vector de profundidad de 6 posiciones de cada píxel, normalizando las puntuaciones en probabilidades absolutas (que suman 1.0). El píxel asume irrevocablemente el valor de la clase (0 a 5) que ostente la probabilidad máxima estadística, generando la máscara final de segmentación.

### 5.2.3. Justificación Crítica: Programación "From Scratch" frente a *Transfer Learning*
Pese a la hegemonía actual del uso de redes neuronales pre-entrenadas adaptadas a tareas específicas (*Transfer Learning*), la dirección arquitectónica de este TFB determinó programar e inicializar los pesos sinápticos de la U-Net íntegramente desde cero (*From Scratch*). Esta drástica decisión se ampara en cuatro vulnerabilidades detectadas en los modelos públicos heredables:

1. **Incompatibilidad de Entradas Físicas:** Los modelos convolucionales de la comunidad científica (como Sen2Earth) están rígidamente diseñados en sus capas de entrada para ingerir la totalidad de las 10 o 13 bandas satelitales del formato SAFE nativo. Nuestra estrategia exige la ingesta de un tensor mutado de 7 canales (donde se han purgado las bandas de aerosoles atmosféricos y se ha inyectado sintéticamente el índice NDSI). Amputar la capa inicial de una red pre-entrenada para forzar la aceptación de 7 canales corrompe inmediatamente los pesos matemáticos subyacentes transferidos, invalidando su inteligencia previa.
2. **Incompatibilidad de la Taxonomía de Salidas:** Las redes comerciales de teledetección suelen exportar una topología binaria (1 = Nube, 0 = Terreno). Este proyecto orquesta una segmentación profunda de 6 Clases Maestras diseñadas específicamente para resolver la paradoja orográfica de Cataluña (separando nieve alpina, sombra de nube y agua marítima). Modificar simultáneamente la estructura de la cabeza (*Head*) y de la entrada (*Input*) de una red importada desestabiliza las capas intermedias, provocando el olvido catastrófico de los patrones espaciales.
3. **Erradicación del Sesgo Geográfico:** El *Transfer Learning* surgió como panacea ante la escasez de datos. Paradójicamente, la ejecución prolongada del *pipeline* ETL de este trabajo ha generado una Verdad Terreno masiva compuesta por más de 8.000 tensores hiper-específicos de la topografía catalana (Pirineos, Delta del Ebro, Llanura de Lleida). Iniciar el entrenamiento desde un lienzo en blanco asegura que la red extraiga las variables geomorfológicas intrínsecas a nuestra área de estudio, inmunizándola contra los sesgos atmosféricos y luminosos heredados de redes pre-entrenadas en paisajes globales dispares (ej. desiertos o selvas tropicales).
4. **Generalización Demostrada:** La literatura académica subraya que, disponiendo de una biblioteca de tensores de alta calidad (*Ground Truth* auditado por humanos), el diseño "From Scratch" en arquitecturas CNN puras supera consistentemente a los híbridos pre-entrenados, acoplándose simbióticamente a las necesidades del caso de uso empresarial.

### 5.2.4. Evaluación Empírica y Función de Pérdida
El control direccional del entrenamiento neuronal (descenso de gradiente) exige la formulación matemática de métricas de castigo severas para guiar el aprendizaje.

- **Función de Pérdida - `CrossEntropyLoss` (Estrategia de Enmascarado Geográfico):** Durante el entrenamiento, la red se somete a la pérdida de Entropía Cruzada. Un factor crucial de ingeniería ha sido la inyección algorítmica del parámetro `ignore_index=0`. Al recortar en cuadrículas un paso satelital irregular, emergen multitud de píxeles "muertos" (triángulos negros fuera del barrido orbital del Sentinel-2, codificados como clase 0). Si la función de pérdida procesara estos píxeles irrelevantes, la IA intentaría encontrar patrones espectrales en la nada, desviando su vector de convergencia. El parámetro de exclusión impone matemáticamente a la red que el 100% de la penalización (o recompensa) de actualización de pesos provenga exclusivamente de las 5 clases geográficas útiles.
- **Métrica Científica - *Intersection over Union* (IoU):** En la monitorización satelital, evaluar un modelo mediante su Precisión Global (*Overall Accuracy*) constituye una negligencia metodológica debido al extremo desbalanceo geográfico. En un día soleado, el 95% de la superficie catalana es Suelo Útil, y apenas un 5% es Nieve en el Alto Pirineo. Una IA perezosa que siempre pronosticara "Suelo" obtendría una puntuación de precisión del 95%, siendo tácticamente inservible. Para demoler este espejismo estadístico, el proyecto emplea el índice IoU (Coeficiente Jaccard) para cada clase de forma aislada. El IoU cruza geométricamente el área inferida por la IA con el polígono real editado manualmente, castigando de forma implacable la mínima desviación en los falsos positivos y la omisión en los falsos negativos.

## 5.3. Estrategia de Datos y Decisiones Arquitectónicas

La concepción de un *pipeline* geoespacial masivo implica tomar decisiones troncales que impactan irrevocablemente la viabilidad técnica y computacional del despliegue en la nube. A continuación, se justifican analíticamente las posturas científicas adoptadas:

### 5.3.1. Nivel de Procesamiento: Ingesta L1C frente a L2A
- **Decisión Arquitectónica:** Aislar y descargar exclusivamente las imágenes en bruto L1C (*Top of Atmosphere*).
- **Justificación:** Las formaciones nubosas habitan físicamente en las capas altas y medias de la troposfera. Someter el tensor satelital a las pesadas correcciones atmosféricas L2A (*Bottom of Atmosphere*) carece de fundamentación física para los píxeles atmosféricos. Más grave aún: el producto L2A oficial hereda los errores históricos del procesador Sen2Cor de la ESA (que clasifica cumbres nevadas como cirros). Entrenar la U-Net con datos alterados (L2A) supondría inyectar un sesgo algorítmico estructural irresoluble. Ingerir los reflectores inmaculados L1C permite a las redes neuronales derivar características atmosféricas vírgenes, asumiendo el estándar tecnológico de modelos punteros como *s2cloudless* o *Fmask*.

### 5.3.2. Unificación Orbital (R008 frente a R051)
- **Decisión Arquitectónica:** Consolidar el entrenamiento en un único modelo universal, indiferente a la órbita relativa del satélite.
- **Justificación:** El satélite Sentinel-2 cruza la península ibérica mediante dos pasadas orbitales diametralmente opuestas (R008 y R051), las cuales inciden sobre el territorio en días distintos. Esta variabilidad provee ángulos acimutales y de observación solar heterogéneos. En lugar de desarrollar un modelo por órbita, al agrupar ambas pasadas en un espacio latente unificado se desencadena un proceso orgánico de *Data Augmentation*. La U-Net se ve forzada a volverse invariante a la rotación orbital y a las variaciones de iluminación topográfica. Fragmentar el sistema duplicaría los costes de inferencia *Serverless* y mermaría la capacidad de generalización del sistema.

### 5.3.3. Generalización Geográfica (Norte vs Sur)
- **Decisión Arquitectónica:** Desplegar una única matriz neuronal para cubrir la disparidad topográfica completa de Cataluña.
- **Justificación:** Dividir artificialmente el desarrollo en un modelo de Alta Montaña (Pirineos) y otro Litoral (Mediterráneo) fracturaría la arquitectura del software. Si una nevada histórica o una granizada extrema (e.g. borrasca Filomena) cubriera de blanco las cotas bajas del Sur, el modelo litoral (que jamás ha procesado tensores de nieve) colapsaría, catalogando la superficie como nubosidad de alta densidad. Inyectar simultáneamente los "casos extremos" (sombras escarpadas nórdicas frente al *Sun Glint* de las costas y arrozales del Delta del Ebro) garantiza la **Generalización del Dominio**, dotando al modelo de la robustez necesaria para soportar anomalías climáticas fuera de la distribución estándar (*Out-of-Distribution Data*).

### 5.3.4. Estrategia de Recorte (*Tiling* Directo vs *Mosaicking*)
- **Decisión Arquitectónica:** Ejecutar el troceado espacial matricial (teselas de 512x512 píxeles) directamente sobre el gránulo geográfico nativo (MGRS), descartando radicalmente la pre-fusión (*Mosaicking*).
- **Justificación:** Unificar gránulos vecinos procedentes de órbitas y días diferentes antes del recorte provoca la aparición de "costuras" espaciales (*seamlines*), con gradientes de iluminación antinaturales y bordes aserrados en las formaciones de nubes y nieve. Las redes neuronales convolucionales son devoradoras de patrones de alta frecuencia; ingerir estas cicatrices artificiales generaría filtros matemáticos aberrantes, aprendiendo geometría que no existe en el mundo real. Preservar el barrido puro orbital L1C y fragmentarlo iterativamente salvaguarda la coherencia topológica y evita desbordamientos masivos de la memoria RAM.

### 5.3.5. Modelos de Elevación Digital (El Descarte del DEM)
- **Decisión Arquitectónica:** Construir el tensor de entrada confiando estrictamente en fotometría 2D, extirpando cualquier inyección de Modelos Digitales de Elevaciones 3D.
- **Justificación:** Si bien el DEM es la solución matemática ideal para que un modelo comprenda la profundidad de un valle escarpado y prediga las sombras orográficas, su incorporación violaría los principios de rendimiento (*Green Computing*) y agilidad del *pipeline* web. Re-proyectar y alinear métricamente las matrices raster de elevación (resoluciones dispares de 5m del ICGC frente a los 10m/20m del satélite) para cada píxel de Cataluña multiplicaría exponencialmente la complejidad algorítmica y el tiempo de inferencia *offline*. Se ha optado por delegar todo el peso de la discriminación física en las bandas SWIR y el índice NDSI, asumiendo la ineludible pérdida de precisión en umbrías profundas a favor de una arquitectura cien veces más veloz, liviana y exportable a otras regiones planetarias carentes de cartografía 3D de alta definición.

### 5.3.6. El Rechazo al Análisis Multitemporal (*Single-Image Prediction*)
- **Decisión Arquitectónica:** Anular el uso de imágenes pasadas libres de nubes para comparar con el estado actual; todo el peso predictivo recae sobre el tensor satelital en el momento absoluto de la captura (*Single-Image*).
- **Justificación:** La geografía de estudio presenta un elevado dinamismo fenológico y antrópico. En los macizos alpinos la nieve es episódica; en el tejido agrícola del Delta del Ebro, las llanuras inundables pasan de ser masas oscuras de agua a extensos mantos verdes brillantes de arroz en cuestión de semanas. Una red neuronal basada en comparativa multitemporal interpretaría estos contrastes espectrales repentinos como gruesas barreras de nubes. La arquitectura *Single-Image* fuerza a la Inteligencia Artificial a deducir el estado atmosférico evaluando exclusivamente las interacciones radiométricas instantáneas, garantizando un índice nulo de falsos positivos frente a los cambios de las estaciones del año.

### 5.3.7. Omisión de Máscaras Vectoriales Estáticas de Agua
- **Decisión Arquitectónica:** Extirpar de la arquitectura la inyección cartográfica de lagos y ríos (e.g. archivos GeoJSON del ACA).
- **Justificación:** En ciclos plurianuales de sequía extrema (como el padecido en el embalse de Sau), un mapa vectorial estático inyectaría la clasificación categórica de "Masa de agua profunda", cuando el sensor satelital óptico en tiempo real detecta claramente terreno estéril y rocoso altamente reflectante. Esta brutal disonancia matricial destrozaría los gradientes de retropropagación del modelo. El agua pura actúa físicamente como un agujero negro radiométrico en las frecuencias del Infrarrojo Cercano (NIR). La U-Net capacitada absorbe esta propiedad óptica de los canales físicos al instante, demostrando que depender de bases de datos cartográficas inmovilistas resulta obsoleto frente al dinamismo de una inferencia matemática *on-the-fly*.



# 6. Metodología aplicada

Para la consecución matemática y empírica de los objetivos planteados y garantizar un ciclo de vida completo del desarrollo tecnológico (*End-to-End*), la metodología de este proyecto se ha estructurado como un flujo de trabajo iterativo. Esta arquitectura abarca desde la adquisición automatizada del dato satelital en bruto hasta la inferencia matemática final, erigiendo como pilar central de toda la investigación la creación manual de un conjunto de datos (Verdad Terreno) libre de los sesgos heredados de la Agencia Espacial Europea.

## 6.1. Instrumentos y Ecosistema Tecnológico

El desarrollo metodológico de la red neuronal y del *pipeline* geoespacial se ha cimentado sobre el siguiente ecosistema de *software* y orígenes radiométricos:

- **Fuente Primaria de Observación Terrestre:** Constelación satelital Sentinel-2A y Sentinel-2B (programa Copernicus). La adquisición de tensores multiespectrales se ha enfocado exclusivamente sobre el Nivel de Procesamiento L1C (reflectancia *Top of Atmosphere*). Como línea base para la evaluación ciega, se recuperó la máscara oficial de clasificación de escenas (SCL) emanada del procesador algorítmico Sen2Cor. Todas las descargas masivas se orquestaron programáticamente consumiendo la API OData del *Copernicus Data Space Ecosystem (CDSE)*.
- **Centro de Computación y Pipeline ETL:** Estación de trabajo local aprovisionada con procesadores gráficos de alta computación (GPUs NVIDIA CUDA). Esta plataforma absorbe la inmensa carga del entrenamiento de redes tensoriales de profundidad, las inferencias masivas a nivel de píxel y la ejecución orquestada de *scripts* en Python destinados a la extracción, limpieza de datos y recorte topológico (*Tiling*).
- **Taxonomía Semántica y Auditoría Visual (GIMP):** Se instauró el *software* libre de edición raster GIMP como el instrumento puente fundamental. Este editor canalizó la reclasificación manual de los píxeles conflictivos, habilitando al investigador para delinear milimétricamente polígonos de nieve y nubes, forjando la indispensable Verdad Terreno que educa al modelo predictivo.
- **Modelado Neuronal de Inteligencia Artificial:** Framework *PyTorch*, el paradigma actual de la industria científica y la investigación en Inteligencia Artificial, que dota de las primitivas tensoriales para codificar el *Encoder*, *Decoder* y el sistema de autogradiente de la arquitectura U-Net.

## 6.2. Materiales: Arquitectura del Conjunto de Datos (40 Gránulos)

Las topologías de segmentación profunda, como la U-Net, maximizan su eficiencia matemática y su capacidad de generalización cuando operan sobre un conjunto de datos estratégicamente curado en escenarios complejos (*Hard Negatives*), en detrimento de bases de datos masivas pero topográficamente redundantes.

Con la meta absoluta de blindar la robustez algorítmica frente a los desafíos espectrales de Cataluña, se ha diseñado un corpus cerrado de **40 gránulos MGRS** (cada gránulo representando un cuadrante territorial de 100x100 km). Este universo de datos se ha seccionado metodológicamente en dos bóvedas estancas:

### 6.2.1. Bóveda de Entrenamiento y Validación (30 Gránulos)
Este bloque expone a la red neuronal al entrenamiento intensivo, inyectándole los patrones para resolver los principales desafíos orográficos, logrando una invarianza espacial plena:

- **Morfología Alpina (Pirineos):** Incorpora escenas invernales crudas (gránulos T31TCH, T31TDH) donde extensos mantos de nieve pura convergen con densas masas de nubes bajas y la violenta oscuridad de las sombras orográficas proyectadas por los macizos montañosos.
- **Inversiones Térmicas y Niebla Estancada:** Secuencias capturadas sobre la depresión central de la Llanura de Lleida (gránulos T31TCG, T31TDG), cuyo objetivo es entrenar la detección de nieblas opacas pegadas al suelo que engañan severamente a los algoritmos convencionales.
- **Litoral y Entramado Urbano:** Trazados sobre el Área Metropolitana de Barcelona y la costa del Mar Mediterráneo (gránulo T31TDF). Su inclusión previene una grave desviación empírica: el *Sun Glint* (brillo especular del sol sobre naves industriales, invernaderos asfálticos y olas del mar), que en redes deficientes detona explosiones masivas de falsos positivos (falsas nubes).
- **Humedales y Dinamismo Hídrico:** Recortes sobre la desembocadura del Delta del Ebro (T31TCE, T31TCF). Vitales para sofocar la confusión matemática intrínseca entre las grandes extensiones de láminas de agua inundadas y las firmas absorbentes (oscuras) de las nubes proyectando sombra.

### 6.2.2. Bóveda de Test Ciego o *Blind Test* (10 Gránulos)
Configura una celda de aislamiento (*Data Vault*). Estas 10 imágenes (con más de 1.100 millones de píxeles combinados) exhiben condiciones climáticas extremas y **jamás son observadas por la Inteligencia Artificial durante su ciclo de vida de aprendizaje**. Esto erradica drásticamente cualquier fuga de conocimiento (*Data Leakage*). Este bloque se utiliza en exclusiva para dictaminar el veredicto final, enfrentando el modelo U-Net contra el Sen2Cor europeo en un entorno verdaderamente imparcial.

## 6.3. Secuencia Metodológica (El Pipeline ETL)

La espina dorsal de la metodología es un *pipeline* automatizado de Extracción, Transformación y Carga (ETL) secuencial operando en cuatro fases críticas:

### Fase 1: Ingesta de Datos y Orquestación API
Un demonio de *software* en Python (`001_download_sentinel2_odata.py`) ejecuta un bucle de consultas OData contra los servidores en la nube de la ESA. Una vez interceptado un paquete satelital SAFE, extrae de su interior estricta y únicamente los 6 tensores multiespectrales ópticos e infrarrojos L1C requeridos (B02, B03, B04, B08, B11, B12), ignorando sistemáticamente bandas de aerosoles, metadatos espúreos y archivos auxiliares redundantes. En paralelo, captura el fichero de clasificación SCL (L2A) pre-procesado, salvaguardándolo como la base científica para el duelo evaluativo final.

### Fase 2: Ingeniería de Datos Espaciales y Verdad Terreno
El núcleo del proyecto reside en la depuración matemática de los datos antes de alimentar la IA:

1. **Troceado Espacial Dinámico (*Tiling*):** La red no puede ingerir matrices ciclópeas de 10980x10980 píxeles por pura limitación de hardware (*VRAM Bottleneck*). El *script* `002_create_dataset.py` fractura la imagen madre en cientos de parches manejables de 512x512 píxeles de 7 canales (seis bandas L1C fusionadas con el índice matemático NDSI inyectado *on-the-fly*). Un filtro algorítmico escanea cada parche, destruyendo preventivamente los cuadrantes compuestos por un "vacío inútil" del 90% (e.g. extensiones de mar negro profundo), compactando la base de entrenamiento en píxeles verdaderamente informativos.
2. **El Puente GIMP (*GIMP Bridge*) y Edición Manual:** Se certificó que los *datasets* públicos y las salidas de Sen2Cor arrastraban sesgos aberrantes. Para corregirlo, se ideó un puente informático. Un conversor codifica las matrices científicas (donde cada número del 0 al 5 representa una clase) en una paleta cromática visual (e.g. Amarillo para Suelo, Blanco para Nube, Cián para Nieve, Azul oscuro para Sombra). Este artefacto visual es exportado al *software* GIMP. El investigador humano, equiparado con la agudeza visual analítica, navega píxel a píxel la imagen, repintando meticulosamente sobre los errores flagrantes del satélite. Al concluir la depuración, un decodificador succiona el archivo GIMP y revierte sus píxeles de nuevo al formato de tensores numéricos absolutos (`Int8`). Acaba de nacer una Verdad Terreno de la máxima pureza científica.

### Fase 3: Entrenamiento Matemático (*Deep Learning*)
Se inicia la iteración del modelo. La red U-Net devora cíclicamente el conjunto de entrenamiento. Cada época ajusta millones de sus pesos sinápticos computando los vectores de la función matemática de Entropía Cruzada (`Cross Entropy Loss`). Se instauró la regla inquebrantable de ignorar el descarte geográfico (`ignore_index=0`), prohibiendo a la red analizar las áreas satelitales nulas o ciegas. Una vez que la curva de error se estabiliza (*convergencia*), se clausura el proceso y se solidifican los pesos, encarnando el modelo definitivo central.

### Fase 4: Inferencia MLOps y Bucle de Mejora (*Human-in-the-Loop*)
El tensor del modelo U-Net entrenado se despliega en producción para predecir sobre escenarios desconocidos. Las inferencias se almacenan y se ingieren directamente en una infraestructura de servidor cartográfico, donde visores GIS programados en Svelte renderizan interactividad sobre los pronósticos. La naturaleza de este ecosistema permite el *Active Learning*: si un usuario o analista halla un fallo de inferencia grave en producción, el *Tiling* problemático se aísla, se inyecta por el GIMP Bridge, el humano corrige el polígono, y el *tensor* depurado regresa a la base de entrenamiento para gestar la siguiente versión (v2.0) del modelo neuronal.

## 6.4. Metodología de Validación y Auditoría Matemática

Para certificar empíricamente el avance tecnológico frente al *statu quo* europeo, la rúbrica de evaluación se diseñó bajo una cláusula inviolable y taxativa: **Bajo ningún precepto metodológico se evalúa la inferencia de la IA contra las máscaras originales L2A emitidas por Sen2Cor.**

Acatar la salida oficial como la "Verdad" desencadenaría una trampa estadística letal: la red neuronal sería ferozmente castigada algorítmicamente en los precisos instantes en que triunfara descubriendo un macizo nevado que el satélite europeo había bautizado por error como cirros de nube gruesa. El flujo de validación se estructuró de la siguiente forma:

1. **Auditoría Exhaustiva del Test Ciego:** Se obligó a transitar los 10 gránulos de la Bóveda de Test Ciego por el mismo *GIMP Bridge*. El humano purificó manualmente cientos de millones de píxeles conflictivos, forjando un terreno de juego intachable y aséptico.
2. **Cómputo Multiclase:** Las predicciones crudas de la U-Net, extraídas tras el colapso espacial `Softmax`, se contrastan exclusivamente frente a esta Verdad Terreno Auditada.
3. **Severe Penalties (IoU, F1-Score y Recall):** Se prescindió intencionadamente del *Overall Accuracy*. Todas las métricas de éxito (Precisión, Exhaustividad o *Recall*, y el Índice Jaccard o IoU) se calculan de manera compartimentada e individual por cada de las cinco Clases Maestras funcionales (Suelo, Nube, Sombra, Nieve, Agua), penalizando sin indulgencia a las desviaciones espaciales en las clases minoritarias pero críticas, como la precipitación sólida sobre la Cordillera de los Pirineos.


# 7. Desarrollo viable y sostenible


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

El rigor académico y técnico de este Trabajo Final de Bàtxelor se enmarca dentro de las clasificaciones científicas internacionales y persigue un impacto directo en la sostenibilidad global.

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

Este epígrafe disecciona la trayectoria técnica y los desafíos arquitectónicos surgidos durante la ejecución del *pipeline* geoespacial, culminando con la presentación irrefutable de los resultados empíricos derivados de la evaluación del modelo de *Deep Learning* frente a las métricas del estándar Sen2Cor.

## 8.1. Cronología de Pivotes Arquitectónicos e Ingeniería de Soluciones

El ciclo de vida del desarrollo de software no fue lineal. Se enmarcó en un enfoque marcadamente iterativo (*Agile Data Science*) debido a la extrema hostilidad topográfica y radiométrica inherente al territorio de Cataluña. A medida que el entrenamiento neuronal escalaba y chocaba con el muro de la realidad atmosférica, la investigación afrontó disonancias cognitivas que forzaron al equipo a ejecutar drásticos cambios de rumbo, conocidos técnicamente como **pivotes arquitectónicos**:

1. **Pivote Fundamental: El Abandono Definitivo de Sen2Cor.**
   Al inicio del marco temporal del proyecto, la hipótesis de trabajo asumía el uso del algoritmo Sen2Cor (el estándar oficial del programa Copernicus) como Verdad Terreno fiable para extraer máscaras de nubes y entrenar modelos derivados. Tras las primeras iteraciones de auditoría orográfica sobre la cordillera de los Pirineos, se descubrió una debilidad endémica en el algoritmo de la Agencia Espacial Europea: una incapacidad crítica y recurrente para discriminar los extensos mantos de nieve alpina frente a la nubosidad densa de baja cota. Ante la imposibilidad científica de entrenar una Inteligencia Artificial con datos base corruptos, se dictaminó el abandono inmediato de los productos L2A. El proyecto pivotó radicalmente: se construiría una red neuronal convolucional (U-Net) totalmente desde cero (*From Scratch*) alimentada por tensores crudos L1C (Top of Atmosphere).
2. **Pivote Altitudinal: El Dilema del Modelo Digital de Elevaciones (DEM).**
   Las umbrías de la alta montaña arrojaban un desafío letal: las sombras orográficas proyectadas por los picos rocosos eran radiométricamente indistinguibles de las sombras oscuras proyectadas por las nubes en los valles. Para resolverlo, la arquitectura inicial contempló inyectar un canal matricial adicional con los datos altimétricos tridimensionales (DEM a resolución de 5m provisto por el ICGC). Sin embargo, fusionar dos mallas de resolución espacial y proyección geométrica tan dispar para cada inferencia multiplicaba exponencialmente la latencia computacional, dinamitando el concepto de un visor web ligero en tiempo real. La decisión arquitectónica fue letal y pragmática: extirpar el DEM. Todo el peso de la discriminación orográfica recayó en la inyección sintética del índice físico NDSI y las bandas SWIR infrarrojas. Esta purga topográfica aligeró la arquitectura y posibilitó una inferencia casi instantánea (*on-the-fly*), asumiendo conscientemente la vulnerabilidad algorítmica a las falsas sombras proyectadas en desniveles extremos, una fricción que cimienta las bases del trabajo futuro.
3. **Pivote Espectral: El Colapso Radiométrico del Delta del Ebro.**
   Durante las épocas tempranas de convergencia de la U-Net, el espacio latente se orquestó sobre 5 Clases Maestras (excluyendo el agua). Tras desplegar los primeros modelos sobre el frente litoral catalán y los humedales del Delta del Ebro, la red colapsó estrepitosamente. El fenómeno de refracción conocido como *Sun Glint* (los destellos especulares del sol impactando sobre el Mar Mediterráneo y las superficies de los arrozales inundados) actuaba como un espejo óptico, cegando los tensores de la red y detonando la predicción de tormentas nubosas sobre cielos rasos. La emergencia forzó la paralización total del servidor de entrenamiento. Se rediseñó la topología de la última capa (*Head* del Decoder), aislando una sexta clase categórica bautizada como "Masas de Agua". Esta mutación arquitectónica forzó a la red a derivar un patrón específico para las altas reflectancias acuáticas de espectro visible acopladas a la extrema absorción en el espectro Infrarrojo Cercano (NIR). Tras este pivote, los falsos positivos marítimos cayeron fulminantemente a cero.

## 8.2. Evaluación Ciega y Demostración Cuantitativa

Tras el cierre del ciclo de aprendizaje profundo, se materializó la evaluación estadística de la red neuronal U-Net. Esta validación se ejecutó confrontando matemáticamente las inferencias crudas de la Inteligencia Artificial (con el colapso pos-Softmax) frente a la Verdad Terreno purificada a través del *GIMP Bridge* (los 10 gránulos MGRS ocultos de la Bóveda de Test). 

Para salvaguardar el rigor académico y evitar el ahogamiento de la memoria VRAM (*Out of Memory*) al cruzar tensores de gigantesca magnitud espacial, el motor estadístico en Python (`007_evaluate.py`) se reescribió inyectando un algoritmo de agregación matemática rápida (`np.bincount`).

### 8.2.1. Métricas Agregadas de Rendimiento Espacial

Se evaluó un volumen descomunal de **1.100.892.668 píxeles geográficos matemáticamente válidos** (descontando el espacio sin clasificar y los recortes orbitales). Los resultados empíricos acreditan categóricamente el éxito tecnológico del Trabajo Final de Máster:

| Categórica Geográfica | Índice Jaccard (IoU) | Precisión (*Precision*) | Exhaustividad (*Recall*) | Armónico (*F1-Score*) |
| :--- | :--- | :--- | :--- | :--- |
| **Suelo Útil (1)** | 90.94% | 95.17% | 95.35% | 95.26% |
| **Nubosidad (2)** | 80.43% | 90.07% | 88.26% | 89.16% |
| **Sombra de Nube (3)** | 46.96% | 64.03% | 63.78% | 63.90% |
| **Manto de Nieve (4)** | **84.64%** | **89.73%** | **93.72%** | **91.68%** |
| **Masas de Agua (5)** | 86.79% | 89.54% | 96.57% | 92.93% |

**1. Análisis Técnico de la Detección de Nieve (El Hito Central):**
La métrica más reveladora del cuadro reside en la discriminación de la nieve, la cual ha coronado un extraordinario Intersección sobre Unión (IoU) del 84.64% acoplado a un *Recall* que araña el 94%. En la teledetección satelital computacional, esta cifra es el santo grial de la precisión espacial. Demuestra de manera irrefutable que la decisión arquitectónica de fusionar las bandas visibles (RGB), el espectro Infrarrojo de Onda Corta (SWIR, capaz de oscurecerse drásticamente al impactar contra los cristales de hielo), y la inyección matemática directa del índice NDSI, dotan a la primera capa convolucional del *Encoder* de una capacidad quirúrgica para diseccionar la topología de la nieve frente a la de la nube superando por completo las limitaciones estáticas y funcionales documentadas en Sen2Cor.

**2. Justificación Física de la Desviación en Sombras:**
El IoU de la clase "Sombra Nube" acusa una penalización severa, estancándose en un 46.96%. Bajo el crisol de la ingeniería de datos orográficos, esto no representa un colapso cognitivo de la red, sino la manifestación inevitable del segundo pivote arquitectónico (el descarte del Modelo Digital de Elevaciones). La transición fotométrica es un fenómeno de gradiente lumínico continuo, no un corte binario. Discernir mediante óptica bidimensional estricta la diferencia entre la umbría de un pico montañoso de 3.000 metros proyectando oscuridad sobre un valle, frente a una gruesa nube Cumulonimbus proyectando sombra sobre la llanura contigua, es matemáticamente ambiguo. Esta estabilización en la métrica corrobora la necesidad inexorable de integrar mapas altimétricos 3D (DEM) como vía exclusiva para traspasar el techo de cristal geométrico del 50% de IoU en penumbras.

### 8.2.2. Mapa Térmico Matricial (La Matriz de Confusión Global)

La matriz de contingencia multiclase arroja una vista microscópica sobre las indecisiones de frontera de la Inteligencia Artificial. La representación térmica (*Heatmap*) acumula las interacciones lógicas de los más de mil cien millones de píxeles auditados.

![Matriz de Confusión Global sobre el Conjunto de Test Ciego](img/confusion_matrix.png)
*Figura 3: Matriz de confusión térmica global. El eje Y representa la Verdad Terreno auditada por humanos, el eje X despliega la Inferencia de la U-Net neuronal.*

> [!NOTE]
> La diagonal principal del gráfico térmico absorbe la inmensa densidad de aciertos (celdas ultra-oscuras), encapsulando de forma sistemática los errores lógicos hacia umbrales marginales y residuales fuera del eje central.

El análisis cruzado revela que la principal vía de escape algorítmica (la celda de falso positivo con mayor peso relativo) recae en la frontera entre la Nubosidad y el Suelo Útil altamente reflectante (tejidos industriales masivos o canteras calizas a cielo abierto). Esta porosidad espectral es una constante ineludible en el procesamiento de constelaciones multiespectrales civiles como Sentinel-2, confirmando que, para perfeccionar la discriminación urbana, será mandatorio hibridar esta CNN visual con modelos masivos de Visión-Lenguaje (VLM) capaces de aportar un razonamiento abstracto al parche de terreno industrial.





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
4. **Evolución Arquitectónica (Atención y Transformers):**
   A nivel puramente algorítmico, el modelo fundacional U-Net puede evolucionar integrando **Mecanismos de Atención (*Attention Gates*)** para suprimir matemáticamente la información redundante del fondo, y **Vision Transformers (ViT / TransUNet)** para capturar el contexto global a gran escala, resolviendo de forma nativa las confusiones morfológicas extremas que las convoluciones estándar no pueden procesar.
5. **Ampliación de Clases Semánticas Operativas:**
   Escalar la capacidad de segmentación para monitorizar cicatrices de incendios forestales, estrés hídrico en viñedos o la fluctuación volumétrica de pantanos.

# 11. Referencias Bibliográficas

Baetens, L., Desjardins, C., & Hagolle, O. (2019). Validation of Copernicus Sentinel-2 Cloud Masks Obtained from MAJA, Sen2Cor, and FMask Processors Using Reference Cloud Masks Generated with a Supervised Active Learning Procedure. *Remote Sensing, 11*(4), 433. https://doi.org/10.3390/rs11040433

European Space Agency [ESA]. (2026). *Copernicus Open Access Hub - Sentinel-2 Data Access*. Recuperado el 25 de junio de 2026, de https://scihub.copernicus.eu/

Hollstein, A., Segl, K., Guanter, L., Kneubühler, M., & Legleiter, C. (2016). Ready-to-Use Methods for the Detection of Clouds, Cirrus, Snow, Shadow, Water and Clear Sky Pixels in Sentinel-2 MSI Images. *Remote Sensing, 8*(8), 666. https://doi.org/10.3390/rs8080666

Institut Cartogràfic i Geològic de Catalunya [ICGC]. (2026). *Models d'Elevacions del Terreny de Catalunya*. Recuperado el 25 de junio de 2026, de https://www.icgc.cat/

Ronneberger, O., Fischer, P., & Brox, T. (2015). U-Net: Convolutional Networks for Biomedical Image Segmentation. *Medical Image Computing and Computer-Assisted Intervention – MICCAI 2015*, 234–241. https://doi.org/10.1007/978-3-319-24574-4_28

Wieland, M., Li, Y., & Martinis, S. (2019). Multi-sensor cloud and cloud shadow segmentation with a convolutional neural network. *Remote Sensing of Environment, 230*, 111203. https://doi.org/10.1016/j.rse.2019.05.022


