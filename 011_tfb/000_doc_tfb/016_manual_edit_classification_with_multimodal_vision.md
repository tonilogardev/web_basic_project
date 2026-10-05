# Auditoría y Clasificación Asistida por Visión Multimodal (LLM)

Este documento explora la integración de modelos de lenguaje multimodales (como Gemini) en el pipeline de segmentación de imágenes satelitales (Sentinel-2). El objetivo es utilizar la capacidad de razonamiento visual de la IA para auditar las clasificaciones de la red neuronal (U-Net) o las máscaras SCL originales.

## 1. El Concepto: "Early Visual Fusion"
Dado que los modelos multimodales conversacionales están optimizados para formatos de imagen estándar (PNG, JPG) y resoluciones moderadas, carecen de la capacidad nativa para ingerir tensores GeoTIFF de alta resolución y naturaleza multicapa.

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

## 3. El Cuello de Botella Geométrico (La Barrera de la Precisión)
Es imperativo diferenciar la naturaleza computacional de un LLM multimodal frente a una red convolucional de segmentación semántica:
- **El Modelo de Lenguaje (Auditor Cualitativo):** Produce un output textual. Analiza semánticamente la imagen para inferir incongruencias lógicas, pero es incapaz de retornar una matriz espacial de 512x512 píxeles con la corrección matemática implementada.
- **La Arquitectura Convolucional (Editor Cuantitativo):** Produce un output topológico y geométrico, generando predicciones matemáticas para la totalidad del tensor matricial evaluado.

La generación directa de geometrías espaciales a nivel de píxel excede los límites arquitectónicos de los LLMs (alucinaciones estocásticas y desbordamientos de la ventana de contexto).

## 4. Aplicación Práctica al Proyecto: Flujo de "Active Learning"
Para la integración metodológica de esta arquitectura multimodal sin alterar la cadena de valor, se estipula un ciclo algorítmico de **Aprendizaje Activo Guiado (Active Learning)**:

1. **Predicción Base:** La U-Net (o el algoritmo SCL original) genera la máscara de un gránulo.
2. **Troceado (Tiling):** Un script corta la imagen en una cuadrícula completa (ej. 121 baldosas de 512x512).
3. **Auditoría IA:** El modelo multimodal evalúa las 121 baldosas generando un registro (archivo `.csv`) que indica el veredicto: `TIENE_ERRORES` o `CORRECTO`.
4. **Cirugía Humana Dirigida:** El operador humano (a través de GIMP Bridge) interviene exclusivamente sobre las baldosas específicas parametrizadas con error por el LLM, optimizando severamente el proceso de depuración del dataset.
5. **Reentrenamiento Estratégico:** Tras la corrección de las anomalías focales, el tensor se re-integra al *Ground Truth*, promoviendo sucesivas etapas de entrenamiento para converger hacia un modelo más resiliente.

## 5. Extensión a Series Temporales (Temporal Visual Fusion)
El análisis satelital Sentinel-2 es inherentemente temporal (mismo cuadrante, distintas fechas). Esta capacidad de la IA multimodal puede evolucionar de una simple "fusión de bandas espaciales" a una **Fusión Temporal**:

- **Resolución de Ambigüedades Nieve/Nube:** Una mancha blanca en una sola imagen puede generar dudas. Sin embargo, si la IA audita una tira temporal compuesta por `[T-1 (hace 5 días) | T0 (hoy) | T+1 (en 5 días)]`, el razonamiento es trivial para el modelo: si la mancha persiste inmóvil a lo largo del tiempo, es Nieve o un Glaciar. Si es efímera, es una Nube.
- **Auditoría de Consistencia Topográfica:** La IA puede detectar si una ladera (Clase 4) ha sido catalogada erróneamente como Sombra de Nube (Clase 2) al comparar fechas. Si en imágenes de días despejados anteriores la misma ladera sigue siendo oscura, la IA deduce lógicamente que es una sombra topográfica permanente y no un efecto meteorológico pasajero.
- **Implementación en el Pipeline:** En lugar de empaquetar 3 capas del mismo día, el script de recorte (Tiling) podría generar un mosaico visual que contraste el parche del día problemático con el mismo parche de la observación Sentinel-2 inmediatamente anterior, otorgándole a la IA un contexto de 4D (Espacio + Tiempo + Espectro) para emitir su veredicto en el CSV.

## 6. Estado del Arte: La Vanguardia en VLMs Geoespaciales
La intuición de combinar el razonamiento lingüístico con datos satelitales se alinea directamente con las líneas de investigación más punteras de la IA actual (2025-2026). Mientras que los LLMs genéricos como Gemini permiten auditar píxeles mediante "Early Visual Fusion", la industria está desarrollando *Vision-Language Models (VLMs)* nativos para este dominio:

- **GeoChat:** El primer modelo fundacional "Vision-Language" especializado en teledetección. Entrenado con cientos de miles de imágenes de satélite emparejadas con instrucciones textuales, está diseñado específicamente para razonar sobre imágenes cenitales y no sobre fotografías estándar.
- **GeoVLM (Esri):** Un avance que integra el razonamiento textual con la generación real de coordenadas y máscaras a nivel de píxel, cerrando la brecha entre "decir dónde está el error" y "dibujar el error matemáticamente".
- **EarthDial:** Un modelo masivo diseñado para procesar datos satelitales en 4D, infiriendo información no solo del espectro óptico (RGB), sino del infrarrojo, radar y sobre todo, series temporales.

## 7. Reflexión Estratégica: Arquitectura de Procesamiento Óptima
Ante este avance tecnológico, se concluye que intentar entrenar un modelo fundacional multimodal gigante desde cero excede los requerimientos arquitectónicos y computacionales racionales para este caso de estudio.

La **Hoja de Ruta (Roadmap)** tecnológica establece la adopción de una arquitectura **Híbrida y Desacoplada**:
1. **Subsistema Cuantitativo (U-Net):** Mantenimiento de la arquitectura convolucional por su alta eficiencia topológica, bajo coste inferencial en entornos Serverless y precisión geométrica (operaciones matriciales densas).
2. **Subsistema Cualitativo (LLM Multimodal Genérico):** Integración de inferencia LLM mediante orquestadores lógicos (`multimodal_auditor.py`) que actúan exclusivamente como validadores booleanos de control de calidad, impulsando el flujo de *Active Learning*.

**Conclusión:** Se descarta el uso de VLMs masivos en favor de una orquestación distribuida, donde la inferencia semántica del LLM focaliza la acción del auditor humano sobre la Verdad Terreno, permitiendo que arquitecturas matriciales de menor carga computacional (U-Net) superen estadísticamente a sistemas estáticos industriales (Sen2Cor) a través de datasets curados y optimizados.
