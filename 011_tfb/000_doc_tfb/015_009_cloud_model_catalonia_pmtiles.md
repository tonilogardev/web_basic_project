# Pipeline Serverless (009_cloud_model_catalonia_pmtiles)

## Index

1. [Orquestación Serverless](#1-orquestación-serverless)
2. [Extracción Quirúrgica](#2-extracción-quirúrgica)
3. [Inferencia y PMTiles (Vector/Raster)](#3-inferencia-y-pmtiles-vectorraster)
4. [Next steps](#4-next-steps)

---

## 1 Orquestación Serverless

- ***Descripción***: Se orquesta el ciclo operativo completo, restringiendo el uso de almacenamiento local mediante rutinas automáticas de recolección de basura (garbage collection) aplicadas a los volúmenes descargados.
- ***Instrucción***: Ejecución paramétrica del script definiendo el rango temporal.
- ***File References***:
    - Revisar código en [../scripts/009_cloud_model_catalonia_pmtiles.py](../scripts/009_cloud_model_catalonia_pmtiles.py)
    - Ver modelo IA en [../checkpoints/baseline_model.pth](../checkpoints/baseline_model.pth)

[←Index](#index)

## 2 Extracción Quirúrgica

- ***Descripción***: Se efectúan consultas a la API OData para extraer selectivamente, desde los empaquetados ZIP remotos, los archivos `.jp2` vitales (Bandas ópticas y SCL).
- ***Instrucción***: Verificación de disponibilidad de credenciales activas.
- ***File References***:
    - Credenciales en [../../.env.production](../../.env.production)

[←Index](#index)

## 3 Inferencia y PMTiles (Vector/Raster)

- ***Descripción***: Ejecución de inferencia de la Red Neuronal U-Net mediante procesamiento por ventanas espaciales (512x512). Se transforman las predicciones ráster en polígonos GeoJSON y se empaquetan en mosaicos vectoriales (MVT) mediante `tippecanoe`.
- ***Instrucción***: Conversión de la base de datos SQLite resultante al formato cloud-native PMTiles mediante el binario oficial.
- ***File References***:
    - Binario PMTiles [../scripts/pmtiles](../scripts/pmtiles)
    - Carpeta resultante [../visualizations/SCL_UNET_catalonia/](../visualizations/SCL_UNET_catalonia/)

[←Index](#index)

## 4 Next steps

- [016_subir_imagenes.md](./016_subir_imagenes.md)
