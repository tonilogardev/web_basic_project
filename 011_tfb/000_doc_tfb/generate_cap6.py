import re

cap6 = """
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
"""

# Inject into 009.md
with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md", "r", encoding="utf-8") as f:
    doc9 = f.read()

c6_start = doc9.find("# 6. Metodología aplicada")
c7_start = doc9.find("# 7. Desarrollo viable y sostenible")

doc9 = doc9[:c6_start] + cap6 + "\n\n" + doc9[c7_start:]

with open("/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_009.md", "w", encoding="utf-8") as f:
    f.write(doc9)

print("Chapter 6 heavily expanded and injected successfully!")
