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
**Decisión:** Utilizar imágenes crudas L1C (TOA).
**Justificación:** 
- Las nubes se encuentran físicamente en las capas altas/medias de la atmósfera. Aplicar correcciones atmosféricas (L2A) sobre píxeles de nubes no tiene rigor físico.
- El algoritmo estándar de la ESA (Sen2Cor) utilizado para generar L2A contiene errores tipificados confundiendo nieve con nubes. Entrenar nuestro modelo con L2A implicaría heredar un sesgo algorítmico y aprender de los errores que intentamos superar.
- Las imágenes L1C ofrecen la firma espectral pura, permitiendo a la red neuronal (U-Net) extraer las características físicas reales desde cero.

## 2. Inclusión del Modelo Digital de Elevaciones (DEM)
**Decisión:** Incluir el DEM de Cataluña (ICGC) como banda de entrada adicional (input channel) a la red neuronal.
**Justificación:**
- **Cota de Nieve:** La nieve está estrictamente condicionada a la altitud. El DEM proporciona a la red una regla probabilística fortísima para discriminar superficies blancas brillantes a baja altitud (nubes) frente a superficies idénticas a alta altitud (posible nieve).
- **Sombras Topográficas vs Sombras de Nubes:** Sentinel-2 cruza Cataluña en invierno con un ángulo de elevación solar muy bajo (~20°-25° a las 10:30 AM). Esto genera enormes sombras proyectadas en las laderas noroccidentales de los Pirineos que la óptica del satélite captura como manchas muy oscuras y azuladas (idénticas a la sombra de un cumulonimbo denso o lagos profundos). Al inyectar el DEM, la red calcula espacialmente la pendiente y orientación de la orografía, permitiéndole entender que la oscuridad es un fenómeno topográfico y no nuboso.

## 3. Descarte de Múltiples Modelos por Órbita (Este "R008" vs Oeste "R051")
**Decisión:** **Se descarta rotúndamente** entrenar un modelo para la órbita R008 y otro distinto para la R051. Se entrenará un **único modelo** unificado.
**Justificación:**
- Las órbitas R008 y R051 ocurren en días distintos, por lo que el satélite posee ángulos de observación y acimutales diferentes (las sombras caen de forma distinta).
- Al mezclar ambas órbitas en el entrenamiento de un solo modelo, forzamos a la red a aplicar *Data Augmentation* natural. La U-Net se vuelve invariante a la rotación y a la iluminación solar, haciéndose más inteligente y robusta. 
- Separar los modelos no aporta valor científico; solo duplicaría la carga de mantenimiento, requeriría el doble de infraestructura en producción y haría que los modelos fueran mucho menos generalizables.

## 4. Descarte de Múltiples Modelos Geográficos (Norte vs Sur)
**Decisión:** **Se descarta** crear un modelo especializado para el Norte (Pirineos) y otro para el Sur (Costa/Llanuras). Se usará un **único modelo** con un *Sampling* (muestreo) Estratificado.
**Justificación:**
- Crear un modelo exclusivo para el Sur impediría que esa red aprendiera sobre la nieve (por ausencia de ejemplos en la zona llana). Si algún día cayera nieve excepcional en el sur, o detectara una anomalía brillante (como invernaderos muy grandes), el modelo Sur fallaría completamente.
- El modelo debe ser expuesto a los "casos más difíciles" simultáneamente en su misma matriz de pesos: el Norte para aprender sobre nieve extrema y sombras topográficas, y el Sur para aprender sobre agua profunda y sombras de nubes. Consolidar todo esto en una sola arquitectura genera una Inteligencia Artificial mucho más potente que "entiende" todo el territorio.

## 5. Estrategia de Ingesta: Tiling Directo vs Mosaico Previo
**Decisión:** Realizar el *tiling* (recorte en parches de 512x512) directamente sobre los gránulos MGRS individuales de la ESA. **Se descarta el mosaico previo.**
**Justificación:**
- **Prevención OOM (Out of Memory):** Unir gránulos para generar un mosaico de media Cataluña crea archivos desproporcionados para la memoria RAM, sin beneficio algorítmico, ya que terminarán recortados a 512x512 igualmente.
- **Pureza Temporal y Radiométrica:** Al unir gránulos de días u órbitas distintas se generan "costuras" (seamlines) artificiales donde la iluminación cambia bruscamente. Si un parche de 512x512 cae sobre esta costura, la red aprendería un patrón espectral que no existe en la naturaleza. Trabajar sobre el gránulo puro mantiene intacta la coherencia física y temporal de los píxeles. El mosaico se reservará exclusivamente para la visualización web final de las predicciones en la plataforma GIS.

