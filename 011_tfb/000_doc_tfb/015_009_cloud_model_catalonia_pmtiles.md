# Pipeline Serverless (009_cloud_model_catalonia_pmtiles)

## Index

1. [Orquestación Serverless](#1-orquestación-serverless)
2. [Extracción Quirúrgica](#2-extracción-quirúrgica)
3. [Inferencia y PMTiles (Vector/Raster)](#3-inferencia-y-pmtiles-vectorraster)
4. [Next steps](#4-next-steps)

---

## 1 Orquestación Serverless

- ***Descripción***: Orquesta el ciclo completo limitando el uso de disco a 0 bytes mediante recolección de basura automática de los gigabytes descargados.
- ***Instrucción***: Ejecutar script pasando el rango de fechas.
- ***File References***:
    - Revisar código en [../scripts/009_cloud_model_catalonia_pmtiles.py](../scripts/009_cloud_model_catalonia_pmtiles.py)
    - Ver modelo IA en [../checkpoints/baseline_model.pth](../checkpoints/baseline_model.pth)

[←Index](#index)

## 2 Extracción Quirúrgica

- ***Descripción***: Consulta OData y extrae selectivamente del ZIP en remoto (o efímero) solo los `.jp2` vitales (Bandas ópticas y SCL).
- ***Instrucción***: Asegurar credenciales activas.
- ***File References***:
    - Credenciales en [../../.env.production](../../.env.production)

[←Index](#index)

## 3 Inferencia y PMTiles (Vector/Raster)

- ***Descripción***: Ejecuta la Red Neuronal U-Net mediante *patching* (512x512). Transforma Cloud Masks en polígonos GeoJSON, que se empaquetan a MVT con `tippecanoe`.
- ***Instrucción***: Convertir salida SQLite a PMTiles nativo usando el conversor oficial.
- ***File References***:
    - Binario PMTiles [../scripts/pmtiles](../scripts/pmtiles)
    - Carpeta resultante [../visualizations/SCL_UNET_catalonia/](../visualizations/SCL_UNET_catalonia/)

[←Index](#index)

## 4 Next steps

- [016_subir_imagenes.md](./016_subir_imagenes.md)
