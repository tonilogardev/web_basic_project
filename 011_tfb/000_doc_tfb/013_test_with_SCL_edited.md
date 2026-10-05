# Validación del Modelo contra la Edición Manual de Píxeles

Este documento detalla el procedimiento metodológico y estadístico mediante el cual se evaluará el rendimiento final de la red neuronal (U-Net). Se justifica científicamente la decisión crítica de evaluar la Inteligencia Artificial exclusivamente contra los archivos `_SCL_edited.tif` editados y clasificados manualmente, descartando por completo las máscaras originales generadas por el algoritmo Sen2Cor.

## Índice
1. [La Paradoja Algorítmica y la Necesidad de la Verdad Terreno](#1-la-paradoja-algorítmica-y-la-necesidad-de-la-verdad-terreno)
2. [El Flujo de Validación Matemática](#2-el-flujo-de-validación-matemática)
3. [Las Métricas de Evaluación](#3-las-métricas-de-evaluación)

---

## 1. La Paradoja Algorítmica y la Necesidad de la Verdad Terreno

El algoritmo estándar de la Agencia Espacial Europea (Sen2Cor) presenta deficiencias severas a la hora de clasificar sombras complejas y diferenciar la nieve de las nubes gruesas.

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

En las imágenes de satélite es muy común que el 90% de la foto sea simplemente suelo despejado (esto se llama clases desbalanceadas). Por este motivo, **no podemos usar la Precisión Global (*Overall Accuracy*) para evaluar al modelo**. Si la usáramos, una IA "vaga" que siempre respondiera "Suelo" sacaría un 90% de acierto a pesar de no haber detectado ni una sola nube o parche de nieve, engañándonos con una nota alta inmerecida.

Para evitar esta trampa estadística, evaluamos al modelo utilizando dos herramientas mucho más estrictas:

### 3.1. Intersection over Union (IoU / Índice Jaccard)
El IoU es la nota principal del modelo y se calcula **clase por clase** (por ejemplo, le damos una nota a la "Nieve" y otra distinta a la "Nube"). Mide exactamente cuánto coincide el contorno dibujado por el modelo con el contorno real de la Verdad Terreno.
Es una métrica muy estricta que penaliza enormemente al modelo en dos casos:
* Si el modelo pinta de menos (Falsos Negativos): Se deja nieve real sin detectar.
* Si el modelo pinta de más (Falsos Positivos): Se inventa que hay nieve donde en realidad hay nubes o suelo.

### 3.2. Matriz de Confusión (Confusion Matrix)
Es una tabla resumen que agrupa los resultados de todas las imágenes de validación para ver **exactamente cómo y con qué se confunde el modelo**. En lugar de darnos solo una nota numérica, nos cuenta la historia de los errores. Por ejemplo, permite ver directamente:
* Cuántos píxeles que eran realmente "Nieve" (Verdad Terreno), el modelo los confundió diciendo que eran "Nube". Esto es clave para ver si hemos conseguido solucionar el problema histórico del algoritmo de la ESA (Sen2Cor).
* Cuántas "Nubes" reales se le escaparon al modelo porque las clasificó como "Suelo".
* Cuántas veces el modelo se lió al ver la sombra de una montaña (Sombra Topográfica) y la clasificó como la sombra de una nube.
