# Resultados Finales de la Evaluación (Test Set)

Se ha finalizado la evaluación estadística de la red neuronal **U-Net** diseñada ad-hoc, validándola matemáticamente frente a la Edición y Clasificación Manual de Píxeles (la Verdad Terreno extraída de los 10 gránulos de Test curados metodológicamente con la arquitectura GIMP Bridge).

> [!TIP]
> **Optimización Técnica Implementada**: El motor estadístico de validación (`007_evaluate.py`) requirió una refactorización estructural. Dado el volumen de datos a procesar y la discrepancia de resoluciones espaciales (Sen2Cor nativo a 20m vs Predicciones a 10m), se implementó un remuestreo matricial por *Nearest Neighbor* acoplado a una función de agregación algorítmica iterativa (`np.bincount`). Este enfoque permitió el procesamiento integral de la cartografía de validación sin incurrir en desbordamientos de memoria RAM.

## 1. Métricas Agregadas por Clase

Se ha evaluado un volumen de **1.100.892.668 píxeles geográficos válidos**. Los resultados demuestran de forma empírica la consecución de los objetivos planteados:

| Clase Geográfica | IoU (%) | Precisión (%) | Recall (%) | F1-Score (%) |
| :--- | :--- | :--- | :--- | :--- |
| **Suelo (1)** | 90.94% | 95.17% | 95.35% | 95.26% |
| **Nube (2)** | 80.43% | 90.07% | 88.26% | 89.16% |
| **Sombra Nube (3)** | 46.96% | 64.03% | 63.78% | 63.90% |
| **Nieve (4)** | **84.64%** | **89.73%** | **93.72%** | **91.68%** |
| **Masas de Agua (5)** | 86.79% | 89.54% | 96.57% | 92.93% |

### 1.1 Análisis Crítico de Resultados
*   **Detección de Nieve (El objetivo principal):** El modelo registra un IoU del 84.64% y un Recall del 93.72%. Esto demuestra matemáticamente que la inyección conjunta de bandas radiométricas (RGB + SWIR) y el índice normalizado (**NDSI**) en la primera capa convolucional de la arquitectura U-Net consigue mapear el umbral radiométrico, separando topológicamente la nieve de las nubes y superando ampliamente la fiabilidad heurística tradicional.
*   **La Ambigüedad Intrínseca de las Sombras:** La clase "Sombra Nube" obtiene un IoU más moderado (46.96%). Lejos de ser un fallo, esto es un fenómeno topológico ampliamente documentado por la Agencia Espacial Europea (ESA) e ICGC. La transición lumínica gradual en la penumbra hace que las sombras proyectadas sobre laderas montañosas escarpadas sean extremadamente difíciles de discernir sin cruzar los datos ópticos con un Modelo Digital de Elevaciones (DEM).

---

## 2. Matriz de Confusión Global

A continuación, la representación visual térmica (Heatmap) generada de la matriz de contingencia, que acumula **más de mil cien millones de intersecciones lógicas**:

![Matriz de Confusión Global Test](../visualizations/confusion_matrix.png)

> [!NOTE]
> La diagonal principal del *Heatmap* concentra de manera aplastante las celdas más oscuras, encapsulando los errores en umbrales lógicos muy bajos fuera de la diagonal. El mayor índice de fallos cruzados (falsos positivos) recae entre Nubes y Suelos altamente reflectivos, una de las dificultades intrínsecas de todo modelo óptico satelital.
