# Arquitectura Local PaliGemma: Segmentación Nivel Píxel sin API

Este documento formaliza la iteración arquitectónica más avanzada del proyecto: la sustitución técnica del método de Grid Prompting (basado en Gemini) por inferencia multimodal *on-premise* mediante la arquitectura PaliGemma.

## 1. Justificación del Cambio
La dependencia de APIs comerciales demostró constituir un cuello de botella logístico debido a los límites de cuota (Rate Limits) y a la latencia de la conexión externa. En base a los recursos computacionales disponibles (arquitectura de GPU NVIDIA Quadro P5000 con 16GB VRAM), se ha consolidado la migración integral hacia un ecosistema *on-premise* de código abierto.

## 2. La Codificación Topológica mediante Tokens Espaciales
A diferencia de los LLMs lingüísticos, que requieren inyección heurística de cuadrículas topológicas visuales (A1, B2...), **PaliGemma** procesa nativamente coordenadas espaciales continuas.
- El modelo es capaz de devolver tokens especiales del `<loc0000>` al `<loc1023>`.
- Estos tokens representan coordenadas normalizadas (Bounding Boxes).
- Ejemplo de respuesta: `<loc0256><loc0512><loc0768><loc1023> cloud`.

## 3. Hoja de Ruta Técnica (Roadmap)
1. **Limpieza del Tiling:** Se suprime la superposición artificial de cuadrículas. Las subdivisiones matriciales (tiling) se procesan sin perturbación visual.
2. **Entorno de Inferencia:** Instalación de la librería `transformers` y carga de los pesos del modelo `google/paligemma-3b-mix-224` en la GPU.
3. **Traducción de Tokens a GIS:** Script de conversión que interprete el string de `<locXXXX>` a un polígono (Bounding Box) de píxeles locales, y posteriormente a coordenadas geográficas UTM con `rasterio`.
4. **Inyección Directa:** Escritura quirúrgica de la matriz corregida en el archivo GeoTIFF original.

## 4. Implementación y Resultados (Hito Alcanzado)
El pipeline local se ha implementado con éxito a través de 3 scripts orquestados:
- `01_tiling_clean.py`: Genera baldosas sin cuadrículas intrusivas (`002_paligemma_tiles`).
- `04_paligemma_auditor.py`: Carga el modelo de 10GB en memoria bfloat16, superando las restricciones de red y de API, y genera Bounding Boxes puras.
- `05_paligemma_injector.py`: Transforma matemáticamente las cajas locales a la matriz global del GeoTIFF maestro con una transformación afín.

### Resultados de la Primera Inferencia Local
La primera inferencia corrobora la viabilidad técnica de un despliegue sobre infraestructuras locales con 16GB de VRAM. La ejecución se completó sin anomalías. Dado el bajo grado de nubosidad en la muestra evaluada, el resultado predictivo fue neutro ("sin desviaciones topológicas"), confirmando el procesamiento algorítmico *end-to-end* sin corrupción geométrica de la fuente (GeoTIFF) ni degradación u *overflow* de la memoria subyacente.

**Conclusión:** La superación de restricciones operativas inherentes a infraestructuras comerciales en la nube ha derivado en la consolidación de un pipeline de segmentación completamente soberano, escalable y con privacidad sistémica para operaciones multimodales sobre adquisiciones satelitales Sentinel.
