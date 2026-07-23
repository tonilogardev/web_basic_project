<div style="text-align: left; margin-bottom: 30px;">
    <img src="img/logo-sello-universitat-carlemany.png.webp" alt="Logo Universitat Carlemany" width="150" />
</div>

# <span style="color: #FFC000;">Entrega 2: Desarrollo del Marco Teórico y Metodología</span>

Página web del proyecto: [https://tonilogar.github.io/tfb/tfb.html](https://tonilogar.github.io/tfb/tfb.html)

---

## <span style="color: #FFC000;">1. Marco Teórico y Estado del Arte</span>

### <span style="color: #FFC000;">1.1 Contexto Tecnológico: La Misión Sentinel-2</span>
El programa Copernicus, de la Agencia Espacial Europea (ESA), ha supuesto un punto de inflexión en la observación de la Tierra. En concreto, la misión Sentinel-2 proporciona imágenes ópticas multiespectrales de alta resolución (hasta 10 metros por píxel) con una cadencia de revisita de 4 días. Esta riqueza de datos abiertos ha impulsado innumerables aplicaciones en agricultura de precisión, monitorización forestal y análisis climático. 

Para procesar estas imágenes crudas (L1C) y convertirlas a reflectancia de la superficie terrestre (L2A), la ESA utiliza el procesador **Sen2Cor**, el cual incluye un módulo de Clasificación de Escenas (SCL) que genera una máscara de píxeles categorizando elementos como nubes, agua, vegetación o nieve.

### <span style="color: #FFC000;">1.2 El Problema: Limitaciones de Sen2Cor</span>
A pesar de su utilidad general, el algoritmo de Sen2Cor presenta fallos críticos en geografías complejas como la cordillera de los Pirineos y la red hídrica de Cataluña:
1. **Confusión Espectral:** La alta reflectancia de la nieve en las cumbres montañosas se confunde rutinariamente con la firma espectral de las nubes gruesas.
2. **Falsos Positivos Geométricos:** El algoritmo carece de percepción tridimensional. Cuando una nube proyecta una sombra sobre otra capa nubosa inferior (el fenómeno de "mar de nubes"), Sen2Cor clasifica erróneamente la sombra intranubosa como "sombra sobre la superficie terrestre".
3. **Zonas Acuáticas:** El agua costera profunda a menudo es mal clasificada como "No Data" o sombras severas, generando ruido en los mosaicos finales.

Estos fallos provocan que los Sistemas de Información Geográfica (GIS) automatizados eliminen por error zonas útiles cubiertas por nieve, perdiendo datos valiosos para estudios hidrológicos.

### <span style="color: #FFC000;">1.3 Fundamentos de Inteligencia Artificial</span>
Para superar las heurísticas tradicionales basadas en umbrales estáticos, se recurre al campo del Aprendizaje Profundo (*Deep Learning*). Específicamente, se ha seleccionado la arquitectura de Red Neuronal Convolucional **U-Net**. Diseñada originalmente para la segmentación de imágenes biomédicas, la U-Net ha demostrado ser el estado del arte en segmentación semántica debido a:
- **Rutas de Salto (Skip Connections):** Permiten fusionar información semántica de alto nivel (contexto global de la imagen) con información espacial de bajo nivel (bordes precisos de las nubes).
- **Eficiencia de Datos:** Requiere menos imágenes etiquetadas para converger, mitigando la escasez de "Ground Truth" curado manualmente.

---

## <span style="color: #FFC000;">2. Metodología y Pipeline de Datos (ETL)</span>

El desarrollo del modelo predictivo requiere una arquitectura de datos escalable, dado el volumen extremo de información satelital. Por ello, se ha diseñado un pipeline de Extracción, Transformación y Carga (ETL) automatizado.

### <span style="color: #FFC000;">2.1 Adquisición de Datos</span>
La descarga de gránulos se realiza mediante la API OData del Copernicus Data Space Ecosystem (CDSE). Se han seleccionado muestras estratificadas temporal y espacialmente para representar la máxima variabilidad orográfica de Cataluña:
- **Casos de Invierno:** Cobertura de nieve extensa y nieblas densas en la llanura de Lérida.
- **Casos de Transición:** Nieve en proceso de deshielo.
- **Casos de Verano:** Tormentas convectivas, cúmulos costeros y zonas áridas.

### <span style="color: #FFC000;">2.2 Ingeniería de Datos y Reducción de Dimensionalidad</span>
Las máscaras SCL originales de Sen2Cor contienen 12 clases, muchas de las cuales son irrelevantes para el problema binario de "Nube vs Nieve". Entrenar un modelo con 12 clases dispersaría el espacio latente matemático y reduciría la precisión. Por ello, se ha diseñado un proceso de **reducción de dimensionalidad**, colapsando físicamente las clases originales en 5 Clases Maestras:

1. **Clase 0 (Basura):** Agrupa [0, 1, 2, 6, 7] (No Data, reflejos saturados, agua profunda). Esta clase es ignorada por la Función de Pérdida (`ignore_index`) durante el entrenamiento.
2. **Clase 1 (Suelo Útil):** Agrupa [4, 5] (Vegetación y suelo desnudo).
3. **Clase 2 (Nube):** Agrupa [8, 9, 10] (Nube media, densa y cirros finos).
4. **Clase 3 (Sombra Nube):** Mantiene [3]. Se conserva como clase independiente para evitar la "disonancia cognitiva" en el entrenamiento, ya que agrupar píxeles brillantes (nube) y negros (sombra) bajo una misma etiqueta corrompería el aprendizaje.
5. **Clase 4 (Nieve):** Mantiene [11].

Adicionalmente, el pipeline calcula dinámicamente el índice **NDSI** (*Normalized Difference Snow Index*) operando las bandas B03 (Verde) y B11 (Infrarrojo de Onda Corta). Este índice se inyecta como una banda adicional al tensor de entrada, proporcionando a la red un "atajo matemático" para potenciar el gradiente diferencial entre nieve y nube.

### <span style="color: #FFC000;">2.3 Generación del Dataset (Tiling Dinámico)</span>
Un gránulo completo de Sentinel-2 posee una resolución de 10.980 x 10.980 píxeles. Introducir este tensor completo en la VRAM de una GPU provocaría un fallo de *Out of Memory* (OOM). 

Para solucionarlo, el algoritmo ETL aplica una técnica de **Tiling**:
- Remuestrea iterativamente todas las bandas infrarrojas de 20m (B11, B12) a una malla común de 10m mediante interpolación bilineal.
- Trocea dinámicamente el gránulo en miles de parches (Tensors) de 512 x 512 píxeles.
- Filtra la "basura": Si más del 90% de un parche pertenece a la Clase 0 (por ejemplo, todo es Mar Mediterráneo), el parche se descarta y no se guarda en disco, optimizando dramáticamente el almacenamiento y el tiempo de entrenamiento.

Este flujo de trabajo garantiza que el modelo aprenda exclusivamente de píxeles terrestres con alto valor informativo, sentando las bases para una predicción de alta fiabilidad.

### <span style="color: #FFC000;">2.4 Arquitectura de Base de Datos y DevOps (COG y PMTiles)</span>
Para cumplir con los requisitos de escalabilidad del proyecto y permitir la visualización fluida de los resultados, el almacenamiento y distribución de las máscaras predictivas generadas por el modelo de Inteligencia Artificial no se realizará mediante arquitecturas monolíticas tradicionales. En su lugar, se emplearán formatos *Cloud-Native*:
- **Cloud Optimized GeoTIFF (COG):** Se almacenarán las predicciones rasterizadas de la U-Net en este formato. Esto permite a la plataforma web realizar peticiones *HTTP Range Requests* (solicitar únicamente los píxeles exactos de la zona geográfica que el usuario está viendo en su pantalla), reduciendo el ancho de banda y el coste del servidor en más de un 90%.
- **PMTiles:** Se empaquetará la planimetría y los metadatos espaciales en archivos PMTiles. Estos archivos actúan como bases de datos estáticas completas consultables directamente desde el navegador del usuario (Frontend), eliminando la necesidad de mantener un motor de base de datos activo (arquitectura *Serverless/Backendless*).

Esta infraestructura garantiza que el visor Web GIS final pueda manejar consultas interactivas sobre terabytes de datos satelitales de forma fluida (*on the fly*) y a bajo coste.

### <span style="color: #FFC000;">2.5 Curación Visual del Ground Truth (GIMP Bridge)</span>
Para la validación del modelo, es imperativo comparar sus predicciones contra una "Edición y Clasificación Manual de Píxeles" (máscaras curadas manualmente por un humano donde se corrijan todos los fallos del algoritmo Sen2Cor).

Las máscaras categóricas matemáticas (`.tif` de 1 banda) resultan opacas para los editores fotográficos tradicionales como GIMP o Photoshop, ya que un valor de clase `4` (Nieve) se interpreta como un gris casi negro puro, destruyendo su utilidad visual. Si el analista fuerza el contraste para hacerlo visible, destruye la integridad radiométrica del píxel, corrompiendo el archivo matemático subyacente.

Para solucionar este cuello de botella sin forzar el uso de herramientas GIS complejas para tareas de pintura libre, se ha diseñado e implementado una arquitectura de **Encode/Decode**:
- **Codificador:** Convierte matemáticamente las clases (0-4) a un GeoTIFF RGB de 3 bandas a todo color (Verde, Blanco, Gris, Cyan) manteniendo archivos auxiliares `.tfw` para salvaguardar las coordenadas espaciales.
- **Edición Humana:** El analista utiliza herramientas estándar (lazo, cuentagotas, lápiz) sobre la imagen a color, apoyándose en capas subyacentes de Color Real y Falso Color para realizar las correcciones manuales con extrema facilidad.
- **Decodificador:** Un script inverso escanea los colores RGB inyectados por el operador y reconstruye la matriz matemática original de 1 banda (0-4).

Este "puente" garantiza un proceso de curación altamente ergonómico para el operador humano mientras preserva el rigor matemático indispensable para la Inteligencia Artificial.

### <span style="color: #FFC000;">2.6 Evaluación de Métricas y Clasificación Manual de Píxeles</span>
Una vez que se ha finalizado la curación visual utilizando la arquitectura *Encode/Decode*, se obtiene un conjunto de archivos matemáticos definitivos a los que se denomina **Edición y Clasificación Manual de Píxeles**.

El paso final de la metodología consiste en enfrentar estadísticamente las predicciones puras de la red neuronal U-Net contra esta Edición y Clasificación Manual de Píxeles. Para ello, se calculan métricas estándar de la industria de la Visión Computacional:
- **Intersection over Union (IoU):** También conocido como el Índice de Jaccard, mide exactamente cuánto se solapa la mancha de nieve/nube que predijo la máquina frente a la mancha real definida manualmente. Es la métrica más estricta y fiable para segmentación semántica.
- **Precision y Recall:** Para auditar cuántos "falsos positivos" (ej. arena blanca clasificada como nieve) y cuántos "falsos negativos" (ej. nieve a la sombra que la red no supo detectar) comete el modelo.

Estos resultados dictaminarán el rendimiento real de la Inteligencia Artificial superando las deficiencias heurísticas iniciales del algoritmo Sen2Cor.
