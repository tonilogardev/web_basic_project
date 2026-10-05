# Ciclo de Vida del Modelo (MLOps y Lógica de Negocio)

Este documento define la estrategia metodológica de entrenamiento, validación y mejora continua del modelo de *Deep Learning* (U-Net). Se describe el ciclo de vida completo de la arquitectura, desde su parametrización inicial para el Trabajo de Fin de Grado hasta su consolidación en un entorno de producción operativa.

## Índice
- [0. Justificación Científica del Enfoque Arquitectónico](#0-justificación-científica-del-enfoque-arquitectónico)
- [1. Fase 1: Despliegue y Validación (El TFB)](#1-fase-1-despliegue-y-validación-el-tfb)
- [2. Fase 2: Puesta en Producción (Inferencia Automática)](#2-fase-2-puesta-en-producción-inferencia-automática)
- [3. Fase 3: Entrenamiento Continuo (Human-in-the-Loop y MLOps)](#3-fase-3-entrenamiento-continuo-human-in-the-loop-y-mlops)

---

## 0. Justificación Científica del Enfoque Arquitectónico
Durante el diseño estructural del proyecto, se evaluaron diversas metodologías empleadas en el estado del arte de detección atmosférica. Resulta esencial fundamentar la selección de un **modelo global *Single-Date*** (evaluación de una única captura fusionando distribuciones espaciales heterogéneas) frente a alternativas convencionales.

### Hipótesis Descartada 1: Modelos Especializados Geográficamente
Se contempló el entrenamiento de un modelo experto exclusivo para dominio pirenaico (T31TCH) y otro para dominio litoral/urbano (T31TDF).
*   **Problema (Sobreajuste Espacial):** Las arquitecturas convolucionales poseen propensión a memorizar el contexto topológico estático (urbes, valles) en detrimento de la extracción de características espectrales físicas de las nubes. Si el modelo memoriza el sustrato geográfico, su capacidad inferencial colapsará frente a cambios de uso de suelo (*Land Use Change*). Operativamente (MLOps), la gestión de clústeres de modelos locales carece de escalabilidad.
*   **Evidencia Científica:** Autores como *Mohajerani y Saeedi (2019)* ("Cloud-Net") determinaron empíricamente que la inducción de invarianza espacial requiere exponer a la red convolucional a matrices distribuidas globalmente. Arquitecturas referenciales como *s2cloudless* operan bajo un paradigma de modelo unificado.

### Hipótesis Descartada 2: Detección de Anomalías (Método Multi-Temporal)
Una aproximación alternativa consistiría en ingerir una imagen referencial ("clear-sky") y someter la adquisición reciente a una sustracción temporal (*Change/Anomaly Detection*).
*   **Problema (Deriva del Concepto / Concept Drift):** La superficie terrestre experimenta fluctuaciones dinámicas (transiciones fenológicas, inundaciones de zonas húmedas, ciclos de deshielo). La arquitectura interpretaría lógicamente alteraciones del sustrato como eventos atmosféricos anómalos. La estabilización requiere series temporales masivas e incurre en fallos sistémicos en regiones con persistencia nubosa (imposibilitando la obtención de un "clear-sky" basal).
*   **Evidencia Científica:** El algoritmo **MAJA** (*Hagolle et al., 2010*), estandarizado por el CNES, emplea esta base algorítmica. *Baetens et al. (2019)* concluyen que, si bien MAJA exhibe alta precisión, impone restricciones computacionales severas por su dependencia secuencial y muestra degradación ante alteraciones bruscas de cobertura. *Gómez-Chova et al. (2017)* respaldan que la robustez se fundamenta en un enfoque *Single-Date*, forzando a la arquitectura a asimilar respuestas espectrales atmosféricas (parametrizando límites complejos como nieve) sin anclarse al registro histórico del sustrato.

**Conclusión:** Se ratifica el enfoque **Single-Date Unificado**, entrenado con casos límite (*Hard Negatives*), garantizando la asimilación espectral independiente de la georreferenciación y posibilitando una inferencia de baja latencia en entornos de producción.

---

## 1. Fase 1: Despliegue y Validación (El TFB)
Esta etapa conforma el pilar analítico del proyecto y determina la generación del **Modelo V1** fundacional.

### 1.1 Flujo de Trabajo Operativo (Los 30 Gránulos)
El ensamblaje del conjunto de datos de entrenamiento se rige por un esquema secuencial:

1.  **Extracción Automatizada (API OData):** Sobre la base de gránulos estratégicos, se ejecuta el script de ingesta (`download_sentinel.py`). Se capturan las bandas físicas (B02, B03, B04, B08, B11, B12) y el producto nativo de nivel L2A (SCL).
2.  **Arquitectura (El Ground Truth):** Ante la existencia de errores sistemáticos en Sen2Cor, se invoca un módulo de codificación (`002_encode_for_gimp.py`) que transforma la matriz espacial en composiciones RGB editables. Se procede a una depuración visual manual en GIMP, re-clasificando errores analíticos severos (falsos positivos en coberturas nivales, sombras orográficas o masas de agua). Posteriormente, el módulo decodificador (`003_decode_gimp_edits.py`) re-integra la información en el plano matricial científico.
3.  **Ingeniería de Características (Feature Engineering):** Se procede al cálculo matricial del índice de nieve NDSI `(B03 - B11) / (B03 + B11)` basado en valores de reflectancia, inyectándose en el tensor como una séptima dimensión de profundidad. Esta inyección de dominio físico acelera drásticamente la convergencia del algoritmo U-Net.
4.  **Tiling y Prevención OOM:** Dado el tamaño nativo de las matrices (10980x10980), se procesa el particionado a través de `004_create_dataset.py`, aislando tensores operativos de 512x512 píxeles. Durante el proceso, algoritmos de filtrado descartan bloques estáticos (cuadrantes sin cobertura territorial), generando la estructura de datos definitiva `.pt` (PyTorch) en función de las 6 Clases Maestras.

### 1.2 Generación del "Ground Truth" (Edición y Clasificación)
El proceso de depuración (Paso 2) obedece a una dinámica de eficiencia pragmática:

*   **Intervención sobre el producto SCL:** Se asume como base inicial la clasificación de la ESA. Mediante sistemas SIG (QGIS) o interfaces programáticas, se someten a revisión las discrepancias y se repintan matricialmente los falsos positivos. Este paradigma reduce el esfuerzo de etiquetado manual en más de un 90%.

**Gestión de Casos Extremos (El "efecto confeti"):** En entornos de *Hard Negatives* (e.g. cirros fragmentados sobre estratos nivales), el clasificador de la ESA emite predicciones ruidosas y fragmentadas. Bajo estas circunstancias, se estima operativamente más riguroso purgar integralmente el bloque SCL erróneo y delimitar manualmente los contornos atmosféricos.

### 1.3 Taxonomía de Clases (Ontología del Ground Truth)
Para consolidar la asimilación espectral y anular ambigüedades, se establece un esquema de **6 clases fundamentales**:
* **Clase 0 (NoData / Bordes):** Zonas de supresión espacial. Se excluyen dinámicamente de la función de pérdida matemática (`ignore_index=0`).
* **Clase 1 (Suelo):** Coberturas continentales (tierra, litología, biomasa, asfalto). Altamente reflexivas en espectro SWIR.
* **Clase 2 (Nube):** Entidades de alta reflectancia en el espectro visible e infrarrojo.
* **Clase 3 (Sombra Nube):** Perfiles de oscurecimiento proyectado.
* **Clase 4 (Nieve):** Entidades de reflectancia máxima en el espectro visible, conjugada con absorción total en el canal SWIR.
* **Clase 5 (Masas de Agua):** Mar y formaciones lacustres. Dominantes en la absorción del espectro SWIR. La segregación de esta clase (aislándola del bloque "Suelo") mitiga el riesgo de clasificar la reflectancia especular acuática (*Sun Glint*) como formaciones atmosféricas.

### 1.4 Entrenamiento y Validación
*   **Ajuste Paramétrico Inicial:** Se somete la arquitectura U-Net a entrenamiento bajo el tensor curado. La Función de Pérdida (*Loss Function*) evalúa la desviación entre la inferencia proyectada y el *Ground Truth*, ejecutando la optimización de pesos ( *Backpropagation* ).
*   **Fase Evaluativa de Aislamiento (Test):** Concluida la convergencia matemática, el modelo es evaluado mediante la **muestra de Test aislada de 10 gránulos** (datos inéditos para la red).
*   **Consolidación Métrica:** La superación de los umbrales estadísticos objetivos (IoU, F1-Score), y la demostración de superioridad frente a algoritmos *legacy* en escenarios límite, certifican la validez de la arquitectura, consolidando el despliegue del Modelo V1.

## 2. Fase 2: Puesta en Producción (Inferencia Automática)
Tras la auditoría del Modelo V1, su estructura se migra hacia el aplicativo final (Visor GIS).
*   El modelo transiciona a un estado puro de Inferencia (capacidad predictiva sin reentrenamiento asíncrono).
*   Ante la adquisición satelital sobre el área de interés, la pasarela extrae los canales L1C crudos, aplica la rutina de *tiling* (512x512) e inyecta la malla sobre el Modelo V1.
*   El cálculo neuronal emite la máscara deductiva, la cual se procesa y exporta dinámicamente hacia el usuario en el visor.

## 3. Fase 3: Entrenamiento Continuo (Human-in-the-Loop y MLOps)
Se establece la pauta evolutiva de la arquitectura, fundamentada en rutinas de **Aprendizaje Activo (Active Learning)** y *Fine-Tuning* recurrente.

*   **Auditoría Asistida:** En el marco productivo, el algoritmo inferirá desviaciones estadísticas frente a casuísticas inéditas (canteras recientes o coberturas litológicas anómalas interpretadas como masas atmosféricas).
*   **Asimilación Quirúrgica (Human-in-the-Loop):** Detectada la desviación sistémica, no se ejecuta el re-procesamiento integral del gránulo. Se aísla el cuadrante espacial defectuoso (512x512) y se establece la nueva Verdad Terreno local.
*   **Fine-Tuning Evolutivo:** En intervalos predefinidos, la estructura de pesos del Modelo V1 se somete a entrenamiento focalizado, incorporando la muestra curada local a la base fundacional.
*   **Actualización Estructural:** El conocimiento pre-parametrizado se ajusta vectorialmente, dando lugar a un nuevo bloque consolidado (**Modelo V2**), que es desplegado en producción sin interrupciones arquitectónicas. Este ciclo de integración continua consolida un perfil de escalabilidad teórica ilimitada.
