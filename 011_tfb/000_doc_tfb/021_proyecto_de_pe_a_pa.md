# Resumen Arquitectónico del Trabajo Final de Bachelor

El presente documento recopila de forma estructurada la metodología, las decisiones de diseño arquitectónico y las fases de desarrollo del Trabajo Final de Bachelor. Constituye una guía técnica integral para la comprensión del pipeline geoespacial implementado.

---

## 1. Contexto y Problemática
El algoritmo Sen2Cor, empleado por la Agencia Espacial Europea (ESA) para la clasificación de cobertura terrestre en imágenes Sentinel-2, presenta deficiencias significativas en geografías complejas como Cataluña. Los errores sistemáticos observados incluyen:
- Confusión espectral entre nieve y nubes en áreas montañosas (e.g., Pirineos).
- Falsos positivos de nubes sobre masas de agua con alta reflectancia (e.g., Delta del Ebro).
- Errores de clasificación entre sombras orográficas y sombras proyectadas por nubes.

La persistencia de estos errores compromete la fiabilidad de los análisis medioambientales y agrícolas derivados de estos datos.

## 2. Objetivo Principal
El objetivo central del proyecto no se limita a la detección de nubes, sino a la construcción de una **Arquitectura (Pipeline) Geoespacial Modular y Escalable**. Se ha desarrollado un flujo de datos completo ("End-to-End"), abarcando desde la ingesta de datos satelitales en bruto hasta el despliegue de las predicciones en una aplicación web interactiva. La corrección de los sesgos de Sen2Cor en Cataluña sirve como caso de uso para validar la robustez de esta arquitectura.

---

## 3. Fases del Pipeline de Procesamiento

### FASE 1: Ingesta de Datos y Preprocesamiento
La obtención de datos satelitales se ha automatizado mediante un módulo programático.
- **API OData (Copernicus Data Space Ecosystem):** Se implementó la integración con la API OData para la descarga automatizada de productos L1C (Top of Atmosphere).
- **Selección Espectral:** Se limitó la descarga a las bandas ópticas puras (B02, B03, B04) y a la banda infrarroja de onda corta (B11) necesarias para el entrenamiento.
- **Optimización de Almacenamiento:** Se emplearon archivos VRT (Virtual Raster Tables) para minimizar el consumo de disco y optimizar el rendimiento de entrada/salida (I/O).

### FASE 2: Generación de Verdad Terreno (ETL)
Dado que las redes neuronales requieren datos de entrenamiento de alta fiabilidad, se descartó el uso directo de las clasificaciones de Sen2Cor.
- **Reducción de Clases:** Se realizó un colapso de las 12 clases originales a **6 Clases Maestras** (vegetación, agua, nieve, nubes, suelo desnudo y sombras), optimizando así el enfoque de la red neuronal.
- **Corrección Manual (GIMP Bridge):** Se desarrolló un flujo ETL para convertir las matrices raster a formatos editables visualmente. Esto permitió la corrección manual de píxeles erróneos, generando una "Verdad Terreno" (Ground Truth) de alta calidad.

### FASE 3: Modelado de Deep Learning (U-Net)
Se descartó el uso de modelos preentrenados para evitar la herencia de sesgos algorítmicos, optando por el desarrollo nativo del modelo.
- **Arquitectura U-Net en PyTorch:** Se programó una red convolucional U-Net, idónea para tareas de segmentación semántica. Esta arquitectura consta de dos bloques principales:
  - **Encoder (Contracción):** Reduce dimensionalidad secuencialmente para extraer características espaciales y espectrales.
  - **Decoder (Expansión):** Reconstruye la resolución original para emitir clasificaciones a nivel de píxel.
  - **Skip Connections:** Conectan las capas del Encoder directamente con el Decoder, preservando la información espacial de alta frecuencia necesaria para una localización geográfica precisa.
