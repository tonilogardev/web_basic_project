# Validación del Modelo contra la Edición Manual de Píxeles

Este documento detalla el procedimiento metodológico y estadístico mediante el cual se evaluará el rendimiento final de la red neuronal (U-Net). Se justifica científicamente la decisión crítica de evaluar la Inteligencia Artificial exclusivamente contra los archivos `_SCL_edited.tif` editados y clasificados manualmente, descartando por completo las máscaras originales generadas por el algoritmo Sen2Cor.

## Índice
1. [La Paradoja Algorítmica y la Necesidad de la Verdad Terreno](#1-la-paradoja-algorítmica-y-la-necesidad-de-la-verdad-terreno)
2. [El Flujo de Validación Matemática](#2-el-flujo-de-validación-matemática)
3. [Las Métricas de Evaluación](#3-las-métricas-de-evaluación)

---

## 1. La Paradoja Algorítmica y la Necesidad de la Verdad Terreno

La hipótesis fundamental de este TFB es que el algoritmo estándar de la Agencia Espacial Europea (Sen2Cor) presenta deficiencias severas a la hora de clasificar sombras complejas y diferenciar la nieve de las nubes gruesas.

Si al finalizar el entrenamiento evaluáramos la red neuronal U-Net comparando sus predicciones contra los archivos originales `.SCL` de Sen2Cor, incurriríamos en una **paradoja estadística inaceptable**:
* Si la U-Net ha aprendido correctamente a detectar nieve allí donde Sen2Cor se equivocó y marcó "Nube", el script de validación registraría una discrepancia entre ambos.
* El sistema penalizaría a la IA, marcando un **Falso Positivo**, precisamente cuando la red está corrigiendo de forma exitosa el fallo que motivó esta investigación.

Para evitar este colapso metodológico, el conjunto de datos de **Test (10 gránulos ocultos)** no se evalúa jamás contra la salida de Sen2Cor. En su lugar, el investigador ha operado como "Operador de clasificación de Datos" utilizando el [GIMP Bridge](012_edit_gimp.md) para generar una **Edición y Clasificación Manual de Píxeles** perfecta (`_SCL_edited.tif`).

> **Respaldo Científico:** Esta metodología se alinea con el estado del arte. *Baetens, Desjardins & Hagolle (2019)* demostraron empíricamente las limitaciones de Sen2Cor y concluyeron que la única forma científicamente válida de auditar y validar clasificadores satelitales es generándoles conjuntos de referencia (*Reference Cloud Masks*) mediante procesos humanos supervisados.

---

## 2. El Flujo de Validación Matemática

El proceso de inferencia y cálculo de métricas para el Conjunto de Test sigue este circuito cerrado:

1. **Inferencia Pura:** A la red neuronal entrenada se le inyecta el tensor L1C de 7 canales del conjunto de Test.
2. **Generación de Predicción:** La U-Net expulsa un tensor espacial con las predicciones colapsadas por *Softmax*, generando su propia máscara categórica espacial (`Y_pred`).
3. **Carga de la Verdad Absoluta:** El script de evaluación carga en memoria el archivo `_SCL_edited.tif` del mismo gránulo, que actúa como patrón oro o *Ground Truth* (`Y_true`).
4. **Comparación Píxel a Píxel:** El script aplana ambas matrices espaciales y enfrenta matemáticamente la predicción de la IA contra la decisión del humano, ignorando siempre los píxeles marcados como `0` (NoData / Basura) para evitar el sesgo de evaluación inducido por el ruido geográfico de los bordes del satélite.

---

## 3. Las Métricas de Evaluación

Dada la naturaleza enormemente desbalanceada de las imágenes de satélite (donde el "Suelo Útil" o cielo despejado puede suponer fácilmente el 90% de la imagen), se ha descartado el uso de la *Overall Accuracy* (Precisión Global) como métrica principal, ya que premiaría modelos sesgados que predigan "Suelo" constantemente. 

La evaluación estadística del modelo y su consiguiente fundamentación metodológica se basan en dos herramientas analíticas críticas:

### 3.1. Intersection over Union (IoU / Índice Jaccard)
El IoU se calcula de forma **independiente por clase** (focalizándose estadísticamente en el IoU de Nube y el IoU de Nieve). Esta métrica mide geométricamente la proporción de solapamiento exacto entre la extensión segmentada por el modelo (IA) y la delimitación real establecida en la Verdad Terreno.
* Penaliza de forma rigurosa el **sub-mapeo** (Falsos Negativos): Casuística en la que el modelo no detecta cobertura nívea existente.
* Penaliza de forma rigurosa el **sobre-mapeo** (Falsos Positivos): Casuística en la que el modelo infiere presencia de nieve sobre coberturas terrestres discordantes o masas nubosas.

### 3.2. Matriz de Confusión Agregada (Confusion Matrix)
La acumulación matricial de las inferencias sobre los 10 gránulos de validación permite generar una matriz de confusión agregada. Este instrumento analítico consolida la auditoría técnica aportando máxima transparencia sobre la transferencia de errores entre categorías. Concretamente, permite cuantificar:
* La cantidad total de píxeles clasificados como "Nieve" en el *Ground Truth* que la red neuronal categorizó erróneamente como "Nube" (cuantificando así la mejora respecto al fallo histórico de Sen2Cor).
* La proporción de píxeles de "Nube" que fueron clasificados como "Suelo" (falsos negativos de nubosidad).
* La incidencia de "Sombras Topográficas" reales que el modelo identificó erróneamente como "Sombras de Nubes".
