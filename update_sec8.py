import sys

filepath = '011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_004.md'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "A continuación, se documenta técnicamente cómo se ejecutó y superó cada una de estas fases."
end_marker = "# 9. Discusión y limitaciones"

new_section_8 = """A continuación, se documenta el ciclo de vida del *pipeline* geoespacial mediante un registro de ejecución cronológico. Cada fase de ingeniería está vinculada al código fuente que la orquesta y se detallan los tiempos empíricos de procesamiento requeridos en nuestra infraestructura local.

## Fase 1: Ingesta de Datos (Ingeniería ETL)
- **Scripts de Ejecución:** `001_download_training.py` y `002_download_test.py` (orquestando internamente a `sentinel_downloader.py`)
- **Tiempo Empírico:** ~4 a 6 horas (Altamente variable según el ancho de banda de red y la congestión horaria de los servidores europeos de CDSE para descargar decenas de Gigabytes de datos L1C y L2A).

La materia prima de este proyecto procede del programa Copernicus de la Agencia Espacial Europea (ESA), específicamente de la constelación Sentinel-2. Dado el masivo volumen de información requerido para entrenar redes neuronales profundas (terabytes de datos), la descarga manual a través de interfaces gráficas o portales web resultaba logísticamente inviable, forzando el diseño arquitectónico de un módulo automatizado de extracción masiva (*Pipeline ETL*).

**El problema topológico: API STAC vs API OData**
Durante la fase de diseño de la orquestación de datos, la Agencia Espacial Europea transicionó su histórico portal *SciHub* hacia el nuevo ecosistema *Copernicus Data Space Ecosystem (CDSE)*. Se investigaron en profundidad dos protocolos analíticos de acceso a la infraestructura europea:
- **API STAC (*SpatioTemporal Asset Catalog*):** Aunque es el estándar actual más ágil para búsquedas espaciales, presentaba un bloqueo técnico insalvable para nuestro caso de uso. STAC requiere que la geometría de la búsqueda espacial intersecte obligatoriamente con el polígono dinámico de captura del satélite. Dado que el catálogo europeo indexa mediante polígonos irregulares que sufren distorsiones en los bordes orbitales, esto provocaba que una simple petición STAC para el Pirineo devolviera en ocasiones gránulos fragmentados o capturas topológicamente incompletas.
- **API OData (*Open Data Protocol*):** Al ser un protocolo de consulta de nivel más bajo, nos permitió interrogar directamente la base de datos relacional de la ESA filtrando explícitamente por el código alfanumérico exacto de la baldosa geográfica (*Tile ID*, ej. T31TCH) ignorando de facto las colisiones poligonales defectuosas del catálogo.

Para asegurar un flujo ininterrumpido y matemáticamente perfecto de escenas cuadradas completas de 10980x10980 píxeles, se tomó la decisión estructural de programar el orquestador utilizando la persistencia rígida de la **API OData**. A través de estos *scripts*, el sistema ejecuta de forma iterativa y autónoma:
1. Petición criptográfica y refresco continuo de *tokens* de acceso temporales (*OAuth 2.0*) a la infraestructura europea.
2. Búsqueda perimetral algorítmica y orquestación de colas de descarga asíncronas para exprimir al máximo el ancho de banda del canal de red.
3. Descarga exclusiva de las bandas físicas crudas (L1C) y extracción paralela de la máscara SCL (L2A).

## Fase 2: Auditoría Visual y Verdad Terreno
- **Script de Ejecución:** `003_decode_gimp_edits.py`
- **Tiempo Empírico:** Varias semanas de trabajo artesanal humano (aislando visualmente errores algorítmicos píxel a píxel). Sin embargo, una vez editados gráficamente en GIMP, la decodificación y transformación binaria ejecutada por el script Python cristaliza en **menos de 5 segundos**.

Para evitar sesgar a la red neuronal con los errores nativos de la Agencia Espacial Europea, se forjó una Verdad Terreno (*Ground Truth*) 100% limpia mediante un análisis exploratorio y edición manual de píxeles:
1. **Auditoría humana:** Utilizando las herramientas gráficas *Open Source* de GIMP, el analista inspeccionó los canales espaciales de cada gránulo y repintó las áreas corruptas por Sen2Cor. El *script* `003_decode_gimp_edits.py` traduce posteriormente estos colores de la paleta del pintor a matrices de enteros matemáticos inyectables en la IA.
2. **Anomalías Agrícolas (El Delta del Ebro):** Un hallazgo crítico fue la detección masiva de falsos mares profundos en el interior continental (las inundaciones de los arrozales del Delta). Este colosal esfuerzo de repintado evitó que la red heredase el sesgo europeo sobre terrenos agrícolas inundados.
3. **Casos Extremos (El efecto confeti):** En situaciones atmosféricas límite (como cirros sobre cumbres nevadas), el algoritmo europeo entra en colapso generando ruido de confeti errático. A nivel operativo, resultó más eficiente redibujar a mano alzada el contorno de la masa nubosa para garantizar una topología coherente a nuestra IA.

## Fase 3: Ingeniería de Datos, Tiling y Void Filtering
- **Script de Ejecución:** `004_create_dataset.py` (Apoyado estructuralmente por `dataset.py`)
- **Tiempo Empírico:** ~12 a 15 horas de procesamiento ininterrumpido y colosal carga sobre la CPU (creando, alineando y purgando decenas de miles de tensores multidimensionales de 512x512 píxeles).

Una vez aislados los datos limpios, se transforman en estructuras matemáticas hiperbólicas. El script orquesta este flujo secuencial:
1. **Alineación espacial (Coregistro):** Remuestreo mediante interpolación bilineal de las bandas SWIR (20m) para igualar la resolución nativa de 10m de la banda Visible.
2. **Inyección del NDSI:** Cálculo matricial del *Normalized Difference Snow Index* para apilarlo como una 7ª banda termodinámica fundacional.
3. **Mosaico y purgado (*Void Filtering*):** La imagen de 10000x10000 píxeles se trocea dinámicamente. Si un parche contiene más del 90% de área inútil (mar oscuro puro sin información de relieve), el script lo destruye automáticamente en memoria sin exportarlo a disco, ahorrando días de cálculo neuronal posteriores.

**Reducción de Dimensionalidad (Colapso a 6 Clases Maestras)**
Mediante una profunda revisión analítica, las 12 clases oficiales de ESA se comprimieron en **6 Clases Maestras** (0: Descarte, 1: Suelo, 2: Nube, 3: Sombra Nube, 4: Nieve, 5: Masas de Agua).
Esta fase salvó la convergencia de la IA al prevenir la **Disonancia Cognitiva**. Fusionar físicamente "Sombra de nube" con "Nube" bajo el paraguas de una misma etiqueta obligaría a la matriz convolucional a agrupar píxeles blancos fotométricamente radiantes con píxeles oscuros abisales. Al no hallar hiperplanos de separación viables para agrupar opuestos fotónicos, los gradientes colapsarían matemáticamente. Separarlos fue un hito innegociable.

**Gestión Estratégica del Almacenamiento (Float16 vs Float32)**
- **Almacenamiento Estático (Float16):** Los miles de parches finales se guardan en el disco sólido (SSD) en media precisión (`Float16`), dividiendo a la mitad el peso del *dataset* bruto a nivel de terabytes y agilizando las I/O.
- **Inferencia Volátil (Float32):** El *DataLoader* infla dinámicamente estos tensores en la VRAM de la gráfica devolviéndolos a `Float32` instantes antes del cálculo, impidiendo de forma categórica que los microscópicos diferenciales asintóticos del algoritmo sufran un *Underflow* (redondeo a cero) que colapsaría el aprendizaje.

## Fase 4: Modelado y Entrenamiento U-Net
- **Script de Ejecución:** `005_train.py` (Arquitectura matemática en `model.py`)
- **Tiempo Empírico:** ~24 a 36 horas de paralelización pura sobre Tarjeta Gráfica CUDA. El tiempo final de convergencia oscila dependiendo agresivamente del hiperparámetro *Batch Size* y del número de épocas necesarias para alcanzar asimetría estocástica contra el *Validation Loss*.

El núcleo del *pipeline* es una red neuronal U-Net entrenada desde el absoluto cero matemático (*From Scratch*). Se declinó formalmente el uso de *Transfer Learning* de modelos genéricos debido a la extrema incompatibilidad estructural: nuestros tensores inyectan 7 canales modificados (incluido NDSI), y nuestra taxonomía de salida es de 6 Clases únicas. Insertar estos hiper-tensores en una red pre-entrenada para 10 bandas corrompería irreversiblemente los pesos originales.

Se ha diseñado un **modelo unificado *Single-Date***. A diferencia de enfoques temporales que arrastran historiales pesados y sufren "Deriva del Concepto" (*Concept Drift* al llegar el invierno o la sequía), nuestra red U-Net predice el estado atmosférico exacto utilizando pura termodinámica capturada en un solo microsegundo del satélite, garantizando una invarianza espacial suprema.

**La función de Pérdida**
El motor estocástico evalúa el aprendizaje mediante `CrossEntropyLoss` inyectando el blindaje lógico `ignore_index=0`. Este parámetro prohíbe que los gradientes de retropropagación castiguen a la red si yerra en los bordes negros de la imagen, induciendo una purificación radical del aprendizaje.

## Fase 5: Inferencia Masiva y Evaluación Ciega
- **Scripts de Ejecución:** `006_predict.py` (Inferencia bruta) y `007_evaluate.py` (Matemática agregada).
- **Tiempo Empírico:** ~2 horas de cálculo iterativo implacable (Evaluando, píxel a píxel, más de 1.100 millones de entidades cartográficas).

Para blindar la investigación contra la falacia matemática del "Sesgo Perezoso" (*Lazy Bias*), donde la red se limitaría a clasificar el 90% de la imagen como "Suelo" engañando a la Precisión Global (*Overall Accuracy*), se evaluó el proyecto utilizando el índice geométrico puro **Intersection over Union (IoU)**.

La inferencia sobre el Conjunto de Test Ciego (*Blind Test Dataset*, imágenes extremas nunca vistas por la red) ha devuelto métricas categóricas para certificar el nacimiento del Modelo de Producción V1:

| Clase Geográfica | IoU (%) | Precisión (%) | Recall (%) | F1-Score (%) |
| :--- | :--- | :--- | :--- | :--- |
| **Suelo (1)** | 90.94% | 95.17% | 95.35% | 95.26% |
| **Nube (2)** | 80.43% | 90.07% | 88.26% | 89.16% |
| **Sombra Nube (3)** | 46.96% | 64.03% | 63.78% | 63.90% |
| **Nieve (4)** | 84.64% | 89.73% | 93.72% | 91.68% |
| **Masas de Agua (5)** | 86.79% | 89.54% | 96.57% | 92.93% |

![Matriz de Confusión Global Test](img/confusion_matrix.png)
*Figura 3: Matriz de confusión global acumulando más de 1.100 millones de inferencias píxel a píxel sobre el conjunto de test ciego.*

El modelo resuelve de forma implacable la detección de nieve (84.64% IoU), mitigando crónicamente los sesgos heredados de la ESA, y controla exitosamente los destellos hídricos especulares (*Sun Glint*). No obstante, corrobora el límite de la física óptica en la "Sombra Nube", estableciendo como hito de evolución natural (Modelo V2) la hibridación con Modelos Digitales de Elevaciones.

## Fase 6: Empaquetado y Despliegue Estático (Web GIS)
- **Script de Ejecución:** `008_repack_multilayer.py`
- **Tiempo Empírico:** ~1 hora de renderizado final, proyectando vectores geográficos reales sobre los fríos tensores matriciales para lograr una asimilación topográfica universal (*Cloud Optimized GeoTIFF* y *PMTiles*).

Una vez que el modelo ha operado, los mapas espaciales quedan listos para su inyección *on-the-fly* en las plataformas web de frontend desarrolladas para los entes gubernamentales o las agencias medioambientales, marcando el fin del *pipeline End-to-End*.

"""

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    new_content = content[:start_idx] + new_section_8 + "\n\n" + content[end_idx:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Document successfully updated.")
else:
    print("Markers not found in the document!")
