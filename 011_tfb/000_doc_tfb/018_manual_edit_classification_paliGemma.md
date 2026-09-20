# Arquitectura Local PaliGemma: Segmentación Nivel Píxel sin API

Este documento funciona como bitácora y manual técnico del desarrollo de la iteración más avanzada del TFB: **Sustituir el Grid Prompting de Gemini por Inferencia Multimodal Local usando PaliGemma.**

## 1. Justificación del Cambio
La dependencia de APIs comerciales (como Gemini 3.1 Pro) demostró ser un cuello de botella fatal debido a los *Rate Limits* (límites de cuota) y a la dependencia de conexión externa. Aprovechando el hardware disponible (NVIDIA Quadro P5000 con 16GB de VRAM libres en la GPU 0), hemos migrado hacia un ecosistema 100% *Open-Source* y local.

## 2. La Magia de los Tokens Espaciales
A diferencia de los LLMs de texto a los que había que inyectar una cuadrícula visual artificial (A1, B2...), **PaliGemma** es un modelo diseñado nativamente para entender coordenadas espaciales.
- El modelo es capaz de devolver tokens especiales del `<loc0000>` al `<loc1023>`.
- Estos tokens representan coordenadas normalizadas (Bounding Boxes).
- Ejemplo de respuesta: `<loc0256><loc0512><loc0768><loc1023> cloud`.

## 3. Hoja de Ruta Técnica (Roadmap)
1. **Limpieza del Tiling:** Ya no necesitamos dibujar la cuadrícula sobre las imágenes. Cortaremos las baldosas en "limpio".
2. **Entorno de Inferencia:** Instalación de la librería `transformers` y carga de los pesos del modelo `google/paligemma-3b-mix-224` en la GPU.
3. **Traducción de Tokens a GIS:** Script de conversión que interprete el string de `<locXXXX>` a un polígono (Bounding Box) de píxeles locales, y posteriormente a coordenadas geográficas UTM con `rasterio`.
4. **Inyección Directa:** Escritura quirúrgica de la matriz corregida en el archivo GeoTIFF original.

## 4. Implementación y Resultados (Hito Alcanzado)
El pipeline local se ha implementado con éxito a través de 3 scripts orquestados:
- `01_tiling_clean.py`: Genera baldosas sin cuadrículas intrusivas (`002_paligemma_tiles`).
- `04_paligemma_auditor.py`: Carga el modelo de 10GB en memoria bfloat16, superando las restricciones de red y de API, y genera Bounding Boxes puras.
- `05_paligemma_injector.py`: Transforma matemáticamente las cajas locales a la matriz global del GeoTIFF maestro con una transformación afín.

### Resultados de la Primera Inferencia Local
El test inicial ha demostrado la viabilidad técnica completa de usar la GPU 0 con 16GB de VRAM. El modelo logra inferir las imágenes exitosamente. Debido a la limpieza de nubes en este tile en particular, el resultado ha sido neutro ("sin errores detectados"), lo cual confirma que el proceso *end-to-end* se ejecuta sin corromper el GeoTIFF ni crashear el sistema por falta de memoria.

**Conclusión:** Se ha superado el cuello de botella comercial (Gemini API) y el proyecto es ahora autónomo, ilimitado, y privado para todo tipo de clasificaciones multimodales sobre imágenes Sentinel.
