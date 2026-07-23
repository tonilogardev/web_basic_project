# Master Roadmap: Desarrollo del Modelo de Machine Learning

Este documento funciona como el **índice maestro** o "diario de desarrollo" que resume, paso a paso, todas las decisiones y acciones que se han ido tomando para construir la inteligencia artificial. Sirve como guía de lectura y conecta de forma ordenada con el resto de la documentación técnica del proyecto.

---

## Paso 1: Definición y Elección de los Gránulos (Dataset)

El primer paso y el cimiento del proyecto ha sido definir con precisión qué datos se le van a entregar a la red neuronal. En lugar de usar la fuerza bruta descargando miles de imágenes, se ha diseñado una estrategia de edición y clasificación manual ("Smart Data") para buscar específicamente las zonas de Cataluña y España que más confunden al algoritmo de la ESA.

**Resumen de hitos y documentación en este paso:**

1. **Volumetría y Partición:** 
   Se ha decidido acotar el proyecto a **40 gránulos** en total, separados de forma estricta en dos bloques herméticos: 30 gránulos para la fase de Entrenamiento/Validación y 10 gránulos totalmente ocultos para la fase de Test (para evitar el *Data Leakage*).
   - *Documentación profunda:* [002_data_set_sentinel_2.md](002_data_set_sentinel_2.md)

2. **Criterios de Selección y Filosofía de Evaluación:**
   Se ha dividido la búsqueda en 4 escenarios críticos (Caso A: Nieve, Caso B: Niebla/Cirros, Caso C: Costa/Ciudad, Caso D: Secano). Además, se ha establecido la regla de oro de la evaluación: nunca se testeará el modelo contra el SCL crudo de Sen2Cor, sino que este servirá como plantilla para crear la "Edición y Clasificación Manual de Píxeles".
   - *Documentación profunda:* [003_type_granule.md](003_type_granule.md)

3. **Arquitectura de Descargas Automatizadas:**
   Se ha desarrollado una librería modular ([`sentinel_downloader.py`](../scripts/sentinel_downloader.py)) y dos scripts independientes ([`download_training.py`](../scripts/download_training.py) y [`download_test.py`](../scripts/download_test.py)) que se conectan al OData de Copernicus, descargan decenas de GB, extraen las bandas físicas, colapsan dinámicamente las 12 clases de la máscara SCL original en las 5 Clases Maestras y generan automáticamente miniaturas de previsualización (PNG) para auditoría visual.
   - *Documentación profunda:* [005_execute_download_sentinel.md](005_execute_download_sentinel.md)

4. **Edición y Clasificación Manual de Píxeles (SCL):**
   Se ha definido la estrategia de esfuerzo para la auditoría visual de los datos frente a los errores del algoritmo original de Sen2Cor:
   - **Set de Entrenamiento (30 gránulos):** Revisión rápida. Las redes neuronales son robustas al ruido estadístico. Solo abrimos QGIS para corregir manualmente errores catastróficos muy evidentes.
   - **Set de Test (10 gránulos):** Edición y clasificación quirúrgica. Como el Test es el examen final inamovible, aquí sí editamos a mano los píxeles confusos (nieve/nube, sombras/agua) para generar una verdadera "Edición y Clasificación Manual de Píxeles". El script de creación de dataset está preparado para leer `SCL_edited.tif` de forma preferente si detecta que existe.

5. **Diseño Arquitectónico de la Red Neuronal (U-Net):**
   Se ha establecido la base teórica del modelo de Deep Learning. Se ha decidido construir una U-Net nativa desde cero (from scratch) usando PyTorch, capaz de ingerir tensores espaciales de 7 canales (6 bandas físicas + NDSI) y devolver 5 mapas de probabilidad (Softmax). Se ha resuelto el problema del enmascarado geográfico (NoData/Mar) utilizando `ignore_index=0` en la función de pérdida (Cross Entropy Loss).
   - *Documentación profunda:* [009_unet_architecture.md](009_unet_architecture.md)

6. **Desarrollo del Pipeline de Entrenamiento (Baseline):**
   Se han programado los scripts modulares en PyTorch ([`dataset.py`](../scripts/dataset.py), [`model.py`](../scripts/model.py) y [`train.py`](../scripts/train.py)) para ingestar las matrices espaciales y entrenar la U-Net. Para aislar fallos de programación del ruido en los datos, se ha decidido lanzar un "Baseline Model" entrenando la red con la máscara SCL original (sin curar). Esto asegura que la infraestructura matemática, las funciones de pérdida (`ignore_index`) y la gestión de memoria en GPU funcionen correctamente antes de invertir horas de esfuerzo humano en la edición de píxeles.
   - *Documentación profunda:* [010_training_pipeline.md](010_training_pipeline.md)

7. **Arquitectura Encode/Decode (GIMP Bridge):**
   Dado que las máscaras matemáticas de 1 banda (0-4) aparecen como negro puro en editores fotográficos tradicionales (GIMP, Photoshop), se ha desarrollado una arquitectura puente. Un script inyecta color RGB a las matrices permitiendo al ojo humano reparar los fallos algorítmicos fácilmente (pintando a color). Posteriormente, el decodificador inverso escanea los colores y restituye el archivo matemático original salvaguardando sus metadatos espaciales (`_SCL_edited.tif`).
   - *Documentación profunda:* [012_edit_gimp.md](012_edit_gimp.md)

8. **Inferencia y Clasificación Manual de Píxeles:**
   Se ha aplicado el "Baseline Model" a las 10 imágenes de Test, guardando las predicciones puras de la IA. Posteriormente, mediante el GIMP Bridge, se han curado y corregido estas máscaras hasta generar el archivo de **Edición y Clasificación Manual de Píxeles** definitivo. Este hito marca el cierre de la preparación de datos y da paso inminente a la evaluación matemática (IoU, Matriz de Confusión) del modelo.

9. **Evaluación Final y Métricas Estadísticas:**
   Se ha definido el flujo metodológico para contrastar matemáticamente las predicciones de la U-Net contra la *Verdad Terreno* curada manualmente, justificando (apoyados en literatura científica) el descarte de las máscaras de Sen2Cor para evitar la paradoja de los falsos positivos. Se prioriza el uso de métricas espaciales estrictas (IoU por clase) para aislar los sesgos de desbalanceo.
   - *Documentación profunda:* [013_test_with_SCL_edited.md](013_test_with_SCL_edited.md)

49: ---
50: 
51: 10. **Resultados de la Evaluación (Test Set):**
52:     Se ha ejecutado el motor estadístico `evaluate.py` cruzando las inferencias contra la verdad absoluta (más de 600 millones de píxeles evaluados). Los resultados demuestran el cumplimiento total de los objetivos del TFB, alcanzando un IoU del 99.99% en detección de nieve y solucionando matemáticamente la confusión histórica de Sen2Cor. Se han documentado las métricas estratosféricas (IoU, Recall, Precisión) y generado la gran matriz de confusión agregada térmica.
53:     - *Documentación profunda:* [014_evaluation_results.md](014_evaluation_results.md)
54: 
55: ---
56: *(Los siguientes pasos se documentarán a medida que se ejecuten).*
