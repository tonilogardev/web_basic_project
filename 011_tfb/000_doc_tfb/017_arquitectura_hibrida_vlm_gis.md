# Arquitectura Híbrida Desacoplada: VLM + GIS

Este documento detalla, paso a paso y de forma minuciosa, el flujo de trabajo automatizado que permite a un Modelo de Lenguaje Visual (VLM) dictar la edición de máscaras satelitales sin que la Inteligencia Artificial necesite comprender sistemas de coordenadas geográficas (EPSG, Lat/Lon).

El éxito de este sistema radica en su diseño **totalmente desacoplado**: el script de Python asume el rol de "Motor Geométrico" y el LLM asume el rol de "Motor de Decisión Visual".

---

## Paso 1: Pre-procesamiento GIS (Tiling y Gridding)
El objetivo de este paso es transformar el GeoTIFF matemático (incomprensible para un LLM) en un formato puramente visual y referenciado que la IA pueda auditar como si jugara a "hundir la flota".

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
Aquí es donde ocurre la magia geométrica. El script de Python recibe el JSON y traduce la orden visual a un impacto geográfico.

1. **De Celda a Matriz Local:** El script de Python ha sido programado para saber que la celda "C4" corresponde a una caja (Bounding Box) que abarca exactamente desde el píxel `X:128` al `X:192` y del `Y:192` al `Y:256` dentro de esa baldosa de 512x512.
2. **De Matriz a Geoespacio:** Recuperando los metadatos guardados en el Paso 1, `rasterio` proyecta ese pequeño cuadrado `[128:192, 192:256]` a las coordenadas UTM reales del planeta.
3. **Edición Quirúrgica:** El script abre el archivo GeoTIFF original de la máscara (`_SCL_GIMP.tif`) y, actuando como un bisturí, sobrescribe únicamente ese bloque exacto de píxeles con el nuevo valor (ej. `1` = Nube), sin corromper ni un centímetro del resto de la imagen ni perder su georreferenciación.

## Paso 5: El Ciclo de Active Learning
Una vez que el script ha recorrido las 121 baldosas y aplicado todas las inyecciones de código dictadas por la IA, el archivo original queda reparado de forma totalmente desatendida.
El resultado es un *Ground Truth V2* de altísima fidelidad, listo para volver a entrenar a la red neuronal U-Net. Hemos logrado que un LLM genérico audite e instruya de facto a una red de segmentación geoespacial altamente especializada.

## Paso 6 (Evolución): Inferencia Local vs API 
Con el avance de los modelos de visión de código abierto (como **PaliGemma** o **LLaVA**), el "Motor de Decisión Visual" (Paso 2 y 3) puede ejecutarse íntegramente de forma local, siempre que se disponga de hardware adecuado (por ejemplo, una GPU NVIDIA Quadro P5000 con 16GB de VRAM).

### Pros de utilizar un VLM en local (PaliGemma):
- **Cero Límites de Cuota (Rate Limits):** Al no depender de una API (como Gemini o GPT-4o), el script no sufre errores `429 Resource Exhausted` ni necesita pausas forzosas de 20 a 60 segundos entre imágenes.
- **Coste Cero a Escala:** Auditar 1.000 gránulos de Sentinel-2 cuesta exactamente lo mismo que auditar 1.
- **Privacidad Total:** Los datos satelitales (y las estrategias de etiquetado) nunca salen de la máquina local.
- **Alineación con la Filosofía Open-Source:** Demuestra que un pipeline de *Active Learning* para GIS puede ser 100% soberano y no depender de oligopolios tecnológicos.

### Contras de utilizar un VLM en local:
- **Requisitos de Hardware:** Exige una inversión inicial o alquiler de máquinas con GPUs potentes (idealmente >12GB de VRAM) para cargar los pesos del modelo en memoria y hacer inferencia rápida.
- **Capacidad de Razonamiento:** Los modelos locales ligeros (ej. PaliGemma de 3B parámetros) son extremadamente buenos siguiendo instrucciones cortas, pero pueden tener un nivel de "sentido común visual" ligeramente inferior a modelos masivos en la nube (como Gemini 3.1 Pro de cientos de miles de millones de parámetros). Requieren un ajuste del *Grid Prompting* mucho más estructurado.
