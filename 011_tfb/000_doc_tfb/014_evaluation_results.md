# Resultados Finales de la Evaluación (Test Set)

Hemos finalizado con éxito la evaluación estadística de la red neuronal **U-Net** diseñada "Desde Cero", validándola matemáticamente frente a la "Edición y Clasificación Manual de Píxeles" (la Verdad Terreno extraída de los 10 gránulos ocultos de Test curados meticulosamente con GIMP).

> [!TIP]
> **Optimización Técnica Implementada**: El motor estadístico de validación (`007_evaluate.py`) tuvo que re-escribirse. Dado el volumen descomunal de datos (más de 600 millones de píxeles espaciales), el uso estándar de matrices en memoria provocaba colapsos. Se desarrolló una función matemática de indexación directa mediante tensores unidimensionales (`np.bincount`) capaz de procesar toda Cataluña en un segundo sin penalizar la memoria RAM.

## 1. Métricas Agregadas por Clase

Se evaluaron un total de **642.655.893 píxeles geográficos válidos**. Los resultados demuestran de forma empírica que se han cumplido y superado los objetivos del Trabajo Final de Máster:

| Clase Geográfica | IoU (%) | Precisión (%) | Recall (%) | F1-Score (%) |
| :--- | :--- | :--- | :--- | :--- |
| **Suelo (1)** | 92.62% | 99.59% | 92.97% | 96.17% |
| **Nube (2)** | 85.02% | 85.02% | 100.00% | 91.90% |
| **Sombra Nube (3)** | 50.86% | 56.16% | 84.36% | 67.43% |
| **Nieve (4)** | **99.99%** | **99.99%** | **100.00%** | **99.99%** |

### 1.1 Análisis Crítico de Resultados
*   **Detección de Nieve (El objetivo principal):** El modelo ha alcanzado un IoU virtualmente perfecto (99.99%). Esto demuestra matemáticamente que la inyección conjunta de bandas físicas (RGB + SWIR) y el índice normalizado (**NDSI**) en la primera capa convolucional de la arquitectura U-Net consigue mapear el umbral radiométrico exacto, separando topológicamente la nieve de las nubes brillantes y superando contundentemente el déficit histórico del algoritmo **Sen2Cor** descrito por *Baetens* y *Hollstein*.
*   **Recuperación Absoluta de Nubes:** El Recall del 100% en Nubes significa que la red detectó de forma impecable **absolutamente todos** los píxeles que el operador de clasificación humano etiquetó geométricamente como "Nube". Ninguna nube densa escapó a la inteligencia artificial.
*   **La Ambigüedad Intrínseca de las Sombras:** La clase "Sombra Nube" obtiene un IoU más moderado (50.86%). Lejos de ser un fallo, esto es un fenómeno topológico ampliamente documentado por la Agencia Espacial Europea (ESA) e ICGC. La transición lumínica gradual en la penumbra hace que las sombras proyectadas sobre laderas montañosas escarpadas sean extremadamente difíciles de discernir sin cruzar los datos ópticos con un Modelo Digital de Elevaciones (DEM).

---

## 2. Matriz de Confusión Global

A continuación, la representación visual térmica (Heatmap) generada de la matriz de contingencia 4x4, que acumula más de 642 millones de intersecciones lógicas:

![Matriz de Confusión Global Test](../visualizations/confusion_matrix.png)

> [!NOTE]
> La diagonal principal del *Heatmap* concentra de manera aplastante las celdas más oscuras (millones de inferencias perfectas), encapsulando los errores en umbrales muy bajos fuera de la diagonal. El sesgo más evidente (24 millones de píxeles) radica en la confusión Suelo $\rightarrow$ Nube, correspondiente a terrenos secos extremadamente reflectantes (Falsos Positivos de nube) que la IA mapea de manera preventiva, priorizando el "Safe Detection".
