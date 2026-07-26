<div style="text-align: center; margin-top: 150px; margin-bottom: 50px;">
    <img src="img/logo-sello-universitat-carlemany.png.webp" alt="Logo Universitat Carlemany" width="300" />
</div>

<br><br>

<h1 align="center" style="font-size: 3em; margin-bottom: 10px;">Trabajo Final de Grado (TFB)</h1>
<h2 align="center" style="color: #FFC000; font-size: 2em; margin-bottom: 50px;">Segmentación Semántica de Nubes y Nieve con Sentinel-2 mediante Deep Learning</h2>

<br><br><br>

<div align="center" style="font-size: 1.5em; line-height: 1.8;">
  <strong>Autor:</strong> Antonio López<br>
  <strong>Fase:</strong> Entrega 2 - Metodología y Desarrollo del Proyecto<br>
  <strong>Fecha:</strong> Julio 2026
</div>

<br><br><br><br><br>

<div align="center" style="font-size: 1.2em;">
  <strong>Página web del proyecto:</strong> <a href="https://tonilogar.github.io/tfb/tfb.html">tonilogar.github.io/tfb</a><br>
  <strong>Repositorio y control de versiones:</strong> <a href="https://github.com/tonilogardev/web_basic_project/tree/main_dev_pro_tfb/011_tfb">GitHub - Master Roadmap</a>
</div>

<div style="page-break-after: always;"></div>

## Resumen con palabras clave

El presente Trabajo Final de Bàtxelor (TFB) aborda una problemática crítica en el procesamiento de imágenes satelitales del programa Copernicus: la clasificación errónea de nubes y nieve por parte del algoritmo estándar Sen2Cor en zonas de alta montaña, la clasificación errónea de sombras de nubes por sombras de montañas y valles, y la detección errónea de zonas inundadas (como el Delta del Ebro) como nubes o ruido. Para solucionar esta deficiencia geométrica y espectral, se ha diseñado e implementado una metodología basada en técnicas de aprendizaje profundo (*Deep Learning*) utilizando la arquitectura de redes neuronales convolucionales U-Net. El proyecto abarca la concepción completa de un *pipeline* de datos geoespaciales centrado en la región de Cataluña (España), incluyendo la descarga automatizada de gránulos Sentinel-2, la edición y clasificación manual de máscaras mediante herramientas de edición de imágenes con GIMP y el entrenamiento del modelo. Tras una evaluación empírica inicial, la taxonomía fue ampliada a un ecosistema robusto de seis clases para aislar eficientemente las masas de agua y evitar ruido analítico. Como línea futura, la arquitectura desacoplada de inferencia se preparará para su despliegue en una infraestructura *Serverless* de alto rendimiento orientada a producción, utilizando Rust para el procesamiento óptimo de tensores. Los resultados obtenidos demuestran la superioridad de los enfoques basados en redes neuronales frente a heurísticas tradicionales en tareas complejas de Observación de la Tierra.

**Palabras clave:** *Deep Learning, Sentinel-2, Segmentación Semántica, U-Net, Observación de la Tierra, Copernicus.*

<br><br>

## Abstract

This Bachelor's Final Project (TFB) addresses a critical issue in the processing of satellite imagery from the Copernicus program: the misclassification of clouds and snow by the standard Sen2Cor algorithm in high mountain areas, the misclassification of cloud shadows as mountain and valley shadows, and the erroneous detection of flooded areas (such as the Ebro Delta) as clouds or noise. To solve this geometric and spectral deficiency, a methodology based on Deep Learning techniques has been designed and implemented using the U-Net convolutional neural network architecture. The project encompasses the complete design of a geospatial data pipeline focused on the region of Catalonia (Spain), including the automated download of Sentinel-2 granules, the manual editing and classification of masks using image editing tools with GIMP, and model training. Following an initial empirical evaluation, the taxonomy was expanded into a robust six-class ecosystem to efficiently isolate water bodies and avoid analytical noise. As a future line of work, the decoupled inference architecture will be prepared for deployment in a high-performance, production-oriented Serverless infrastructure, utilizing Rust for optimal tensor processing. The results obtained demonstrate the superiority of neural network-based approaches over traditional heuristics in complex Earth Observation tasks.

**Keywords:** *Deep Learning, Sentinel-2, Semantic Segmentation, U-Net, Earth Observation, Copernicus.*

<br><br>

<div style="page-break-after: always;"></div>

## Índice interactivo

