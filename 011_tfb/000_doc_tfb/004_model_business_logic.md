# Ciclo de Vida del Modelo (MLOps y Lógica de Negocio)

Este documento define la estrategia metodológica de entrenamiento, validación y mejora continua del modelo de *Deep Learning* (U-Net). Describe el ciclo de vida completo de la Inteligencia Artificial, desde su creación inicial para el Trabajo de Fin de Grado hasta su mantenimiento en un entorno de producción real.

## Índice
- [0. Justificación Científica del Enfoque Arquitectónico](#0-justificación-científica-del-enfoque-arquitectónico)
- [1. Fase 1: Nacimiento y Validación (El TFB)](#1-fase-1-nacimiento-y-validación-el-tfb)
- [2. Fase 2: Puesta en Producción (Inferencia Automática)](#2-fase-2-puesta-en-producción-inferencia-automática)
- [3. Fase 3: Entrenamiento Continuo y "Human-in-the-Loop" (MLOps)](#3-fase-3-entrenamiento-continuo-y-human-in-the-loop-mlops)

---

## 0. Justificación Científica del Enfoque Arquitectónico
Durante el diseño de este proyecto, se evaluaron diversas arquitecturas empleadas en la literatura científica para la detección de nubes. Es fundamental justificar ante el tribunal por qué se ha optado por un **modelo global *Single-Date*** (que evalúa una única imagen mezclando múltiples gránulos) frente a otras alternativas lógicas.

### Hipótesis Descartada 1: Un modelo específico por cada gránulo
Podría plantearse entrenar un modelo experto exclusivo para el gránulo de los Pirineos (T31TCH) y otro para el de Barcelona (T31TDF).
*   **Problema (Sobreajuste Espacial):** Las redes neuronales tienden a memorizar el fondo estático (ciudades, valles) en lugar de aprender la física espectral de las nubes. Si el modelo memoriza el paisaje, fallará catastróficamente ante un cambio de uso del suelo o una expansión urbana. Además, a nivel de ingeniería (MLOps), mantener múltiples modelos locales no es escalable.
*   **Evidencia Científica:** Autores como *Mohajerani y Saeedi (2019)* en su artículo ["Cloud-Net"](https://arxiv.org/abs/1901.10077) demostraron que una red neuronal convolucional necesita nutrirse de parches de imágenes globalmente distribuidas para lograr **Invarianza Espacial**. Arquitecturas punteras como *s2cloudless* (de Synergise) también utilizan un único modelo unificado.

### Hipótesis Descartada 2: Detección de Anomalías (Método Multi-Temporal)
Otra aproximación intuitiva es alimentar al modelo con una "imagen ideal 100% despejada" del gránulo y clasificar como nube cualquier desviación temporal (*Change Detection* o *Anomaly Detection*).
*   **Problema (Deriva del Concepto / Concept Drift):** La superficie terrestre cambia constantemente. Una llanura verde en primavera se vuelve marrón en verano, el Delta del Ebro se inunda (brillando como un espejo) y la nieve aparece y desaparece. Un modelo de anomalías detectaría estos cambios naturales como nubes. Solucionarlo requiere procesar pesadas series temporales y fracasa cuando una zona pasa meses cubierta de nubes, impidiendo actualizar la imagen "limpia" de referencia.
*   **Evidencia Científica:** El algoritmo **MAJA** (*Hagolle et al., 2010*), usado por el CNES francés, aplica esta lógica multi-temporal. *Baetens et al. (2019)* en ["Validation of Copernicus Sentinel-2 Cloud Masks"](https://www.mdpi.com/2072-4292/11/4/433) concluyen que aunque MAJA es preciso, es inmensamente pesado a nivel computacional (depende del historial de imágenes previas) y sufre ante cambios bruscos del terreno. Por el contrario, *Gómez-Chova et al. (2017)* respaldan que un modelo *Single-Date* robusto debe obligarse a aprender la física de la nube (usando casos difíciles como la nieve pura) en lugar de depender del historial del fondo.

**Conclusión:** Se adopta un enfoque **Single-Date Unificado** entrenado con casos límite (*Hard Negatives* de nieve y ciudades), garantizando que la red aprenda la respuesta espectral de la nube sin memorizar geográficamente Cataluña, y asegurando una inferencia rápida y ligera en producción.

---

## 1. Fase 1: Nacimiento y Validación (El TFB)
Esta fase constituye el núcleo académico del proyecto y se realiza una única vez para generar el **Modelo V1** fundacional.

### 1.1 Flujo de Trabajo Operativo (Los 30 Gránulos)
El proceso de construcción del dataset de entrenamiento sigue una mecánica estrictamente secuencial por parte del investigador:

1.  **Selección y Descarga:** El investigador decide qué gránulo específico descargar (fecha y *Tile*), basándose rigurosamente en las especificaciones y casos límite detallados en el documento `003_type_granule.md`.
2.  **Edición y clasificación de la Máscara SCL:** Una vez descargados los datos, el investigador revisa la imagen de clasificación de píxeles original de la ESA (SCL) y edita manualmente los píxeles erróneos.
3.  **Preprocesamiento (Feature Engineering):** Antes de entregar los datos a la red, el sistema calculará automáticamente el índice NDSI `(B03 - B11) / (B03 + B11)`. En lugar de pasarle a la U-Net solo los colores crudos, se le pasará este índice como un canal de información extra. Al inyectar el conocimiento físico de *Fmask* ya pre-procesado, se dota a la red neuronal de una ventaja matemática masiva para detectar nieve.
4.  **Ensamblaje del Entrenamiento:** El fichero SCL editado (convertido en el *Ground Truth*), junto con los ficheros de los canales espectrales físicos (B02, B03, B04, B08, B11, B12) y la nueva banda artificial NDSI, conforman el paquete de tensores definitivo que se utilizará para entrenar al modelo de *Machine Learning*. *(Nota: Se ha descartado explícitamente el uso de capas topográficas o DEM, véase doc 006).*

### 1.2 Generación del "Ground Truth" (Técnicas de Edición y Clasificación)
Para ejecutar el Paso 2 mencionado anteriormente, se establece una metodología única y pragmática:

*   **Edición y Corrección del producto SCL:** Se toma como base ineludible la máscara SCL (Nivel L2A) generada por el algoritmo clásico Sen2Cor de la ESA. El investigador revisa visualmente la máscara superpuesta a la imagen real (utilizando herramientas SIG como QGIS o scripts de Python) y re-clasifica o "repinta" manualmente los píxeles erróneos (ej. zonas de nieve marcadas falsamente como nubes o litorales costeros). Esta estrategia ahorra más del 90% del trabajo manual de etiquetado.

**Casos Extremos (El efecto confeti):** En situaciones de *Hard Negatives* (ej. Pirineos con cirros finos sobre nieve), el algoritmo de la ESA suele generar un "ruido de confeti" clasificando píxeles erróneos de forma masiva y altamente fragmentada. En estos escenarios extremos, la mecánica de edición sigue siendo la misma, con la salvedad de que a nivel operativo resulta más eficiente borrar la máscara SCL completa y redibujar el contorno de la nube con la herramienta de polígono, en lugar de intentar corregir el ruido píxel a píxel.

### 1.3 Entrenamiento y Validación
*   **Entrenamiento Supervisado Inicial:** Se entrena la U-Net utilizando el conjunto de entrenamiento curado. Durante este proceso (dividido en cientos de *Epochs*), la Función de Pérdida (*Loss Function*) evalúa matemáticamente el error entre la predicción de la red y la máscara real (*Ground Truth*), ajustando los pesos internos mediante *Backpropagation*.
*   **Validación Ciega (Test):** Una vez la red ha convergido, se somete al examen final utilizando el **conjunto de Test oculto de 10 gránulos** (que la red jamás ha visto). 
*   **Métricas de Éxito:** Si las métricas (IoU, F1-Score) sobre el conjunto de test superan los umbrales de precisión esperados (y superan los resultados de algoritmos clásicos como Sen2Cor en casos complejos), se da por validada la arquitectura y nace oficialmente el Modelo V1.

## 2. Fase 2: Puesta en Producción (Inferencia Automática)
Una vez validado el Modelo V1, este abandona el entorno de entrenamiento y se integra en la aplicación Web (el visor GIS).
*   En esta fase, la red neuronal opera exclusivamente en modo "Inferencia" (solo predice, no aprende).
*   Cada vez que el satélite Sentinel-2 adquiere una nueva imagen sobre Cataluña, el sistema descarga los datos crudos L1C, los recorta en parches de 512x512 y se los pasa al Modelo V1.
*   El modelo genera instantáneamente la máscara de nubes/nieve, la cual se procesa y se muestra visualmente al usuario final en la interfaz web.

## 3. Fase 3: Entrenamiento Continuo y "Human-in-the-Loop" (MLOps)
Ningún modelo de IA es perfecto en el mundo real. La Fase 3 define cómo el modelo evolucionará a lo largo de los años sin necesidad de re-etiquetar miles de imágenes desde cero. Utilizaremos un enfoque de **Aprendizaje Activo (Active Learning)** mediante *Fine-Tuning* recurrente.

*   **Auditoría Humana:** El sistema funcionará en piloto automático en producción, pero ocasionalmente se observarán fallos en la aplicación web (ej. el modelo confunde una nueva cantera brillante o un secano extremo con una nube).
*   **Corrección Quirúrgica (Human-in-the-Loop):** Cuando se detecta un fallo sistemático, el experto humano **no** corrige todo un gránulo de 100x100 km. Únicamente extrae el recorte de 512x512 píxeles donde ha fallado la red y pinta manualmente la máscara correcta en ese recorte específico (generando un nuevo *Hard Negative*).
*   **Fine-Tuning Iterativo:** De forma periódica (ej. una vez al mes), se coge el Modelo V1 guardado y se re-entrena alimentándolo **solo** con el dataset original más las nuevas docenas de recortes corregidos.
*   **Evolución del Modelo:** La red no empieza de cero, sino que mantiene todo su conocimiento anterior y afina sus pesos para corregir esos casos específicos. De este re-entrenamiento rápido nace el **Modelo V2**, que se despliega automáticamente en producción. Este ciclo de mejora continua es infinito, haciendo que la Inteligencia Artificial sea cada día más robusta y adaptada a la dinámica del terreno catalán.
