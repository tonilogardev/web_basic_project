# Sentinel Viewer

## Index

1. [Architecture Overview](#1-architecture-overview)
2. [Frontend Configuration](#2-frontend-configuration)
3. [Water Quality API](#3-water-quality-api)
4. [Image Deletion Logic](#4-image-deletion-logic)
5. [Next steps](#5-next-steps)

---

## 1 Architecture Overview

- **Frontend**: Svelte 5 Single Page Application.
- **Map Engine**: MapLibre GL JS.
- **Tile Server**: Titiler (Dockerized) for dynamic STAC rendering.
- **Backend**: Python FastAPI for heavy raster calculations (Water Quality).
- ***File References***:
  - Viewer Source: [005_sentinel_viewer/](../005_sentinel_viewer/)
  - API Source: [008_water_quality_api/](../008_water_quality_api/)

[←Index](#index)

## 2 Frontend Configuration

- **Global State**: Managed entirely by Svelte 5 runes.
- **Map Logic**: Decoupled from the UI.
- ***File References***:
  - Edit state in [store.svelte.ts](../005_sentinel_viewer/src/lib/store.svelte.ts).
  - Edit map interactions in [MapManager.ts](../005_sentinel_viewer/src/lib/MapManager.ts).
  - Edit Titiler requests in [titilerApi.ts](../005_sentinel_viewer/src/lib/titilerApi.ts).

[←Index](#index)

## 3 Water Quality API

- **Purpose**: Calculates advanced indices (NDCI, FAI, NDTI) reading COGs dynamically from AWS.
- **Integration**: Traefik exposes the API at `water-api.localhost`.
- **Output**: Generates `.tif` files in a public folder, returned to Titiler for rendering.
- ***File References***:
  - Edit API endpoints in [main.py](../008_water_quality_api/main.py).
  - Edit mathematical logic in [processor.py](../008_water_quality_api/processor.py).
  - Edit Docker setup in [docker-compose.yml](../docker-compose.yml).

[←Index](#index)

## 4 Image Deletion Logic

- **Problem**: Generating TIF files on-demand risks filling the server's hard drive.
- **Solution**: Time-based Garbage Collector running as a background task.
- **How it works**: Every time a user requests an analysis, a parallel background thread deletes any `.tif` file older than **1 hour**.
- **Benefits**: Protects against orphaned files (closed browser tabs) and prevents race conditions between concurrent users.
- ***File References***:
  - Edit cleanup thresholds in `cleanup_old_files` function in [main.py](../008_water_quality_api/main.py).

[←Index](#index)

## 5 Next steps

- [Back to Main README](../README.md)
