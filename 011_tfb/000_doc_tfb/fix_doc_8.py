import re

file_path = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_007.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "# 8. Proceso y resultados"
end_marker = "# 9. Discusión y Análisis Crítico"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

new_block = """# 8. Proceso y resultados

Este apartado detalla la ejecución técnica del *pipeline* geoespacial y presenta los resultados cuantitativos de la evaluación del modelo frente al algoritmo estándar Sen2Cor.

## 8.1. Cronología de Pivotes Arquitectónicos
El desarrollo del proyecto siguió un enfoque iterativo (*Agile*) debido a la extrema complejidad topográfica y radiométrica de Cataluña. A lo largo del ciclo de vida del software, la investigación colisionó con severas barreras que exigieron cambios estratégicos drásticos de rumbo (*pivotes* arquitectónicos):

- **Pivote 1. El abandono de Sen2Cor:** Al auditar el relieve de los Pirineos, se constató la incapacidad crítica del algoritmo Sen2Cor de la ESA para separar la nieve de la nube gruesa. Se determinó construir desde cero (*From Scratch*) nuestra propia Red Neuronal U-Net.
- **Pivote 2. El Dilema Topográfico:** Para diferenciar las nubes densas de la nieve, la arquitectura inicial contempló inyectar el Modelo Digital de Elevaciones (DEM) de Cataluña. Por criterios de simplicidad arquitectónica, se descartó su integración para apostar exclusivamente por la física espectral (bandas SWIR y NDSI). Esto agilizó inmensamente el cómputo pero provocó que el modelo presente debilidades algorítmicas frente a las sombras orográficas oscuras en laderas escarpadas, estableciendo una clara línea de investigación futura.
- **Pivote 3. El colapso del Delta del Ebro (Clase Masas de Agua):** Durante las primeras épocas de entrenamiento con 5 clases, las inferencias sobre el Mediterráneo y los arrozales del Delta del Ebro colapsaron. El sol, al reflejarse especularmente en el mar (*Sun Glint*), cegaba a la red neuronal, haciéndole predecir inmensos bancos de nubes inexistentes. El problema se solucionó paralizando el entrenamiento, rediseñando el espacio latente matemático y aislando una sexta Clase Maestra específica para las Masas de Agua.

## 8.2. Resultados Finales de la Evaluación
Hemos finalizado con éxito la evaluación estadística de la red neuronal U-Net validándola matemáticamente frente a la Edición y Clasificación Manual de Píxeles (la Verdad Terreno extraída de los 10 gránulos ocultos de Test, editados manualmente con GIMP para corregir los fallos nativos de la ESA). 

Se evaluaron un total de **1.100.892.668 píxeles geográficos válidos**. Dado el volumen descomunal de datos, el motor estadístico implementó un remuestreo al vuelo por *Nearest Neighbor* y agregación matemática directa (`np.bincount`) para cruzar toda la geografía de test sin colapsar la RAM del sistema.

### 8.2.1. Métricas Agregadas por Clase
Los resultados demuestran de forma empírica que se han cumplido los objetivos del proyecto:

| Clase Geográfica | IoU (%) | Precisión (%) | Recall (%) | F1-Score (%) |
| :--- | :--- | :--- | :--- | :--- |
| **Suelo (1)** | 90.94% | 95.17% | 95.35% | 95.26% |
| **Nube (2)** | 80.43% | 90.07% | 88.26% | 89.16% |
| **Sombra Nube (3)** | 46.96% | 64.03% | 63.78% | 63.90% |
| **Nieve (4)** | **84.64%** | **89.73%** | **93.72%** | **91.68%** |
| **Masas de Agua (5)** | 86.79% | 89.54% | 96.57% | 92.93% |

**Análisis de la detección de nieve:**
El modelo ha alcanzado un IoU sobresaliente del 84.64% con un Recall del 93.72%. Esto demuestra categóricamente que la inyección conjunta de bandas físicas ópticas, infrarrojas (SWIR) y el índice matemático NDSI consigue separar topológicamente la nieve de las nubes, resolviendo la confusión histórica de Sen2Cor.

**Análisis de las Sombras de Nube:**
La clase "Sombra Nube" obtiene un IoU más moderado (46.96%). Lejos de ser un fallo de la red, es un fenómeno documentado: la transición lumínica gradual hace que las sombras proyectadas sobre laderas montañosas escarpadas sean imposibles de discernir de las verdaderas sombras de las nubes, a menos que se crucen los datos ópticos bidimensionales con un modelo altimétrico (DEM) tridimensional.

### 8.2.2. Matriz de Confusión Global
A continuación, se representa el mapa térmico (*Heatmap*) generado a partir de la matriz de contingencia, que acumula más de mil cien millones de intersecciones lógicas:

![Matriz de Confusión Global Test](img/confusion_matrix.png)
*Figura 3: Matriz de confusión global acumulando más de 1.100 millones de inferencias sobre el conjunto de test ciego.*

La diagonal principal concentra de manera aplastante las celdas más oscuras (aciertos verdaderos), encapsulando los errores en umbrales lógicos muy bajos fuera de la diagonal. El modelo resuelve de forma implacable la detección de nieve y controla exitosamente los destellos hídricos especulares.

"""

new_content = content[:start_idx] + new_block + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Replaced successfully!")