## 6. Composición del Input Tensor (Selección de Bandas)
**Decisión:** Alimentar la red neuronal con un tensor multicanal que combine resolución espacial (10m) con discriminación física (20m SWIR) y contexto orográfico (DEM).
**Justificación:**
Basado en los principios de observación visual humana experta, se hace necesario un *stack* de bandas específico:
- **Las bandas SWIR (B11 y B12, 20m):** Son obligatorias. La nieve absorbe la radiación SWIR (apareciendo cyan en la composición de falso color) mientras que las nubes la reflejan fuertemente (apareciendo blancas). Sin el canal SWIR, la red es prácticamente "ciega" a la diferencia entre nieve y una nube densa.
- **Las bandas Visibles y NIR (B2, B3, B4, B8, 10m):** Al tener el doble de resolución nativa que el SWIR, son indispensables para detectar *núvols petits* (nubes de buen tiempo o humos finos) que pasarían totalmente desapercibidos si la red solo tuviera acceso a la resolución grosera de 20m.
- **El Tensor Final:** Cada parche de entrenamiento de 512x512 se compondrá de múltiples canales superpuestos, conformando un volumen matemático denso (por ejemplo, B2, B3, B4, B8, B11, B12, DEM). Las bandas de menor resolución nativa (20m) se resamplearán por software a 10m para mantener la coherencia matricial estricta que exige la arquitectura convolucional de la U-Net.

## 7. Descarte de Imágenes de Referencia (Gránulo Ideal / Multi-temporal)
**Decisión:** **Se descarta** el uso de imágenes estáticas previas "sin nubes" (Gránulo Ideal) para hacer detección de cambios. Se adopta firmemente una arquitectura de modelo **"Single-Image"**.
**Justificación:**
- **El Problema de la Nieve (Pirineos):** La nieve es un fenómeno dinámico y altamente efímero. Una imagen "ideal" libre de nubes generada a principios de mes no sirve de referencia para finales de mes si ha habido una nevada o un deshielo. La diferencia radiométrica por la aparición o desaparición de nieve confundiría a la red, que interpretaría ese enorme cambio como una nube.
- **El Problema Agrícola (Intervención humana abrupta en parcelas):** Si bien la fenología natural de los bosques puede ser gradual y "soportable" por un gránulo mensual, la agricultura en zonas llanas (Plana de Lleida, Delta del Ebro, Empordà) sufre cambios antrópicos abruptos y caóticos. Un agricultor puede cosechar, arar o inundar una parcela en apenas unos días. Si el gránulo ideal se calculó antes de arar, la imagen actual (con la tierra marrón expuesta) mostrará un cambio espectral masivo. La red interpretaría esta alteración artificial de la parcela como una anomalía atmosférica o nube.
- **Logística MLOps:** Mantener una base de datos actualizada de gránulos de referencia limpios y espacialmente alineados para cada mes del año es un esfuerzo de infraestructura inviable y propenso a errores geométricos. El enfoque *Single-Image* (deducir nube vs nieve usando únicamente los datos de reflectancia del instante actual) es mucho más robusto para un territorio orográficamente y agrícolamente complejo como Cataluña.

## 8. Descarte de Máscaras Vectoriales de Agua (Water Masks Estáticas)
**Decisión:** **Se descarta** incluir un fichero vectorial rasterizado (0=tierra, 1=agua) como canal adicional de entrada para ayudar a la red a detectar masas de agua.
**Justificación:**
- **La Mentira de la Capa Estática (Sequías):** Los vectores cartográficos son estáticos, pero la hidrología es dinámica. En periodos de sequía severa (ej. embalses de Sau o Susqueda), el agua desaparece dejando suelo desnudo y brillante. Si el tensor inyecta una máscara que afirma que "hay agua" donde físicamente hay tierra seca, la red neuronal sufrirá una disonancia cognitiva grave, clasificando probablemente esa arena brillante como nube.
- **Redundancia Física:** El agua profunda absorbe casi la totalidad de la radiación en el Infrarrojo Cercano (NIR, Banda 8) y SWIR (Bandas 11 y 12). Al proveer a la U-Net con estas bandas físicas, la red infiere su propia máscara de agua en tiempo real y con precisión milimétrica, sin importar el nivel de inundación actual.
- **Contexto Espacial vs Sen2Cor:** Algoritmos clásicos como Sen2Cor suelen confundir masas de agua turbias o reflejos solares (*sunglint*) en el Delta del Ebro con nubes o sombras, porque toman decisiones píxel a píxel (son ciegos al contexto). La U-Net, al evaluar ventanas de 512x512 píxeles, percibe la geometría ortogonal de los arrozales y la textura espacial del río. Aprende que los reflejos brillantes con forma de polígono agrícola no son formaciones nubosas convectivas, superando las limitaciones algorítmicas sin necesitar un mapa estático de apoyo.

