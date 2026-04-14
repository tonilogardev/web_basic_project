# Format Transformation Engine

## Index

1. [Architecture](#1-architecture)
2. [Process Vectors (GeoJSON)](#2-process-vectors-geojson)
3. [Process Vectors (Shapefile)](#3-process-vectors-shapefile)
4. [Process Rasters (GeoTIFF)](#4-process-rasters-geotiff)
5. [Output Destination](#5-output-destination)

---

## 1 Architecture

- ***Instruction***: Containerized pipeline utilizing Felt's Tippecanoe and OSGeo's GDAL 3.8 to isolate geospatial processing dependencies from the host system.
- ***File References***:
    - Module Root: [007_format_transformation/](../007_format_transformation/)
    - Orchestrator: [docker-compose.yml](../007_format_transformation/docker-compose.yml)

[←Index](#index)

## 2 Process Vectors (GeoJSON)

- ***Instruction***: Ingest `.geojson` files from the `input/` directory and perform topological vector pyramid compression using Tippecanoe.
- ***Script Launch***: Run `./scripts/vector_geojson_2_pmtiles.sh` directly from terminal.
- ***File References***:
    - Script: [vector_geojson_2_pmtiles.sh](../007_format_transformation/scripts/vector_geojson_2_pmtiles.sh)
    - Drop zone: [input/](../007_format_transformation/input/)

[←Index](#index)

## 3 Process Vectors (Shapefile)

- ***Instruction***: Ingest `.shp` files from the `input/` directory (along with their `.shx`, `.prj`, `.dbf` sidecars). Translates geometries via GDAL to temporal GeoJSON and compresses to PMTiles via Tippecanoe.
- ***Script Launch***: Run `./scripts/vector_shp_2_pmtiles.sh` directly from terminal.
- ***File References***:
    - Script: [vector_shp_2_pmtiles.sh](../007_format_transformation/scripts/vector_shp_2_pmtiles.sh)
    - Drop zone: [input/](../007_format_transformation/input/)

[←Index](#index)

## 4 Process Rasters (GeoTIFF)

- ***Instruction***: Ingest `.tif` or `.vrt` files from the `input/` directory and perform chunked raster pyramid compression using GDAL native translation.
- ***Script Launch***: Run `./scripts/raster2pmtiles.sh` directly from terminal.
- ***File References***:
    - Script: [raster2pmtiles.sh](../007_format_transformation/scripts/raster2pmtiles.sh)
    - Drop zone: [input/](../007_format_transformation/input/)

[←Index](#index)

## 5 Output Destination

- ***Instruction***: Extract the compiled and highly optimized `.pmtiles` files to feed directly into the server's public endpoints.
- ***File References***:
    - Storage location: [output/](../007_format_transformation/output/)
    - Move to public CDN folder: [Cassini public/data](../006_cassini_hackathons/public/data/)

[←Index](#index)
