# Auditoría y Clasificación Asistida por Visión Multimodal (LLM)

Este documento explora la integración de modelos de lenguaje multimodales (como Gemini) en el pipeline de segmentación de imágenes satelitales (Sentinel-2). El objetivo es utilizar la capacidad de razonamiento visual de la IA para auditar las clasificaciones de la red neuronal (U-Net) o las máscaras SCL originales.

## 1. El Concepto: "Early Visual Fusion"
Dado que los modelos multimodales conversacionales están optimizados para formatos de imagen estándar (PNG, JPG) y resoluciones moderadas, no pueden ingerir un GeoTIFF gigante (5490x5490) multicapa de forma nativa. 

La solución técnica adoptada es el **Early Visual Fusion** (Fusión Visual Temprana):
1. Se extraen recortes (tiles) manejables (ej. 512x512 píxeles) de la imagen completa.
2. Se fusionan visualmente las tres fuentes de información en una sola imagen apaisada:
   - **Panel 1:** Banda visible (Color Real).
   - **Panel 2:** Banda infrarroja/SWIR (Falso Color Nieve).
   - **Panel 3:** La Máscara SCL o Predicción (Colores lógicos).
3. La IA multimodal procesa esta tira visual, permitiendo triangular la información (ej: cruzar un "agujero" en la máscara con la firma térmica y visual de la nieve en los otros paneles).

## 2. Capacidades de la IA Multimodal (El "Auditor")
La IA actúa como un experto humano mirando la pantalla:
- **Detección de incongruencias:** Es capaz de detectar si una nube muy densa ha sido clasificada erróneamente como vegetación (verde).
- **Asignación Lógica (Nodata):** Ante un píxel sin datos (Clase 0), la IA cruza el contexto visual para inferir qué debería ser. Basado en la leyenda del proyecto:
  - Blanco brillante en Falso Color + Real Color = **Nieve (Clase 3)**.
  - Sombra en ladera de montaña sin nube = **Sombra Topográfica / Suelo (Clase 4)**. (Crucial: no confundir con sombra de nube, Clase 2).

## 3. El Cuello de Botella del Píxel (La Barrera de la Precisión)
Es fundamental entender la diferencia entre un LLM y una red de segmentación:
- **El LLM (Auditor Cualitativo):** Produce **texto**. Entiende la imagen y puede decir: *"Hay un error en la nube del cuadrante noreste"*. Pero no puede devolver un array de 512x512 píxeles matemáticamente editados para arreglar los bordes fractales de la nube.
- **La U-Net (Editor Cuantitativo):** Produce **geometría**. Predice matemáticamente la clase exacta de cada píxel a nivel de matriz numérica.

Intentar que un LLM "pinte" píxeles directamente choca contra los límites de sus outputs (alucinaciones de tokens y desbordamiento de contexto).

## 4. Aplicación Práctica al Proyecto: Flujo de "Active Learning"
Para integrar esto en el Trabajo de Final de Grado sin romper la arquitectura, proponemos un ciclo de **Active Learning Guiado**:

1. **Predicción Base:** La U-Net (o el algoritmo SCL original) genera la máscara de un gránulo.
2. **Troceado (Tiling):** Un script corta la imagen en una cuadrícula completa (ej. 121 baldosas de 512x512).
3. **Auditoría IA:** El modelo multimodal evalúa las 121 baldosas generando un registro (archivo `.csv`) que indica el veredicto: `TIENE_ERRORES` o `CORRECTO`.
4. **Cirugía Humana Dirigida:** El operario humano (GIMP Bridge) **solo** necesita abrir las baldosas específicas marcadas con error por la IA, ahorrando horas de escaneo visual inútil.
5. **Reentrenamiento:** Se corrige el parche, se recompone el mosaico, y la U-Net se entrena de nuevo con este *Ground Truth* de alta fidelidad, iterando hacia un modelo más robusto.

## 5. Extensión a Series Temporales (Temporal Visual Fusion)
El análisis satelital Sentinel-2 es inherentemente temporal (mismo cuadrante, distintas fechas). Esta capacidad de la IA multimodal puede evolucionar de una simple "fusión de bandas espaciales" a una **Fusión Temporal**:

- **Resolución de Ambigüedades Nieve/Nube:** Una mancha blanca en una sola imagen puede generar dudas. Sin embargo, si la IA audita una tira temporal compuesta por `[T-1 (hace 5 días) | T0 (hoy) | T+1 (en 5 días)]`, el razonamiento es trivial para el modelo: si la mancha persiste inmóvil a lo largo del tiempo, es Nieve o un Glaciar. Si es efímera, es una Nube.
- **Auditoría de Consistencia Topográfica:** La IA puede detectar si una ladera (Clase 4) ha sido catalogada erróneamente como Sombra de Nube (Clase 2) al comparar fechas. Si en imágenes de días despejados anteriores la misma ladera sigue siendo oscura, la IA deduce lógicamente que es una sombra topográfica permanente y no un efecto meteorológico pasajero.
- **Implementación en el Pipeline:** En lugar de empaquetar 3 capas del mismo día, el script de recorte (Tiling) podría generar un mosaico visual que contraste el parche del día problemático con el mismo parche de la observación Sentinel-2 inmediatamente anterior, otorgándole a la IA un contexto de 4D (Espacio + Tiempo + Espectro) para emitir su veredicto en el CSV.