## 9. Excepción Teórica: Viabilidad de la Imagen Ideal a escala de "Tile" Urbano
**Propuesta:** Aunque se descarta el uso del gránulo ideal a nivel global, existe un escenario donde su uso sería altamente beneficioso: **Zonas estrictamente urbanas procesadas a nivel de parche (tiling 512x512).**
**Justificación:**
- **Estabilidad Espectral Urbana:** A diferencia de la nieve o los cultivos, el asfalto, las carreteras y los tejados de hormigón de una ciudad (ej. área metropolitana de Barcelona) no cambian de color con las estaciones. Una "imagen ideal" de una ciudad es permanente y fiable durante años.
- **Reducción de Escala (Tiling):** Un gránulo completo (100x100 km) es demasiado grande y siempre mezclará ciudad, agricultura y montaña, lo que hace inviable aplicar una regla única. Sin embargo, un recorte (tile) de 512x512 píxeles a 10m de resolución cubre apenas 5.12 x 5.12 km. Es perfectamente posible clasificar ciertos *tiles* enteros como "100% Urbanos".
- **Aplicación Híbrida:** En una arquitectura avanzada, se podría inyectar el *Tile Ideal Urbano* como canal extra solo cuando el pipeline detecte que está procesando una cuadrícula previamente clasificada como ciudad. Esto garantizaría una precisión casi absoluta en entornos urbanos (eliminando los falsos positivos generados por techos reflectantes o polígonos industriales blancos), sin sufrir los problemas de la agricultura o la nieve. Se documenta como una mejora de excelencia metodológica para posibles futuras iteraciones del modelo.

## 10. Bibliografía Científica Base (Core References)
Siguiendo la filosofía de "Menos es Más", se omiten listados exhaustivos y se referencian únicamente los tres *papers* fundacionales que justifican matemática y físicamente las decisiones arquitectónicas de este modelo:

1. **La Arquitectura Base (U-Net):**
   > Ronneberger, O., Fischer, P., & Brox, T. (2015). *"U-Net: Convolutional Networks for Biomedical Image Segmentation"*. En *Medical Image Computing and Computer-Assisted Intervention – MICCAI 2015*.
   *Justificación:* El artículo original que inventó la U-Net. Es obligatorio citarlo en la memoria para justificar por qué usamos esta arquitectura de codificador-decodificador para segmentación de imágenes.

2. **La Física de las Nubes y la Nieve (Bandas SWIR):**
   > Hollstein, A., Segl, K., Guanter, L., Kneubühler, M., & Legleiter, C. (2016). *"Ready-to-Use Methods for the Detection of Clouds, Cirrus, Snow, Shadow, Water and Clear Sky Pixels in Sentinel-2 MSI Images"*. En *Remote Sensing*, 8(8).
   *Justificación:* El *paper* clásico que demuestra científicamente por qué las bandas SWIR de Sentinel-2 son el único mecanismo óptico fiable para separar la nieve de las nubes. Esto justifica ante cualquier tribunal nuestro Tensor Input Multicanal.

3. **Superioridad del Deep Learning sobre Sen2Cor:**
   > Wieland, M., Li, Y., & Martinis, S. (2019). *"Multi-sensor cloud and cloud shadow segmentation with a convolutional neural network"*. En *Remote Sensing of Environment*, 230.
   *Justificación:* Demuestra que usar redes neuronales convolucionales (CNN) sobre imágenes satelitales crudas (L1C) arroja resultados inmensamente superiores a los algoritmos tradicionales (como el Sen2Cor de la ESA) en entornos complejos.

4. **Limitaciones Clásicas sobre el Agua (Sunglint y Turbidez):**
   > Baetens, L., Desjardins, C., & Hagolle, O. (2019). *"Validation of Copernicus Sentinel-2 Cloud Masks Obtained from MAJA, Sen2Cor, and FMask Processors Using Reference Cloud Masks Generated with a Supervised Active Learning Procedure"*. En *Remote Sensing*, 11(4).
   *Justificación:* Este estudio evalúa los algoritmos oficiales y documenta explícitamente su alta tasa de falsos positivos en zonas de agua (debido a reflejos solares o turbidez) por su falta de análisis espacial profundo. Es la referencia perfecta para justificar matemáticamente por qué la U-Net no necesita una máscara vectorial estática: su capacidad para ver la "textura" corrige este problema.
