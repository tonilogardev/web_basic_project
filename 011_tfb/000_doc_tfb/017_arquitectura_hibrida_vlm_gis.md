# Arquitectura Híbrida Desacoplada: VLM + GIS

Este documento detalla analíticamente el flujo de trabajo automatizado mediante el cual un Modelo de Lenguaje Visual (VLM) orquesta la edición de máscaras satelitales, abstraído de la necesidad de procesar sistemas de coordenadas geográficas nativas (EPSG, Lat/Lon).

La viabilidad del sistema reside en su diseño de **arquitectura totalmente desacoplada**: las rutinas programáticas en Python operan como "Motor Geométrico", mientras que el LLM ejerce de "Motor de Decisión Semántica".

---

## Paso 1: Pre-procesamiento GIS (Tiling y Gridding)
El objetivo de esta fase es la transcodificación del tensor GeoTIFF matemático a un formato raster visual referenciado, optimizado para la auditoría cualitativa mediante modelos multimodales.

1. **Lectura Geoespacial:** Python (mediante la librería `rasterio`) lee el gránulo Sentinel-2 original.
2. **Troceado (Tiling):** Se extraen baldosas de un tamaño digerible para la IA (ej. 512x512 píxeles). **Clave técnica:** `rasterio` almacena en la memoria del script la "transformación afín" de cada baldosa, es decir, el cordón umbilical que une esta pequeña matriz de píxeles con su ubicación exacta en el mundo real.
3. **Fusión Visual (Early Visual Fusion):** Se unen las 3 capas (Color Real, Falso Color, Máscara) en un archivo `.png` en RAM.
4. **Inyección de Cuadrícula (Grid Prompting):** Sobre el `.png`, el script (usando `OpenCV` o `Pillow`) dibuja una rejilla semitransparente dividiendo la imagen en celdas (ej. de 64x64 píxeles). Cada celda recibe una coordenada visual alfanumérica (A1, A2, B1, B2...).

## Paso 2: La Consulta a la IA (El Prompt)
El script envía el archivo `.png` cuadriculado a la API del modelo multimodal (ej. Google Gemini).

**Instrucción Inyectada:**
> "Actúa como auditor. Compara la máscara con las otras dos bandas. Si detectas nubes clasificadas como suelo, o píxeles nodata que deberían tener clase, devuelve estrictamente el ID de la celda afectada y la clase correcta en formato JSON."

## Paso 3: La Evaluación de la IA (El Veredicto)
El modelo multimodal ignora por completo la Tierra, los meridianos y paralelos. Opera exclusivamente en el "espacio de la imagen". Aplica su razonamiento lógico y responde con una estructura matemática simple:

```json
{
  "errores": [
    {"celda": "C4", "nueva_clase": 1},
    {"celda": "D4", "nueva_clase": 1},
    {"celda": "A1", "nueva_clase": 3}
  ]
}
```

## Paso 4: Post-procesamiento GIS (La Traducción Inversa)
En esta fase, la orden semántica visual contenida en la respuesta JSON es traducida matemáticamente a un impacto geográfico determinista.

1. **De Celda a Matriz Local:** El script de Python ha sido programado para saber que la celda "C4" corresponde a una caja (Bounding Box) que abarca exactamente desde el píxel `X:128` al `X:192` y del `Y:192` al `Y:256` dentro de esa baldosa de 512x512.
2. **De Matriz a Geoespacio:** Recuperando los metadatos guardados en el Paso 1, `rasterio` proyecta ese pequeño cuadrado `[128:192, 192:256]` a las coordenadas UTM reales del planeta.
3. **Edición Quirúrgica:** El script abre el archivo GeoTIFF original de la máscara (`_SCL_GIMP.tif`) y, actuando como un bisturí, sobrescribe únicamente ese bloque exacto de píxeles con el nuevo valor (ej. `1` = Nube), sin corromper ni un centímetro del resto de la imagen ni perder su georreferenciación.

## Paso 5: El Ciclo de Active Learning
Tras la iteración algorítmica sobre la totalidad de las baldosas y la ejecución paramétrica de las inyecciones dictadas por la IA, el archivo original queda rectificado de forma autónoma.
Se consolida así un *Ground Truth V2* de alta fidelidad, capacitado para el reentrenamiento de la red neuronal U-Net. Se demuestra empíricamente la capacidad de un LLM genérico para auditar y dirigir el entrenamiento de una red de segmentación geoespacial especializada.

## Paso 6 (Evolución): Inferencia Local vs API 
Con la evolución tecnológica de los modelos fundacionales abiertos (e.g. **PaliGemma** o **LLaVA**), el motor de decisión semántica puede ejecutarse de forma integral *on-premise*, sujeto a requerimientos de hardware específicos (e.g. GPU NVIDIA Quadro P5000 de 16GB VRAM).

### Pros de utilizar un VLM en local (PaliGemma):
- **Cero Límites de Cuota (Rate Limits):** Al no depender de una API (como Gemini o GPT-4o), el script no sufre errores `429 Resource Exhausted` ni necesita pausas forzosas de 20 a 60 segundos entre imágenes.
- **Coste Cero a Escala:** Auditar 1.000 gránulos de Sentinel-2 cuesta exactamente lo mismo que auditar 1.
- **Privacidad Total:** Los datos satelitales (y las estrategias de etiquetado) nunca salen de la máquina local.
- **Alineación con la Filosofía Open-Source:** Demuestra que un pipeline de *Active Learning* para GIS puede ser 100% soberano y no depender de oligopolios tecnológicos.

### Contras de utilizar un VLM en local:
- **Requisitos de Hardware:** Exige una inversión inicial o alquiler de máquinas con GPUs potentes (idealmente >12GB de VRAM) para cargar los pesos del modelo en memoria y hacer inferencia rápida.
- **Capacidad de Razonamiento:** Los modelos locales ligeros (ej. PaliGemma de 3B parámetros) son extremadamente buenos siguiendo instrucciones cortas, pero pueden tener un nivel de "sentido común visual" ligeramente inferior a modelos masivos en la nube (como Gemini 3.1 Pro de cientos de miles de millones de parámetros). Requieren un ajuste del *Grid Prompting* mucho más estructurado.
