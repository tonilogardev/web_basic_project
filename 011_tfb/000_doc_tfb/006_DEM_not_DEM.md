# Justificación Arquitectónica: Descarte del DEM (Modelo Digital de Elevaciones)

Durante las fases preliminares relativas a la arquitectura de ingesta de datos del proyecto, se contempló la inyección paramétrica de un Modelo Digital de Elevaciones (DEM) como variable tensorial adicional a la red neuronal convolucional (U-Net). El propósito teórico residía en dotar a la arquitectura de contexto orográfico, bajo el axioma de correlación entre altimetría y precipitación nival, facilitando la segregación entre superficies nivales (cotas superiores) y formaciones nubosas bajas.

No obstante, en base a una revisión exhaustiva del estado del arte, sumada a consideraciones operativas dentro del alcance de un Trabajo de Fin de Grado (TFB), se adopta la decisión arquitectónica de **descartar la integración del DEM**, delegando la clasificación semántica nube/nieve de forma exclusiva a las firmas espectrales derivadas de la captación radiométrica de las bandas L1C.

## 1. La Resolución Analítica de la Física Espectral (Espectro SWIR)

La inyección de información altimétrica se ampara en una estimación probabilística (altitud = probabilidad nival). A nivel físico, esta dependencia queda resuelta mediante el análisis del rango de radiación Infrarroja de Onda Corta (**SWIR: Bandas B11 y B12**) captado por los sensores del Sentinel-2, obedeciendo a leyes termodinámicas y ópticas deterministas:
*   **Las formaciones atmosféricas (Nubes)** exhiben una alta reflectancia frente a la radiación incidente SWIR.
*   **Las superficies nivales**, compuestas mayoritariamente por fases cristalinas de hielo y agua intersticial, inducen procesos de absorción casi totales frente a la radiación SWIR, registrando una señal radiométrica residual (pixeles oscuros).

En consecuencia, el algoritmo neuronal dispone de una variable predictora puramente matemática (radiométrica) para establecer umbrales de separación entre nieve y nubes sin incurrir en inferencias basadas en altimetría estática.

### Evidencia Bibliográfica y Algorítmica

El descarte metodológico de información topográfica queda sustentado por los algoritmos estandarizados en la disciplina de teledetección óptica:

*   **Zhu & Woodcock (2012) - Fmask:** El algoritmo referencial de enmascaramiento de nubes a nivel global funda su discriminación en el umbral paramétrico del índice *Normalized Difference Snow Index* (NDSI). Este índice calcula proporciones basales entre la reflectancia verde y SWIR, absteniéndose de utilizar modelos de elevación auxiliar. [Enlace al estudio (ScienceDirect)](https://doi.org/10.1016/j.rse.2011.10.028)
*   **Zupanc (2017) - s2cloudless:** El motor de aprendizaje automático integrado por la Agencia Espacial Europea en su ecosistema *Copernicus Browser* (desarrollado por la organización Synergize), emplea estrictamente vectores de 10 bandas espectrales procedentes del Sentinel-2. Esta arquitectura asimila resultados asimilables al estado del arte prescindiendo en su totalidad de la inyección de canales altimétricos. [Enlace a la publicación técnica (Sentinel Hub)](https://medium.com/sentinel-hub/improving-cloud-detection-with-machine-learning-c09dc5d7cf13) | [Repositorio GitHub](https://github.com/sentinel-hub/sentinel2-cloud-detector)

## 2. Complejidad y Sobrecarga de Ingeniería de Datos (Data Engineering)

La incorporación metodológica de una capa DEM añade una componente exponencial de complejidad técnica al flujo de *MLOps*, injustificada por el retorno inferencial paramétrico marginal esperado:
*   Incurre en dependencias externas para la adquisición automatizada de archivos matriciales altimétricos masivos (e.g., *Institut Cartogràfic i Geològic de Catalunya [ICGC], 2026*).
*   Demanda algoritmos dinámicos de reproyección, transmutando el formato esférico puro hacia el sistema cartográfico local UTM exigido por cada malla de la constelación Sentinel-2.
*   Conlleva la aplicación de técnicas de interpolación y remuestreo (*resampling*), necesarias para forzar el co-registro espacial de los bloques altimétricos (típicamente de 30m) a las resoluciones rígidas de captura espectral L1C (10m/20m).

**Conclusión Final:**
Se descarta la integración del DEM debido a su ineficiencia operativa y baja aportación teórica neta. El sistema arquitectónico se anclará exclusivamente a los tensores radiométricos nativos (Visible + NIR + SWIR), manteniendo coherencia con las arquitecturas de segmentación vigentes de la industria (s2cloudless). Esta decisión canaliza y optimiza los recursos temporales hacia procesos empíricos determinantes: diseño matricial convolucional y re-etiquetado riguroso del *Ground Truth*.