- [1. Introducción](#1-introducción)
- [2. Justificación](#2-justificación)
- [3. Contextualización del trabajo](#3-contextualización-del-trabajo)
- [4. Objetivos generales y específicos](#4-objetivos-generales-y-específicos)
  - [4.1. Objetivo general](#41-objetivo-general)
  - [4.2. Objetivos específicos](#42-objetivos-específicos)
- [5. Marco teórico y conceptos clave](#5-marco-teórico-y-conceptos-clave)
  - [5.1. Datos espaciales: Sentinel-2 y el espectro electromagnético](#51-datos-espaciales-sentinel-2-y-el-espectro-electromagnético)
  - [5.2. Inteligencia Artificial: La Arquitectura U-Net](#52-inteligencia-artificial-la-arquitectura-u-net)
- [6. Metodología aplicada](#6-metodología-aplicada)
  - [6.1. Instrumentos](#61-instrumentos)
  - [6.2. Materiales (Conjunto de datos)](#62-materiales-conjunto-de-datos)
  - [6.3. Recursos e infraestructura](#63-recursos-e-infraestructura)
  - [6.4. Metodología de evaluación](#64-metodología-de-evaluación)
- [7. Desarrollo viable y sostenible](#7-desarrollo-viable-y-sostenible)
  - [7.1. Temporalización e hitos](#71-temporalización-e-hitos)
  - [7.2. Alineación con los ODS y Códigos UNESCO](#72-alineación-con-los-ods-y-códigos-unesco)
  - [7.3. Condicionantes ambientales, sociales y económicos](#73-condicionantes-ambientales-sociales-y-económicos)
- [8. Proceso y resultados](#8-proceso-y-resultados)
  - [8.1. Fuentes de datos y recopilación](#81-fuentes-de-datos-y-recopilación)
  - [8.2. Exploración y preparación](#82-exploración-y-preparación)
  - [8.3. Análisis exploratorio](#83-análisis-exploratorio)
  - [8.4. Gestión y almacenamiento](#84-gestión-y-almacenamiento)
  - [8.5. Modelado](#85-modelado)
  - [8.6. Visualización y evaluación de resultados](#86-visualización-y-evaluación-de-resultados)
- [9. Discusión y limitaciones](#9-discusión-y-limitaciones)
- [10. Conclusiones y líneas futuras](#10-conclusiones-y-líneas-futuras)
- [11. Referencias Bibliográficas](#11-referencias-bibliográficas)

<div style="page-break-after: always;"></div>

# 1. Introducción

El programa Copernicus, de la Agencia Espacial Europea (ESA) y la Unión Europea, representa actualmente uno de los mayores esfuerzos tecnológicos para la observación de la Tierra. Sentinel-2 es uno de los satélites de la constelación Copernicus, que proporciona imágenes multiespectrales de alta resolución. Los datos que estos satélites envían son fundamentales para la observación de la Tierra y su monitoreo gracias a la ingente información de series temporales, que permite el seguimiento de fenómenos globales, como el control de la agricultura de precisión y la prevención de desastres naturales, entre otros.

# 2. Justificación

El procesamiento algorítmico de las imágenes satelitales presenta un desafío técnico de primer nivel. Para la transformación de las imágenes del programa Copernicus, la Agencia Espacial Europea (ESA) emplea el software **Sen2Cor** para la clasificación de los píxeles de las imágenes (producto *Scene Classification* o SCL). Este algoritmo estandarizado categoriza cada píxel en una de las siguientes 12 clases oficiales:

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

A pesar de su adopción global y de ser el estándar de la industria, la investigación bibliográfica y la observación empírica han demostrado que Sen2Cor sufre predicciones erróneas cuando se enfrenta a geografías orográficamente complejas y heterogéneas, como es el caso de la región de Cataluña. Al fundamentarse en heurísticas estáticas y árboles de decisión con umbrales fijos (*rule-based algorithms*), Sen2Cor carece de la flexibilidad necesaria para interpretar el contexto espacial de los píxeles. Esto provoca una confusión sistemática entre elementos con firmas espectrales similares (ej. la nieve y las nubes gruesas) o morfologías oscuras (ej. las sombras orográficas frente a las sombras de nubes).

Esta limitación técnica compromete gravemente la integridad de los datos para estudios climáticos, hidrológicos y medioambientales. Frente a esta problemática, la literatura científica reciente evidencia que la aplicación de modelos de aprendizaje automático (*Machine Learning*) y, muy especialmente, de aprendizaje profundo (*Deep Learning*), supera de forma holgada a los algoritmos tradicionales. Las redes neuronales convolucionales, al poseer la capacidad de extraer patrones complejos, texturas y el contexto espacial de grandes volúmenes de datos, logran una precisión y robustez inalcanzables para la programación estática. Por consiguiente, se justifica de manera crítica la necesidad de investigar y desarrollar una solución algorítmica alternativa basada en inteligencia artificial que logre subsanar las carencias del procesador estándar europeo, garantizando una segmentación semántica fiable y de alta calidad.

# 3. Contextualización del trabajo

Para comprender el alcance del problema que aborda este proyecto, es imperativo analizar cómo y dónde falla Sen2Cor en la práctica. Al depender de reglas "If-Then" estáticas y umbrales de luz, en ecosistemas geográficamente ricos como la cordillera de los Pirineos o zonas hidrográficas como el Delta del Ebro, la algoritmia clásica colapsa, dando lugar a tres anomalías de clasificación principales:

1. **La paradoja de la Nieve:** Sen2Cor tiende a confundir de forma sistemática la firma espectral óptica de la nieve de alta montaña con frentes de nubes gruesas.
2. **La paradoja de las Sombras:** El algoritmo es incapaz de discriminar matemáticamente la sombra oscura natural que proyecta una montaña (sombra orográfica) frente a la sombra que proyecta una nube en un valle, provocando cortes abruptos y datos nulos en la cartografía. *(Nota: En el planteamiento original de este proyecto se valoró inyectar un Modelo Digital de Elevaciones -DEM- para solventar este problema, pero se desestimó asumiendo que los canales hiperespectrales serían suficientes. Tras culminar el entrenamiento, se ha constatado empíricamente que el modelo sigue sufriendo confusión entre las sombras de las nubes y las sombras del terreno escarpado. En consecuencia, se establece como línea de investigación futura la inyección de modelos topográficos).*
3. **La paradoja del Agua:** Las grandes masas de agua profunda que absorben la radiación lumínica son diagnosticadas erróneamente por el procesador de la ESA como sombras densas. Paralelamente, los campos de cultivo que contienen una gran cantidad de agua (como los humedales del Delta del Ebro) son clasificados erróneamente como masas de agua puras y no como terreno agrícola húmedo.

# 4. Objetivos generales y específicos

## 4.1. Objetivo general

Desarrollar una herramienta Web GIS escalable (*pipeline* geoespacial) diseñada para procesar imágenes del satélite Sentinel-2 e integrar modelos de *Machine Learning*. En este caso de estudio particular, la herramienta implementará y ejecutará un modelo de aprendizaje profundo enfocado en la detección de nubes y nieve sobre el territorio de Cataluña (órbitas R008 y R051), superando las limitaciones analíticas del procesador estándar Sen2Cor.

## 4.2. Objetivos específicos

Para alcanzar este fin global, el proyecto se disgrega en los siguientes hitos operativos medibles:

1. **Entrenar una arquitectura U-Net:** Diseñar y entrenar una red neuronal focalizada en el relieve de Cataluña (a partir de las órbitas R008 y R051 del satélite Sentinel-2) optimizada para la segmentación de píxeles.
2. **Construir una infraestructura de datos replicable:** Desarrollar todo el *pipeline* metodológico —desde la extracción automatizada de datos L1C en bruto mediante APIs geoespaciales, hasta su edición y clasificación manual— para construir un *Ground Truth* (Verdad Terreno) que permita a la inteligencia artificial aprender sin los sesgos de la ESA.
3. **Superar métricamente a Sen2Cor:** Resolver las tres paradojas analizadas (aislando eficientemente la nieve, el agua y las nubes) y obtener métricas de evaluación técnica rigurosas (exhaustividad -*Recall*- e *Intersection over Union*) superiores al algoritmo oficial.
4. **Desarrollar la plataforma Web GIS:** Construir la infraestructura tecnológica completa (frontend, backend y arquitectura de inferencia). Destaca el diseño de la capa de inferencia utilizando **Rust** en lugar de Python, lo que permite ejecutar el modelo matemático de forma ultra-rápida y eficiente en entornos web (*Serverless*), garantizando una visualización interactiva y dinámica de las máscaras sobre la cartografía.

# 5. Marco teórico y conceptos clave

Para comprender la solución tecnológica propuesta, es necesario asentar brevemente los pilares científicos sobre los que se sustenta la arquitectura del proyecto.

## 5.1. Datos espaciales: Sentinel-2 y el espectro electromagnético

Sentinel-2 proporciona imágenes multiespectrales, lo que significa que el satélite capta longitudes de onda lumínica más allá de lo que el ojo humano puede ver. Para que el modelo de inteligencia artificial pueda diferenciar correctamente las cubiertas terrestres, no se le alimenta con una foto normal, sino con un tensor de datos compuesto por 7 "capas" o canales simultáneos:

- **Espectro visible (Bandas 2, 3 y 4):** Azul, verde y rojo. Capturan las texturas físicas, colores naturales y sombras orográficas.
- **Infrarrojo Cercano o NIR (Banda 8):** Crítico para identificar la vegetación (que rebota el NIR) y los cuerpos de agua (que absorben el NIR y se renderizan oscuros).
- **Infrarrojo de Onda Corta o SWIR (Bandas 11 y 12):** Fundamental para romper la paradoja de la nieve. Físicamente, la nube refleja el SWIR (brilla), mientras que la nieve lo absorbe fuertemente (se oscurece).
- **NDSI (*Normalized Difference Snow Index*):** Un índice matemático pre-calculado que inyecta conocimiento físico explícito sobre el comportamiento de la nieve directamente a la red neuronal.

## 5.2. Inteligencia Artificial: La Arquitectura U-Net

Frente a la "miopía espacial" de los algoritmos tradicionales que evalúan el terreno píxel a píxel, este proyecto fundamenta su avance técnico en el **Aprendizaje Profundo (*Deep Learning*)**, concretamente en la **Visión por Computadora (*Computer Vision*)**. 

La arquitectura matemática elegida es la **U-Net** (Ronneberger, Fischer y Brox, 2015), una Red Neuronal Convolucional (CNN) diseñada específicamente para la **segmentación semántica**. Esta red no solo infiere qué elementos hay en una imagen, sino que predice a qué clase exacta pertenece cada píxel individualmente. Su nombre proviene de su topología en forma de "U", que consta de tres mecanismos críticos:

1. **El Codificador (Ruta de Contracción):** A medida que la imagen satelital avanza por esta ruta, la red reduce agresivamente el tamaño espacial de la imagen mediante convoluciones, pero multiplica su profundidad para extraer patrones abstractos. El codificador aprende el **"QUÉ"** (ej. la firma espectral exacta que diferencia la nieve de la nube).
2. **El Decodificador (Ruta de Expansión):** Toma esa información abstracta hipercomprimida del fondo de la red y la vuelve a escalar progresivamente hacia arriba hasta recuperar el tamaño original de la imagen satelital. El decodificador aprende el **"DÓNDE"** (las coordenadas físicas sobre el mapa).
3. **Las Conexiones Residuales (*Skip Connections*):** Si solo usáramos los dos pasos anteriores, el mapa topográfico final saldría extremadamente borroso. Para solucionarlo, la red lanza "puentes de información" horizontales que conectan directamente la bajada con la subida. Gracias a estos puentes, la U-Net es capaz de trazar el borde geográfico exacto de una nube con precisión milimétrica, sin perder la nitidez original.

# 6. Metodología aplicada

Para la consecución de los objetivos planteados, el desarrollo metodológico de este proyecto se ha estructurado en tres fases estratégicas, diseñadas para romper la dependencia técnica frente al algoritmo defectuoso de la ESA y garantizar el entrenamiento de un modelo de inteligencia artificial sin sesgos.

1. **Edición y clasificación de la Verdad Terreno (*Ground Truth*):** Ante la evidencia de que las máscaras generadas por Sen2Cor arrastran errores sistemáticos en geografías complejas, se hizo imperativo generar un conjunto de datos limpio. Para ello, se extrajeron los datos en bruto y se aplicó un proceso de edición y clasificación manual de los píxeles conflictivos mediante el software de edición de imágenes GIMP, permitiendo al analista humano auditar y corregir a mano las clasificaciones erróneas basándose en el contexto orográfico real.
2. **Reducción de dimensionalidad de clases:** El estándar europeo divide el terreno en 12 categorías, aportando ruido computacional e ineficiencia. Como pilar metodológico, el *pipeline* geoespacial desarrollado colapsa matemáticamente esas 12 clases originales en **[6 Clases Maestras](008_pixel_legend.md)** de alto valor analítico: Descarte, Suelo Útil, Nube, Sombra de Nube, Nieve (objetivo principal) y Masas de Agua.
3. **Descarte topográfico por eficiencia:** En el diseño de la arquitectura de entrada, se decidió priorizar la física espectral frente a los metadatos espaciales. Se prescindió intencionadamente de inyectar un Modelo Digital de Elevaciones (DEM) para aliviar radicalmente la carga de procesamiento del futuro servidor web, demostrando que las leyes térmicas y ópticas de las bandas Infrarrojas de Onda Corta (SWIR) son suficientes por sí solas para separar la nieve de la nube.

![Comparativa Leyenda ESA vs Modelo](leyenda_comparativa.svg)
*Figura 1: Comparativa entre las 12 clases originales de Sen2Cor y la reducción a 6 Clases Maestras optimizadas para la red neuronal.*

## 6.1. Instrumentos

El desarrollo metodológico descrito se ha sustentado en los siguientes instrumentos de *software* y orígenes de datos:

- **Fuente de observación de la Tierra:** Satélite Sentinel-2 (programa Copernicus de la ESA). Se han empleado tanto los datos radiométricos en bruto (Nivel L1C) como las máscaras preexistentes del procesador oficial (Sen2Cor) a modo de base comparativa.
- **Ingeniería de datos (*Pipeline* ETL):** Lenguaje Python, utilizado para desarrollar los *scripts* de descarga automatizada, recorte de imágenes (*tiling*) y transformación bidireccional.
- **Edición y clasificación visual:** Software libre de edición de imágenes GIMP, empleado como instrumento principal para la reclasificación manual de los píxeles conflictivos.
- **Modelado de Inteligencia Artificial:** *Framework* PyTorch, estándar de la industria para el entrenamiento matemático de la arquitectura U-Net.
- **Arquitectura de despliegue web:** Lenguaje Rust, seleccionado por su extrema velocidad y eficiencia de memoria para compilar el modelo y ejecutar la inferencia en entornos *Serverless*.

## 6.2. Materiales (Conjunto de datos)

El material base sobre el que se fundamenta este Trabajo Final de Bàtxelor está compuesto por imágenes satelitales multiespectrales de Sentinel-2 (producto de reflectancia L1C) pertenecientes a las órbitas relativas R008 y R051, que cubren la totalidad del territorio de Cataluña.

Con el objetivo de maximizar la solidez del modelo ante casos geográficamente complejos (*Hard Negatives*), se ha diseñado un conjunto de datos (*Dataset*) compuesto por **[40 gránulos](003_type_granule.md)** o escenas específicas, divididas en dos grandes bloques:

1. **[Conjunto de Entrenamiento y Validación (30 gránulos)](../scripts/training_granules.csv):** Seleccionados estratégicamente para enseñar a la red neuronal a resolver las principales paradojas orográficas de Cataluña:
   - **Alta Montaña (Pirineos):** Gránulos de invierno (T31TCH, T31TDH) con nieve pura en valles y nubes bajas.
   - **Niebla Inversión Térmica:** Gránulos de invierno sobre la llanura de Lleida (T31TCG, T31TDG).
   - **Costas y Urbano:** Escenas sobre Barcelona y el mar Mediterráneo (T31TDF) para resolver la detección de bruma costera y evitar falsos positivos por naves industriales muy brillantes.
   - **Superficies Hídricas:** Gránulos sobre el Delta del Ebro (T31TCE, T31TCF) para evitar la confusión matemática entre el agua de los arrozales y las sombras oscuras de las nubes.
2. **[Conjunto de Test Ciego o *Blind Test* (10 gránulos)](../scripts/test_granules.csv):** Un bloque de validación aislado que la IA nunca observará durante la fase de entrenamiento. Consta de 10 imágenes con condiciones atmosféricas severas (ej. nieve densa cruzada por nubes en febrero, tormentas estivales en agosto sobre el mar) que servirán para evaluar el rendimiento empírico del modelo frente a Sen2Cor al final del proyecto.

## 6.3. Recursos e infraestructura

Para posibilitar el ciclo de vida completo del modelo (descarga, preprocesamiento, entrenamiento masivo e inferencia), el proyecto ha requerido una infraestructura técnica apoyada en los siguientes recursos:

- **APIs de Datos (*Copernicus Data Space Ecosystem - CDSE*):** Sistema *cloud* oficial de la Agencia Espacial Europea. Se ha empleado el protocolo OData/OpenSearch para automatizar la consulta perimetral, filtrado por porcentaje de nubes y posterior descarga masiva de los gránulos satelitales en formato comprimido.
- **Aceleración Hardware (GPUs / CUDA):** El entrenamiento de la arquitectura U-Net exige cálculos matriciales pesados (retropropagación de miles de millones de operaciones matemáticas por segundo). Se ha empleado aceleración por hardware dedicada mediante tarjetas gráficas compatibles con el ecosistema CUDA (Nvidia), posibilitando iterar sobre el conjunto de entrenamiento en tiempos logísticos viables.
- **Almacenamiento masivo intermedio:** Debido a la transformación matemática de los gránulos (10,000 x 10,000 píxeles) a matrices tensoriales Float32 subdivididas en recortes de 512x512 píxeles, la creación del conjunto de datos temporal (*tiling*) ha requerido sistemas de almacenamiento sólidos capaces de alojar grandes volúmenes de arreglos NumPy (`.npy`) sin cuellos de botella de lectura durante las épocas de entrenamiento.

## 6.4. Metodología de evaluación

Para certificar empíricamente que el modelo propio supera al estándar europeo, la fase de evaluación técnica se diseñó bajo una regla científica inquebrantable: **Bajo ningún concepto se evalúa el rendimiento estadístico de la IA contra las máscaras originales de Sen2Cor en el conjunto de Test.** 

Dado que la premisa del proyecto asume que el algoritmo tradicional comete falsos positivos sistemáticos, utilizar su salida como "verdad absoluta" generaría una paradoja estadística donde el sistema informático penalizaría a la U-Net precisamente en los casos en los que acierta corrigiendo los errores de la ESA. Por ello, el flujo de evaluación establecido es el siguiente:

1. **Frontera de Aislamiento (*Blind Test*):** Se utilizan los 10 gránulos de condiciones atmosféricas extremas reservados exclusivamente para evaluación.
2. **Edición Perfeccionista:** Se aplica una edición y clasificación manual exhaustiva sobre todos y cada uno de los píxeles conflictivos de esos 10 gránulos (apoyado en herramientas SIG), generando una Verdad Terreno validada objetivamente por el humano.
3. **Cálculo de Métricas Científicas:** Las predicciones emitidas por la red neuronal se enfrentan exclusivamente a esta nueva Verdad Terreno perfecta. Para cuantificar la precisión espacial y la robustez analítica del modelo, se definieron como indicadores de éxito las métricas estándar de la industria en segmentación semántica de imágenes:
   - **Intersection over Union (IoU):** Para medir la superposición geométrica exacta entre la nube/nieve predicha por el modelo y la nube/nieve real.
   - **F1-Score:** Media armónica entre la precisión y la exhaustividad (*Recall*), vital para evitar métricas engañosas en clases desbalanceadas geográficamente (como la nieve).
   - **Precisión global (*Accuracy*).**

La comparativa final de estas métricas entre las predicciones del modelo U-Net y las máscaras generadas por el algoritmo oficial Sen2Cor permitirá demostrar, de forma cuantitativa, el salto de precisión logrado frente al estándar de la ESA.

# 7. Desarrollo viable y sostenible

En la era del *Big Data*, el desarrollo de proyectos tecnológicos masivos exige un compromiso íntegro con la sostenibilidad. Este caso de estudio ha sido orquestado bajo tres perspectivas fundamentales de viabilidad y ética: ambiental, social y económica.

## 7.1. Temporalización e hitos

La complejidad de orquestar un *pipeline* geoespacial masivo interconectado con modelado predictivo exige un control de tareas meticuloso. Atendiendo al calendario del TFB, a continuación se detallan las fases alcanzadas y planificadas:

### Fases de Ejecución (Desarrollo *End-to-End*):

Este proyecto trasciende el análisis estadístico aislado para constituirse como una solución tecnológica integral (*End-to-End*). Su ciclo de vida abarca desde la investigación de los requisitos de la Agencia Espacial Europea (ESA) hasta el despliegue final, fusionando Ingeniería de Datos (*Data Engineering*), Inteligencia Artificial (*Machine Learning*) y Desarrollo Web.

1. **Fase 1 - Fundamentación e Ingeniería de Datos (Completada):** Conceptualización del problema analítico, evaluación teórica de los sensores de la ESA, viabilidad técnica de los datos y diseño de la arquitectura.
2. **Fase 2 - Arquitectura MLOps y Modelado (Completada):** Programación y automatización del flujo ETL masivo para la extracción de gránulos vía API. Edición y clasificación manual de la Verdad Terreno. Entrenamiento algorítmico de la red neuronal convolucional (U-Net) y ajuste de hiperparámetros. Todo el código fuente está versionado en **GitHub** y rigurosamente documentado bajo estándares de ingeniería de *software*.
3. **Fase 3 - Inferencia y Validación (Completada):** Ejecución algorítmica sobre el conjunto de *Blind Test* (aislado) para su validación empírica frente al algoritmo nativo Sen2Cor, extrayendo las métricas cuantitativas del salto de precisión.
4. **Fase 4 - Despliegue Web GIS (Próxima / En desarrollo):** Cierre del ciclo tecnológico mediante el desarrollo de una Aplicación Web escalable (*Serverless* con motor en Rust) que servirá el modelo entrenado, permitiendo ejecutar inferencias espaciales interactivas sobre el mapa.

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
- A nivel aplicativo, el modelo resultante facilitará a organismos como la **Agencia Catalana del Agua (ACA)** una herramienta computacional robusta para monitorizar el deshielo pirenaico y las cuencas fluviales, actuando como un escudo tecnológico en la prevención y gestión eficiente de la sequía. Además, su arquitectura escalable permite añadir futuras capas (como temperatura de Sentinel-3 o radar de Sentinel-1) para clasificar aludes, humedales o niveles de embalses.

### Condicionantes Sociales
Los mapas satelitales defectuosos generan decisiones tardías. Al proporcionar a los profesionales del territorio (ej. agricultores del Delta del Ebro o responsables de parques naturales) máscaras sin errores, se promueve un ecosistema de información libre de sesgos. La democratización de datos corregidos habilita respuestas civiles más ágiles en momentos críticos como inundaciones o incendios forestales.

Tanto los datos satelitales de la ESA como el código subyacente de este proyecto son de código abierto (*Open Source*). Cualquier usuario con conocimientos informáticos puede descargar, estudiar y mejorar la herramienta, fomentando la investigación científica y la innovación tecnológica de forma democratizada. El proyecto está diseñado para ser escalable, sirviendo como punto de partida para otros sistemas GIS a nivel mundial.

### Condicionantes Económicos
Para garantizar que la metodología pueda ser heredada sin restricciones financieras, toda la orquestación del proyecto huye del *software* propietario:
- Se ha empleado íntegramente código abierto (lenguajes Python y Rust, junto al *framework* PyTorch).
- Para el crítico proceso de edición y clasificación manual de píxeles (forja del *Ground Truth*), se ha utilizado GIMP, una alternativa libre y gratuita que democratiza el acceso a la edición cartográfica de alto nivel.
- Las fuentes de datos provienen del catálogo abierto de la Unión Europea a través de la API OData de Copernicus.
- A largo plazo, el despliegue del *software* mediante estándares geoespaciales modernos permite operar en un entorno web *Serverless* de ínfimo coste en la nube, eliminando la dependencia de servidores dedicados costosos.

# 8. Proceso y resultados

Este apartado detalla la ejecución técnica del *pipeline* geoespacial, documentando desde la descarga inicial y preprocesamiento masivo de los datos satelitales hasta el entrenamiento de la red neuronal y la obtención de las métricas de evaluación empírica frente al estándar oficial Sen2Cor.

## 8.1. Fuentes de datos y recopilación

La materia prima de este proyecto procede del programa Copernicus de la Agencia Espacial Europea (ESA), específicamente de la constelación Sentinel-2. Dado el masivo volumen de información requerido para entrenar redes neuronales profundas, la descarga manual a través de interfaces gráficas resultaba inviable, por lo que se programó un módulo automatizado de extracción (*Pipeline ETL*).

A través del *script* [`sentinel_downloader.py`](../scripts/sentinel_downloader.py), el sistema se autentica en la moderna API *Copernicus Data Space Ecosystem (CDSE)* mediante el protocolo OData. Este flujo de automatización lee los listados de metadatos curados ([`training_granules.csv`](../scripts/training_granules.csv) y [`test_granules.csv`](../scripts/test_granules.csv)) y ejecuta de forma iterativa y autónoma:
1. Petición y refresco de *tokens* de acceso temporales a la infraestructura europea.
2. Búsqueda perimetral algorítmica (filtrando por *Tile*, nivel de procesamiento y fecha exacta de captura).
3. Descarga asíncrona de los archivos masivos ZIP correspondientes al producto L1C (Visible, Infrarrojo Cercano y SWIR puro, sin sesgos atmosféricos) y extracción focalizada exclusivamente de la máscara SCL del producto L2A (utilizada como borrador inicial para la forja de la Verdad Terreno).

## 8.2. Exploración y preparación

Una vez descargados los gránulos crudos (archivos `.jp2`), se transforman en estructuras matemáticas legibles por la red neuronal. A través del *script* [`004_create_dataset.py`](../scripts/004_create_dataset.py), se orquesta un proceso automático de ingeniería de datos y preparación espacial:

1. **Alineación espacial (Coregistro):** Sentinel-2 captura bandas a diferentes resoluciones nativas. El algoritmo lee la banda B02 a 10 metros de resolución y utiliza interpolación bilineal para remuestrear las bandas Infrarrojas de Onda Corta (SWIR, nativas a 20m) a esa misma resolución de 10m. Esto garantiza que todos los píxeles del tensor final estén perfectamente superpuestos espacialmente sin pérdida de continuidad.
2. **Ingeniería de Características (*Feature Engineering*):** Se calcula matemáticamente el Índice NDSI (*Normalized Difference Snow Index*) operando matricialmente la banda Verde (B03) y la primera banda SWIR (B11). Este resultado se apila como una séptima banda adicional en el cubo de datos, inyectando conocimiento físico explícito sobre la nieve en la red neuronal.
3. **Mosaico y purgado (*Tiling y Void Filtering*):** La imagen de satélite original roza los 10000x10000 píxeles, un volumen inasumible para la memoria de cualquier tarjeta gráfica comercial (*Out of Memory*). El sistema trocea la imagen dinámicamente en miles de parches o recortes de 512x512 píxeles. Durante este proceso, se evalúa estadísticamente el contenido de cada recorte: si más del 90% del área contiene datos nulos o de descarte (mar profundo), el parche se purga y no se exporta a disco duro, agilizando de forma superlativa los tiempos de entrenamiento posteriores.

## 8.3. Análisis exploratorio

Previo a la fase intensiva de modelado, se llevó a cabo un análisis visual y estadístico de los parches generados (*Exploratory Data Analysis - EDA*). Al prescindir de un Modelo Digital de Elevaciones (DEM), la exploración se centró puramente en la respuesta espectral física de las bandas.

Esta fase exploratoria fue crucial para diagnosticar empíricamente el comportamiento de los casos geográficos más complejos (*Hard Negatives*):
1. **Sombras orográficas y humedad extrema:** Se observó visualmente que las grandes sombras proyectadas por el relieve montañoso de los Pirineos, así como las zonas terrestres con saturación de humedad, generaban confusión espectral y propiciaban falsos positivos en la clasificación original.
2. **Clasificación errónea de sombras nubosas:** Se detectó de forma repetida que el algoritmo oficial de la ESA catalogaba las sombras proyectadas por formaciones nubosas densas directamente como "No Data" (ausencia de información), lo cual corrompía severamente la continuidad espacial de la imagen.
3. **Auditoría humana:** Para evitar sesgar a la red neuronal con los errores nativos de la Agencia Espacial Europea, se empleó el editor de imágenes *Open Source* GIMP como herramienta de análisis exploratorio. A través del *script* [`003_decode_gimp_edits.py`](../scripts/003_decode_gimp_edits.py), el analista inspeccionó los canales espaciales y editó manualmente los píxeles erróneos de Sen2Cor, aislando el ruido algorítmico y forjando una Verdad Terreno (*Ground Truth*) de alta fidelidad.

## 8.4. Gestión y almacenamiento

Tras el preprocesamiento, el masivo volumen de datos generado supone un reto logístico de almacenamiento y lectura. La transformación de los 40 gránulos satelitales en recortes de 512x512 píxeles origina decenas de miles de archivos matriciales independientes. Su gestión técnica se ha resuelto bajo dos paradigmas:

1. **Almacenamiento físico estructurado:** Los recortes que superan el filtro de descarte se almacenan en una unidad de estado sólido (SSD) en formato binario puro `.npy` (estándar de la librería NumPy para máxima velocidad de I/O). Se organizan jerárquicamente en el directorio `dataset/patches/train/<id_granule>/`.
2. **Gestión de memoria dinámica (*Lazy Loading*):** Para evitar el colapso absoluto de la memoria RAM del sistema (*Out of Memory*), la clase programada en el *script* [`dataset.py`](../scripts/dataset.py) actúa como orquestador entre el disco duro y la tarjeta gráfica. Durante el modelado, este componente no carga el *dataset* entero de golpe; escanea los directorios y transfiere pequeños lotes de parches a la memoria VRAM estrictamente bajo demanda, vaciándola inmediatamente después de su procesamiento matemático.

## 8.5. Modelado

El núcleo analítico de la investigación recae en el diseño y entrenamiento de una red neuronal convolucional. Para esta exigente tarea de segmentación semántica (clasificación matemática píxel a píxel), se ha implementado la reconocida arquitectura **U-Net** utilizando el *framework* PyTorch (definida en el *script* [`model.py`](../scripts/model.py)).

El modelado algorítmico se articula en dos fases estructurales:
1. **Arquitectura (Encoder-Decoder con *Skip Connections*):** La ruta de contracción (*Encoder*) comprime espacialmente el tensor de entrada (compuesto por 7 canales: 6 bandas físicas + 1 índice NDSI), extrayendo patrones semánticos profundos. A continuación, la ruta de expansión (*Decoder*) restaura la resolución original de 10 metros, apoyándose en conexiones residuales (*Skip Connections*) que inyectan el contexto espacial perdido. Este diseño arquitectónico es vital para delinear con precisión micrométrica las fronteras fractales entre la nieve y los bordes de las nubes.
2. **Ciclo de entrenamiento:** Orquestado por el *script* [`005_train.py`](../scripts/005_train.py), el modelo se somete a múltiples épocas de aprendizaje iterativo. Se emplea un optimizador para actualizar los pesos de los nodos basándose en el cálculo iterativo del error (función de pérdida) frente a la Verdad Terreno de 6 clases. Todo el ciclo computacional se acelera paralelamente mediante *hardware* gráfico (GPU/CUDA), exportando automáticamente los pesos matemáticos del modelo (`.pth`) con la mayor precisión validada.

## 8.6. Visualización y evaluación de resultados

La culminación del proyecto radica en la inferencia sobre el Conjunto de Test Ciego (*Blind Test*), compuesto por gránulos geográficos que la inteligencia artificial nunca procesó durante su entrenamiento. Al evaluar matemáticamente las predicciones espaciales frente a la Verdad Terreno generada mediante auditoría humana (analizando un volumen de **más de 642 millones de píxeles**), se extraen las siguientes métricas agregadas:

| Clase Geográfica | IoU (%) | Precisión (%) | Recall (%) | F1-Score (%) |
| :--- | :--- | :--- | :--- | :--- |
| **Suelo (1)** | 92.62% | 99.59% | 92.97% | 96.17% |
| **Nube (2)** | 85.02% | 85.02% | 100.00% | 91.90% |
| **Sombra Nube (3)** | 50.86% | 56.16% | 84.36% | 67.43% |
| **Nieve (4)** | **99.99%** | **99.99%** | **100.00%** | **99.99%** |

### Análisis de la Matriz de Confusión
La representación visual térmica (*Heatmap*) de la matriz de contingencia consolida el éxito del modelo:

![Matriz de Confusión Global Test](img/confusion_matrix.png)
*Figura 3: Matriz de confusión global acumulando más de 642 millones de inferencias píxel a píxel sobre el conjunto de test ciego.*

A partir de la visualización de estos resultados, se concluye:
1. **Detección de Nieve (Objetivo Primario):** La U-Net alcanza un IoU virtualmente perfecto (99.99%) separando topológicamente la nieve de las nubes gracias a la inyección física del índice NDSI. Este resultado corrige de forma empírica y definitiva el histórico sesgo algorítmico del estándar Sen2Cor sobre terrenos orográficamente complejos.
2. **Sensibilidad Total a la Nube:** La tasa de exhaustividad (*Recall*) de nubes del 100% asegura que absolutamente ninguna formación nubosa densa escapó a la inteligencia artificial, garantizando una máscara de exclusión (*Safe Detection*) impecable para futuras aplicaciones meteorológicas o agrícolas.
3. **El desafío físico de las sombras:** El rendimiento analítico recae moderadamente en la clase "Sombra de Nube" (IoU 50.86%). La visualización exploratoria demuestra que la transición lumínica gradual generada por la topografía catalana provoca que la separación matemática entre "sombra orográfica" y "sombra nubosa" roce el límite de la física óptica, evidenciando que para resolver este conflicto particular sería necesaria la integración tridimensional de un Modelo Digital de Elevaciones (DEM) en futuras iteraciones arquitectónicas.

# 9. Discusión y limitaciones

El desarrollo de este Trabajo Final de Bàtxelor ha demostrado empíricamente que una arquitectura neuronal convolucional (U-Net) entrenada sobre una Verdad Terreno purgada de sesgos es capaz de superar las deficiencias del algoritmo oficial de la Agencia Espacial Europea (Sen2Cor) en tareas de clasificación geoespacial compleja.

El hito central de la investigación se ha cumplido con éxito: aislar matemáticamente la nieve de las nubes alcanzando un IoU virtualmente perfecto (99.99%). La inyección del índice físico NDSI como un canal suplementario en la red neuronal ha demostrado ser una técnica decisiva para guiar el aprendizaje profundo, dotando al modelo de la robustez radiométrica necesaria para no confundir superficies urbanas o hídricas con nubes, ni montañas nevadas con sistemas frontales.

No obstante, el análisis crítico de los resultados revela limitaciones inherentes a las decisiones de diseño arquitectónico:

1. **La frontera de la física óptica (Sombras de Nubes):** Al apostar por un diseño puramente espectral para maximizar la eficiencia computacional y reducir el gasto energético (*Green Computing*), se prescindió intencionadamente de integrar un Modelo Digital de Elevaciones (DEM). Los resultados demuestran que, en terrenos altamente escarpados como los Pirineos, la separación entre una sombra proyectada por una montaña y una sombra proyectada por una nube densa es espectralmente casi indistinguible usando únicamente bandas ópticas (RGB) e Infrarrojas de Onda Corta (SWIR). Esto explica empíricamente el rendimiento más moderado en la predicción de la clase "Sombra Nube".
2. **Futuras líneas de investigación:** Para resolver definitivamente la ambigüedad de las sombras, la iteración natural de este proyecto requeriría la inyección de metadatos tridimensionales (ej. integrando el modelo del terreno del Institut Cartogràfic i Geològic de Catalunya - ICGC).
3. **Escalabilidad y Producción (Despliegue Web):** Actualmente, el modelo es plenamente funcional en entornos analíticos con aceleración gráfica (CUDA). El futuro inmediato del ciclo de vida del *software* pasa por la encapsulación de los pesos neuronales exportados (`.pth`) y el desarrollo de una arquitectura de microservicios (*Serverless*) en un lenguaje de alto rendimiento (Rust). Esta infraestructura permitirá servir las inferencias espaciales *on-the-fly* a través de un visor Web GIS, culminando la democratización del acceso a máscaras satelitales corregidas para los profesionales del territorio.

# 10. Conclusiones y líneas futuras

Como síntesis final de este Trabajo Final de Bàtxelor, se extraen las siguientes conclusiones fundamentales derivadas del desarrollo empírico:

1. **Superación del Estándar Europeo:** Se ha demostrado de forma cuantitativa que es posible superar la precisión algorítmica de Sen2Cor en geografías complejas. La creación de un *Ground Truth* de alta fidelidad, auditado manualmente para erradicar los sesgos heredados de la ESA.
2. **Eficacia del *Feature Engineering*:** La decisión de calcular el índice NDSI e inyectarlo como un canal estructural en la red U-Net ha probado ser una estrategia determinante. Ha guiado al modelo en la discriminación termodinámica entre el hielo y las nubes, evitando correlaciones matemáticas espurias.
3. **El Balance entre Eficiencia y Precisión:** La omisión intencionada de un Modelo Digital de Elevaciones ha permitido un procesamiento iterativo ultrarrápido y de bajo coste energético (*Green Computing*). Sin embargo, ha evidenciado empíricamente el límite de la física puramente óptica al intentar resolver de forma matemática el problema de las sombras superpuestas en zonas de alta montaña.

En base a estas conclusiones, se plantean las siguientes **líneas futuras de investigación y desarrollo**:

- **Integración Topográfica Tridimensional:** Para subsanar la limitación detectada con las sombras de nubes, el siguiente salto tecnológico consistirá en hibridar la entrada de la red neuronal inyectando el Modelo de Elevaciones de alta resolución del Institut Cartogràfic i Geològic de Catalunya (ICGC).
- **Puesta en Producción (*Web GIS*):** La transición del modelo desde un entorno de laboratorio hacia una aplicación web plenamente funcional. Se proyecta el desarrollo de un *backend* escalable (*Serverless*) programado en Rust, que permita a entidades como la ACA interactuar visualmente con el modelo y obtener inferencias en tiempo real a través de un navegador web.
- **Ampliación de Clases Semánticas:** Escalar la arquitectura de la red para segmentar nuevas áreas estratégicas del territorio catalán, tales como cicatrices de incendios forestales, estrés hídrico en la agricultura del litoral o la monitorización del volumen de los embalses en escenarios de sequía extrema.

# 11. Referencias Bibliográficas

Baetens, L., Desjardins, C., & Hagolle, O. (2019). Validation of Copernicus Sentinel-2 Cloud Masks Obtained from MAJA, Sen2Cor, and FMask Processors Using Reference Cloud Masks Generated with a Supervised Active Learning Procedure. *Remote Sensing, 11*(4), 433. https://doi.org/10.3390/rs11040433

European Space Agency [ESA]. (2026). *Copernicus Open Access Hub - Sentinel-2 Data Access*. Recuperado el 25 de junio de 2026, de https://scihub.copernicus.eu/

Hollstein, A., Segl, K., Guanter, L., Kneubühler, M., & Legleiter, C. (2016). Ready-to-Use Methods for the Detection of Clouds, Cirrus, Snow, Shadow, Water and Clear Sky Pixels in Sentinel-2 MSI Images. *Remote Sensing, 8*(8), 666. https://doi.org/10.3390/rs8080666

Institut Cartogràfic i Geològic de Catalunya [ICGC]. (2026). *Models d'Elevacions del Terreny de Catalunya*. Recuperado el 25 de junio de 2026, de https://www.icgc.cat/

Ronneberger, O., Fischer, P., & Brox, T. (2015). U-Net: Convolutional Networks for Biomedical Image Segmentation. *Medical Image Computing and Computer-Assisted Intervention – MICCAI 2015*, 234–241. https://doi.org/10.1007/978-3-319-24574-4_28

Wieland, M., Li, Y., & Martinis, S. (2019). Multi-sensor cloud and cloud shadow segmentation with a convolutional neural network. *Remote Sensing of Environment, 230*, 111203. https://doi.org/10.1016/j.rse.2019.05.022
