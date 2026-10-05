# Master Roadmap: Desarrollo del Modelo de Machine Learning

El presente documento constituye el índice principal del desarrollo del modelo de Machine Learning. En él se detallan cronológicamente las decisiones arquitectónicas y metodológicas adoptadas, sirviendo como guía estructural para la documentación técnica anexa.

---

## Paso 1: Definición y Elección de los Gránulos (Dataset)

La fase inicial del proyecto consistió en la definición de los datos de entrada para la red neuronal. Frente a una descarga masiva e indiscriminada, se optó por, enfocada en seleccionar aquellas regiones geográficas donde el algoritmo original de la ESA presenta mayores tasas de error.

**Hitos y documentación asociada:**

1. **Volumetría y Partición:** 
   Se ha delimitado el alcance a un total de **40 gránulos**, separados estrictamente en dos conjuntos aislados: 30 gránulos para la fase de Entrenamiento/Validación y 10 gránulos para la fase de Test, con el objetivo de prevenir la filtración de datos (*Data Leakage*).
   - *Documentación:* [002_data_set_sentinel_2.md](002_data_set_sentinel_2.md)

2. **Criterios de Selección y Filosofía de Evaluación:**
   La selección se enfoca en 4 escenarios:  
   Caso A: Nieve  
   Caso B: Niebla/Cirros   
   Caso C: Costa/Ciudad  
   Caso D: Secano  
   La evaluación del modelo no se realiza contra la máscara SCL original de Sen2Cor, sino que esta se utiliza exclusivamente como base para generar la "Edición y Clasificación Manual de Píxeles".
   - *Documentación:* [003_type_granule.md](003_type_granule.md)

3. **Arquitectura de Descargas Automatizadas:**
   Se ha programado una librería modular ([`sentinel_downloader.py`](../scripts/sentinel_downloader.py)) y scripts de ejecución ([`001_download_training.py`](../scripts/001_download_training.py) y [`002_download_test.py`](../scripts/002_download_test.py)) que interactúan con la API OData de Copernicus. Estos módulos automatizan la descarga de datos, la extracción de bandas físicas, la agrupación de las 12 clases originales en 6 Clases Maestras y la generación de miniaturas para auditoría visual.
   - *Documentación:* [005_execute_download_sentinel.md](005_execute_download_sentinel.md)

4. **Edición y Clasificación Manual de Píxeles (SCL):**
   Se ha definido una estrategia escalonada para la auditoría de los datos:
   - **Set de Entrenamiento (30 gránulos):** Dado que las redes neuronales presentan cierta tolerancia al ruido estadístico, la revisión visual mediante software SIG (QGIS) se ha limitado a la corrección de errores de clasificación severos.
   - **Set de Test (10 gránulos):** Dado que este conjunto constituye la base de evaluación del modelo, se ha realizado una edición exhaustiva de los píxeles conflictivos (transiciones nieve/nube, sombras/agua). El pipeline prioriza automáticamente la lectura del archivo `SCL_edited.tif` en caso de estar disponible.

5. **Diseño Arquitectónico de la Red Neuronal (U-Net):**
   Se ha optado por implementar una arquitectura U-Net nativa en PyTorch, diseñada para procesar tensores espaciales de 7 canales (6 bandas ópticas + índice NDSI) y retornar 5 mapas de probabilidad. El enmascarado espacial (zonas sin datos o marítimas) se gestiona mediante el parámetro `ignore_index=0` en la función de pérdida (Cross Entropy Loss).
   - *Documentación:* [009_unet_architecture.md](009_unet_architecture.md)

6. **Desarrollo del Pipeline de Entrenamiento:**
   Se han programado módulos en PyTorch ([`dataset.py`](../scripts/dataset.py), [`model.py`](../scripts/model.py) y [`005_train.py`](../scripts/005_train.py)) para la ingesta de matrices espaciales. Para validar la infraestructura, se ejecutó un "Baseline Model" con datos sin curar, asegurando la correcta gestión de tensores y memoria en GPU de forma previa a la edición manual de píxeles.
   - *Documentación:* [010_training_pipeline.md](010_training_pipeline.md)

7. **Arquitectura Encode/Decode (GIMP Bridge):**
   Para permitir la edición visual de matrices matemáticas monocanal (valores 0-4) que resultan invisibles en editores convencionales, se desarrolló una arquitectura puente. Este sistema inyecta color RGB a las matrices, permitiendo su edición manual, y posteriormente decodifica los colores para restituir el archivo raster original (`_SCL_edited.tif`) preservando sus metadatos espaciales.
   - *Documentación:* [012_edit_gimp.md](012_edit_gimp.md)

8. **Inferencia y Clasificación Manual de Píxeles:**
   Edición y clasificación manualmente de la máscara SCL hasta obtener la Verdad Terreno definitiva, requisito previo para la evaluación matemática del modelo.

9. **Evaluación Final y Métricas Estadísticas:**
   Se ha definido la metodología para contrastar matemáticamente las inferencias del modelo U-Net frente a la Verdad Terreno curada. Se prioriza la métrica IoU (Intersección sobre Unión) por clase para mitigar el sesgo estadístico derivado del desbalanceo espacial de los datos.
   - *Documentación:* [013_test_with_SCL_edited.md](013_test_with_SCL_edited.md)

---

10. **Resultados de la Evaluación (Test Set):**
    Mediante el script estadístico `007_evaluate.py`, se contrastaron las inferencias contra la verdad terreno (procesando más de 600 millones de píxeles). Los resultados verifican el cumplimiento de los objetivos planteados, logrando mitigar la confusión algorítmica presente en Sen2Cor. Las métricas finales (IoU, Recall, Precisión) se detallan junto a la matriz de confusión agregada.
    - *Documentación:* [014_evaluation_results.md](014_evaluation_results.md)

---
*(Los siguientes pasos se documentarán a medida que se ejecuten).*