- **Procesamiento por Tiling:** Debido a las limitaciones de memoria de la GPU (VRAM) frente al tamaño masivo de los rasters, se programó un sistema dinámico de partición de imágenes (parches de 512x512 píxeles) para el entrenamiento y la inferencia.
- **Índice NDSI:** Para mejorar la discriminación entre nieve y nubes, se inyectó una banda calculada correspondiente al Índice Diferencial Normalizado de Nieve (NDSI). Se priorizó este cálculo espectral frente al uso de un Modelo Digital de Elevaciones (DEM) por motivos de eficiencia computacional y agilidad en el entrenamiento inicial.
- **Métricas de Evaluación:** El modelo alcanzó una **precisión en clasificación de suelo del 95%** y un índice **IoU del 85% para la clase nieve**, cumpliendo matemáticamente con los requisitos del proyecto.

### FASE 4: Despliegue Web GIS
Para dotar de accesibilidad a los resultados generados, se implementó una arquitectura de distribución geoespacial ligera.
- **Formato PMTiles:** Las salidas raster (TIFF) se transformaron al formato Cloud-Native PMTiles.
- **Arquitectura Serverless y Docker:** La infraestructura se contenedorizó utilizando Svelte y MapLibre GL JS, eliminando la dependencia de servidores de mapas pesados (como GeoServer).
- **Interfaz de Usuario:** El visor web permite la superposición y comparación de capas predictivas de manera fluida y accesible desde cualquier navegador estándar.

---

## 4. Decisiones de Diseño y Adaptaciones (Pivotes)
El desarrollo requirió ajustes metodológicos para sortear problemas técnicos:
1. **Descarte de Transfer Learning:** Se priorizó el entrenamiento desde cero para asegurar la independencia frente a los sesgos de clasificación preexistentes.
2. **Aislamiento de la Clase "Agua":** Se introdujo una clase específica para el agua ante la recurrente confusión algorítmica causada por la reflectancia del mar y el Delta del Ebro.
3. **Migración de Interfaz de Descarga:** Se procedió al reemplazo de la API STAC por la API OData debido a problemas de estabilidad en el proveedor de datos.
4. **Exclusión del DEM:** Se prescindió temporalmente del uso del Modelo Digital de Elevaciones para priorizar la evaluación espectral y reducir la carga computacional en fase de entrenamiento.

---

## 5. Limitaciones Técnicas Identificadas
El análisis crítico del pipeline revela dos áreas principales de mejora:
1. **Confusión en Sombras Orográficas:** La exclusión del DEM (altimetría) priva a la red de contexto topográfico tridimensional. Consecuentemente, la clasificación depende exclusivamente de firmas espectrales, dificultando la discriminación geométrica entre sombras proyectadas por orografía y aquellas proyectadas por nubes.
2. **Escalabilidad de la Verdad Terreno:** La metodología de curación manual empleada garantiza una alta precisión local, pero resulta inviable económicamente para su escalabilidad a niveles continentales o globales.

---

## 6. Futuras Líneas de Desarrollo
Las limitaciones detectadas marcan la hoja de ruta para iteraciones posteriores:
- **Integración Altimétrica:** Inyección de tensores DEM para resolver ambigüedades geométricas y ortorrectificar falsos positivos en sombras.
- **Optimización de Backend:** Reescritura del motor de inferencia y procesamiento en lenguajes de alto rendimiento (Rust) para permitir despliegues en tiempo real.
- **Generación Sintética de Datos:** Exploración de modelos fundacionales (e.g., PaliGemma) y soluciones preentrenadas (e.g., CloudSen12) para la automatización de la curación de Verdad Terreno, reduciendo la dependencia del factor humano.

---

## 7. Viabilidad y Aplicación en la Industria
- **Cumplimiento y Filosofía Open Source:** La arquitectura está publicada bajo principios de ciencia abierta y replicabilidad, alineándose con los Objetivos de Desarrollo Sostenible (ODS) de la Agenda 2030 vinculados a innovación tecnológica e investigación climática.
- **Implementación Aeroespacial (Proyecto MENUT):** La modularidad del pipeline ha permitido su exportación directa a la industria. Actualmente, esta misma arquitectura se encuentra en fase de implementación para el procesamiento algorítmico de los datos del satélite MENUT, perteneciente a la Agencia Espacial Catalana.
