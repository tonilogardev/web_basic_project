# Justificación Arquitectónica: Descarte del DEM (Modelo Digital de Elevaciones)

Durante las fases preliminares de la arquitectura técnica del proyecto, se contempló la posibilidad de incluir un Modelo Digital de Elevaciones (DEM) como canal de entrada adicional a la red neuronal convolucional (U-Net). El propósito inicial era proporcionar a la red un contexto topográfico que le ayudara a discriminar entre nieve (típicamente a altas cotas) y nubes.

Sin embargo, tras una revisión rigurosa del estado del arte y un análisis coste-beneficio en el marco de un Trabajo de Fin de Grado (TFB), se ha tomado la decisión arquitectónica de **desechar el uso del DEM**, confiando la discriminación nube-nieve única y exclusivamente a la firma espectral de las bandas físicas.

## 1. La Física Espectral es suficiente (El poder del SWIR)
La inclusión de un DEM parte de una premisa topográfica (altitud = nieve). Sin embargo, las bandas infrarrojas de onda corta (**SWIR: B11 y B12**) del satélite Sentinel-2 resuelven este problema mediante las leyes de la termodinámica y la óptica:
*   **Las nubes** reflejan fuertemente la radiación SWIR.
*   **La nieve**, al estar compuesta por cristales de hielo y agua, absorbe masivamente la radiación SWIR, mostrándose muy oscura en estas bandas.

La red neuronal tiene, por tanto, información matemática robusta y directa para separar nieve de nube sin necesidad de recurrir a metadatos de altitud.

### Evidencia Bibliográfica
El descarte del DEM está respaldado por los estudios y algoritmos más consolidados en teledetección:

*   **Zhu & Woodcock (2012) - Fmask:** El algoritmo histórico por excelencia para enmascarado de nubes (Fmask) basa su separación nube-nieve en el cálculo del índice NDSI (*Normalized Difference Snow Index*) usando bandas del verde y del SWIR, prescindiendo totalmente de modelos topográficos. [Enlace al estudio (ScienceDirect)](https://doi.org/10.1016/j.rse.2011.10.028)
*   **Zupanc (2017) - s2cloudless:** El algoritmo de Machine Learning oficial utilizado por la Agencia Espacial Europea en su *Copernicus Browser* (s2cloudless, desarrollado por Synergize) se alimenta exclusiva y estrictamente de 10 bandas espectrales de Sentinel-2. Logra resultados del estado del arte sin inyectar ninguna capa de elevación. [Enlace a la publicación técnica (Sentinel Hub)](https://medium.com/sentinel-hub/improving-cloud-detection-with-machine-learning-c09dc5d7cf13) | [Repositorio GitHub](https://github.com/sentinel-hub/sentinel2-cloud-detector)

## 2. Complejidad de Ingeniería de Datos (Data Engineering)
En el contexto de un TFB, incorporar el DEM introduce una complejidad técnica desproporcionada que no garantiza un retorno equivalente en la métrica final de precisión:
*   Requiere la descarga independiente de mallas DEM altimétricas (e.g., *Institut Cartogràfic i Geològic de Catalunya [ICGC], 2026*).
*   Exige reproyectar las mallas desde coordenadas geográficas puras al sistema cartográfico UTM específico de cada gránulo de Sentinel-2.
*   Precisa un remuestreo espacial avanzado para coregistrar los píxeles de 30m del DEM a la cuadrícula estricta de 10m/20m de las bandas L1C.

**Conclusión Final:**
Se descarta el uso del DEM por no ser lógico ni conveniente. El modelo se basará en las bandas espectrales nativas (Visible + NIR + SWIR), alineándose con los estándares de la industria (s2cloudless) y asegurando que el esfuerzo de investigación se destine a la curación del *Ground Truth* y al diseño de la red neuronal, evitando una sobrecarga innecesaria y peligrosa en el preprocesamiento de datos.
