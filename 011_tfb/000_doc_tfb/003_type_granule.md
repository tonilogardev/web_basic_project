# Criterios de Selección del Dataset (Guía de Extracción de Gránulos)

Este documento establece la metodología de selección manual para las imágenes Sentinel-2 en el repositorio Copernicus Browser. El objetivo radica en aislar 40 gránulos óptimos que representen escenarios topográficos y meteorológicos complejos ("casos difíciles") para el entrenamiento de la arquitectura U-Net.

## Índice
- [0. Filosofía de Selección: El Sesgo del Suelo Dominante](#0-filosofía-de-selección-el-sesgo-del-suelo-dominante)
- [1. Conjunto de Entrenamiento (30 Gránulos)](#1-conjunto-de-entrenamiento-30-gránulos)
  - [Caso A: Nivel Máximo de Complejidad - Interacciones Nieve/Nube (Pirineos)](#caso-a-nivel-máximo-de-complejidad---interacciones-nievenube-pirineos)
  - [Caso B: Niebla de Inversión y Nubosidad Convectiva (Llanura)](#caso-b-niebla-de-inversión-y-nubosidad-convectiva-llanura-central)
  - [Caso C: Anomalías Urbanas y Entornos Marinos (Costa Central)](#caso-c-anomalías-urbanas-y-entornos-marinos-costa-central)
  - [Caso D: Fenología Agrícola y Zonas de Inundación (Sur)](#caso-d-fenología-agrícola-y-zonas-de-inundación-sur)
- [2. Conjunto de Test Aislado (10 Gránulos)](#2-conjunto-de-test-aislado-10-gránulos)

---

## 0. Filosofía de Selección: La Regla de Oro (Suelo vs Nube)

Como principio metodológico fundamental en *Deep Learning*: **La inmensa mayoría de los gránulos debe presentar un umbral de nubosidad situado entre el 30% y el 70%, garantizando la coexistencia espacial de nubes y suelo visible.**

**Justificación Analítica:**
1. **Fronteras y Proyección de Sombras:** La ingesta de gránulos con cobertura nubosa del 100% inhibe la parametrización de las sombras proyectadas sobre la superficie, así como la caracterización de los bordes nubosos (gradientes de transición nube-terreno).
2. **Eficiencia del Muestreo (Tiling):** Puesto que la arquitectura U-Net particiona la matriz espacial en cuadrantes de 512x512 píxeles, un gránulo con nubosidad dispersa (40%) genera inherentemente un conjunto de datos mixto: parches con 100% de nubosidad, parches 100% despejados, y áreas de transición críticas.
3. **El Sesgo del Suelo Dominante:** La inclusión desproporcionada de gránulos totalmente despejados provocaría un desbalanceo de clases (dominancia del 90% de píxeles "Suelo"). Esto induce un fenómeno estadístico donde el modelo prioriza predecir "Suelo" por defecto para maximizar el *Accuracy* global, invisibilizando formaciones nubosas minoritarias.

**La Única Excepción (Hard Negatives):**
La extracción de gránulos con cobertura 0% se reserva exclusivamente para la parametrización de "Falsos Positivos Duros". Ejemplos: coberturas nivales puras bajo alta insolación (para disociar espectralmente la nieve pura de la nube), o tejidos urbanos e industriales de alta reflectancia (para evitar que geometrías reflectantes, como cubiertas industriales, sean catalogadas como formaciones atmosféricas).

## 1. Conjunto de Entrenamiento (30 Gránulos)

### Caso A: Nivel Máximo de Complejidad - Interacciones Nieve/Nube (Pirineos)
Resulta crítico parametrizar la disociación física (mediante canal SWIR) en zonas de solapamiento nival y nuboso.
*   **Cantidad:** 8 Gránulos
*   **Identificadores Estratégicos:** `T31TCH` (Val d'Aran/Aigüestortes), `T31TDH` (Cerdanya/Ripollès).
*   **Ventana Temporal:** Enero, Febrero, Marzo.
*   **Criterios de Inspección Visual:** 
    *   **2 Gránulos (Hard Negatives):** Cobertura despejada absoluta. Masas nivales íntegras. Este conjunto instruye a la red sobre la textura espacial y radiometría pura de la nieve.
    *   **6 Gránulos (Interacción Mixta):** Coexistencia de formaciones nivales con sistemas nubosos superpuestos. Obliga al algoritmo a inferir gradientes espectrales mínimos entre la nubosidad y el estrato nival subyacente. Filtro Copernicus recomendado: 20% - 60%.

### Caso B: Niebla de Inversión y Nubosidad Convectiva (Llanura Central)
La niebla de subsidencia orográfica presenta alta similitud espectral con nubosidad alta. Los cirros representan el reto principal estival.
*   **Cantidad:** 8 Gránulos
*   **Identificadores Estratégicos:** `T31TCG` (Plana de Lleida Norte), `T31TDG` (Cataluña Central / Berguedà).
*   **Criterios de Inspección Visual:**
    *   **4 Gránulos de Invierno (Niebla):** Diciembre/Enero. Situaciones anticiclónicas. Masas de niebla restringidas al fondo de valle, con divisorias montañosas circundantes despejadas.
    *   **4 Gránulos de Verano (Cirros/Cúmulos):** Junio/Julio. Cobertura del 30-50%. Formaciones estratificadas (Cirros) o estructuras convectivas aisladas proyectando sombra dura sobre cobertura terrestre árida. Ausencia estricta de nieve.

### Caso C: Anomalías Urbanas y Entornos Marinos (Costa Central)
La reflectancia de infraestructuras urbanas actúa como sumidero de falsos positivos. Paralelamente, la baja reflectancia marina intensifica el contraste de nubosidad minoritaria.
*   **Cantidad:** 8 Gránulos
*   **Identificadores Estratégicos:** `T31TDF` (Área Metropolitana de Barcelona).
*   **Ventana Temporal:** Indiferente (mezclar estacionalidad).
*   **Criterios de Inspección Visual:**
    *   **2 Gránulos (Hard Negatives):** Entorno urbano y litoral 100% despejado bajo alta insolación (mitigación de falsos positivos en zonas industriales y asfaltos claros).
    *   **6 Gránulos (Contraste Litoral):** Nubosidad advectiva (30%-70%) transitando entre el dominio marítimo y el entorno antropogénico, forzando la evaluación de bordes bajo fondos de alta varianza (ciudad) frente a fondos homogéneos de baja reflectancia (mar).

### Caso D: Fenología Agrícola y Zonas de Inundación (Sur)
El objetivo radica en evaluar el comportamiento frente a láminas de agua antropogénicas (arrozales) y coberturas edáficas de alta albedo (secanos extremos).
*   **Cantidad:** 6 Gránulos
*   **Identificadores Estratégicos:** `T31TCE` (Delta del Ebro), `T31TCF` (Llanuras de secano).
*   **Criterios de Inspección Visual:**
    *   **3 Gránulos (Inundación Agrícola):** Mayo/Junio (Delta del Ebro). Parajes inundados con nubosidad en tránsito (20-40%). Evita la clasificación errónea de reflejos especulares acuáticos (*Sun Glint*).
    *   **3 Gránulos (Aridez Estival):** Agosto. Llanuras áridas con nubosidad consolidada (50%). Enseña a la arquitectura a distinguir la firma radiométrica de la nube frente a suelos áridos altamente reflectantes en espectro visible.

---

## 2. Conjunto de Test Aislado (10 Gránulos)
Este conjunto se reserva estrictamente para la fase de validación inferencial. **Se prohíbe terminantemente su exposición durante la fase de entrenamiento**.

*   **Invierno (5 Gránulos):**
    *   2 × `T31TCH` o `T31TDH` (Febrero): Máxima cobertura nival con nubosidad parcial.
    *   2 × `T31TCG` (Enero): Eventos severos de niebla orográfica.
    *   1 × `T31TDF` (Diciembre): Proyección de sombras kilométricas bajo ángulo solar bajo.
*   **Verano/Transición (5 Gránulos):**
    *   2 × `T31TDG` (Abril/Mayo): Zonas de transición fenológica y deshielo parcial.
    *   2 × `T31TDF` (Agosto): Desarrollos tormentosos estivales y frentes marítimos.
    *   1 × `T31TCE` (Julio): Zona deltaica parcialmente cubierta.

---

## 3. Filosofía de Evaluación: La "Clasificación Manual de Píxeles" (Verdad Terreno)

Se establece un protocolo analítico estricto para la evaluación del modelo: **Bajo ninguna circunstancia se calcularán métricas de rendimiento contra la máscara SCL original de Sen2Cor en el conjunto de Test.**

Dado que la literatura científica (e.g., *Baetens, Desjardins & Hagolle, 2019*) demuestra que algoritmos tradicionales como Sen2Cor incurren en sesgos sistemáticos frente a la nieve y cuerpos de agua, su uso como "verdad absoluta" generaría una distorsión métrica: el sistema penalizaría estadísticamente a la red U-Net precisamente en los escenarios donde acierta al subsanar un falso positivo heredado de la ESA.

**El Protocolo Operativo para el Test Set se estructura de la siguiente forma:**
1. Ejecución de la ingesta de gránulos de Test (incluyendo máscaras SCL nativas) mediante el script [`002_download_test.py`](../scripts/002_download_test.py).
2. Utilización del archivo SCL de Sen2Cor exclusivamente como matriz topológica preliminar.
3. Ejecución de un proceso de **edición visual asistida en entornos GIS**, realizando una reclasificación manual sobre las zonas de conflicto radiométrico (apoyada en visualizaciones de `ColorReal.vrt` y `FalsoColor_Nieve.vrt`).
4. Exportación del raster editado como la **Verdad Terreno consolidada**.
5. Los indicadores estadísticos finales (F1-Score, IoU, Accuracy) se computarán confrontando la inferencia de la arquitectura U-Net frente a esta Verdad Terreno revisada empíricamente.
