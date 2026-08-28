import re

file_path = "/home/a.lopez.g/Documents/trabajos/node_2/web_basic_project/011_tfb/000_doc_tfb/000_entrega_03_antonio_lopez_007.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "# 6. Metodología aplicada"
end_marker = "# 7. Desarrollo viable y sostenible"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

new_block = """# 6. Metodología aplicada

Para la consecución de los objetivos planteados y garantizar un ciclo de vida completo del desarrollo tecnológico, la metodología de este proyecto se ha estructurado como un flujo de trabajo iterativo. Esta arquitectura abarca desde la adquisición automatizada del dato bruto satelital hasta su despliegue final interactivo, pasando por el pilar central: la construcción manual de un conjunto de datos sin sesgos y el entrenamiento de la Inteligencia Artificial.

## 6.1. Instrumentos
El desarrollo metodológico se ha sustentado en los siguientes instrumentos de *software* y orígenes de datos:
- **Fuente de observación de la Tierra:** Satélite Sentinel-2 (programa Copernicus de la ESA). Se han empleado tanto los datos radiométricos en bruto (Nivel L1C) como las máscaras preexistentes del procesador oficial (Sen2Cor) a modo de base comparativa. Las descargas se han realizado a través de las APIs del *Copernicus Data Space Ecosystem (CDSE)*.
- **Desarrollo del modelo y *pipeline* ETL:** Máquina de trabajo local equipada con procesadores gráficos (GPUs CUDA) para entrenar las redes neuronales, efectuar las inferencias masivas y ejecutar los *scripts* en Python de descarga, ingeniería de datos y recorte espacial (*tiling*).
- **Edición y clasificación visual:** Software libre de edición de imágenes GIMP, empleado como instrumento principal para la reclasificación manual de los píxeles conflictivos y la generación de la Verdad Terrestre.
- **Modelado de Inteligencia Artificial:** *Framework* PyTorch, estándar de la industria para el entrenamiento matemático de la arquitectura U-Net.
- **Arquitectura de despliegue web:** *Frameworks* de desarrollo Frontend de alto rendimiento (*Svelte*) combinados con motores cartográficos (*MapLibre GL JS*) para renderizar los resultados geoespaciales estáticos precalculados (*Serverless*).

## 6.2. Materiales (Conjunto de datos)
Las arquitecturas de segmentación profunda aprenden de forma más eficiente y generalizan mejor a partir de un conjunto de datos acotado pero estratégicamente curado ("casos difíciles") que de un conjunto masivo pero redundante. Con el objetivo de maximizar la solidez del modelo ante casos geográficamente complejos (*Hard Negatives*), se ha diseñado un *Dataset* de **40 gránulos** específicos de Cataluña, divididos metodológicamente en dos bloques estancos:

1. **Conjunto de Entrenamiento y Validación (30 gránulos):** Seleccionados para enseñar a la red neuronal a resolver los principales desafíos orográficos y espectrales, forzando la invarianza espacial:
   - *Alta Montaña (Pirineos):* Gránulos de invierno (T31TCH, T31TDH) con nieve pura en valles y nubes bajas.
   - *Niebla por Inversión Térmica:* Gránulos de invierno sobre la llanura de Lleida (T31TCG, T31TDG).
   - *Costas y Urbano:* Escenas sobre Barcelona y el mar Mediterráneo (T31TDF) para evitar falsos positivos por naves industriales altamente reflectantes.
   - *Superficies Hídricas:* Gránulos sobre el Delta del Ebro (T31TCE, T31TCF) para mitigar la confusión matemática entre el agua de los arrozales y las sombras oscuras de las nubes.
2. **Conjunto de Test Ciego o *Blind Test* (10 gránulos):** Un bloque de validación aislado que la Inteligencia Artificial jamás observa durante la fase de entrenamiento, evitando la filtración de datos (*Data Leakage*). Consta de 10 imágenes con condiciones atmosféricas extremas para evaluar el rendimiento empírico del modelo frente a Sen2Cor de forma imparcial.

## 6.3. Secuencia Metodológica (Pipeline ETL)
La metodología ha sido codificada en un *pipeline* automatizado de Extracción, Transformación y Carga (ETL) secuencial de cuatro fases:

1. **Fase 1: Ingesta de datos y Orquestación:** Mediante peticiones OData al *Copernicus Data Space Ecosystem*, se descargan los gránulos de entrenamiento y de test en directorios estancos. Se aíslan las 6 bandas multiespectrales ópticas e infrarrojas de interés (L1C), descartando la información redundante y recuperando el fichero de clasificación SCL (L2A) oficial a modo de línea base.
2. **Fase 2: Ingeniería de Datos y Verdad Terreno (*GIMP Bridge*):** 
   - **Tiling (Troceado espacial):** Para evitar colapsos de memoria (OOM) en la GPU, el territorio satelital se recorta dinámicamente en teselas manejables de 512x512 píxeles de 7 canales (las 6 bandas + el índice NDSI inyectado). Un filtro destruye sistemáticamente cualquier cuadrante que contenga más de un 90% de vacío (océano profundo).
   - **Edición Fotográfica:** Para corregir los falsos positivos históricos de Sen2Cor, se diseñó un "GIMP Bridge". Un *script* de Python codifica temporalmente las matrices matemáticas de clasificación (0-5) en tensores de color RGB. Esto permite al investigador abrir los parches en el *software* GIMP y redibujar a mano los contornos de las nubes y la nieve con suma agilidad. Posteriormente, un decodificador revierte el arte visual a un estado matemático estricto, materializando una Verdad Terrestre (*Ground Truth*) absoluta y libre de sesgos para entrenar a la red.
3. **Fase 3: Entrenamiento del Modelo (*Deep Learning*):** La red convolucional U-Net iterativiza sobre el conjunto de datos curado de entrenamiento, minimizando la función de pérdida *Cross Entropy Loss* (configurada con `ignore_index=0` para no penalizar el "NoData" geográfico). Al converger, se congela el estado de los pesos neuronales, consolidando el modelo central.
4. **Fase 4: Inferencia y MLOps (*Human-in-the-Loop*):** El modelo entrenado se despliega sobre el conjunto de Test para generar predicciones algorítmicas, las cuales se integran directamente en el visor GIS web desarrollado en Svelte. Este ciclo de vida está diseñado para una mejora continua: cuando se detecta un error de inferencia en producción, se audita y corrige el parche específico con GIMP, re-entrenando periódicamente la red mediante técnicas de *Active Learning* para generar versiones superiores del modelo.

## 6.4. Metodología de Evaluación
Para certificar empíricamente que el modelo propio supera al estándar europeo, la fase de evaluación técnica se diseñó bajo una regla inquebrantable: **Bajo ningún concepto se evalúa el rendimiento estadístico de la IA contra las máscaras originales defectuosas de Sen2Cor.** Utilizar la salida del procesador oficial como "verdad" generaría un sesgo crítico donde el sistema informático penalizaría a la U-Net precisamente en los casos en los que acierta corrigiendo errores de la ESA. 

El flujo de evaluación establecido es:
1. **Verdad Terreno Auditada en el Test:** Se aplica la misma edición y clasificación manual exhaustiva (*GIMP Bridge*) sobre la totalidad de los 10 gránulos de evaluación extrema.
2. **Cálculo de Métricas Científicas:** Las predicciones emitidas por la red neuronal se enfrentan exclusivamente a esta nueva Verdad Terreno auditada manualmente, empleando métricas de extrema severidad espacial:
   - **Intersection over Union (IoU):** Para medir la superposición geométrica exacta entre la nube/nieve predicha y la real.
   - **F1-Score y Recall (Exhaustividad):** Para evitar métricas de precisión engañosas en clases geográficamente desbalanceadas (como la nieve, que ocupa un porcentaje muy bajo del total del territorio catalán).

"""

new_content = content[:start_idx] + new_block + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Replaced successfully!")
