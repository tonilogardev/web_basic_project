# System Architecture

## Index

1. [Full-Stack Architectural Blueprint](#1-full-stack-architectural-blueprint)
2. [Frontend Component Hierarchy](#2-frontend-component-hierarchy)
3. [Controllers and Services Separation](#3-controllers-and-services-separation)
4. [Next steps](#4-next-steps)

---

## 1 Full-Stack Architectural Blueprint

- ***Architecture Pattern***: Decoupled client-side GIS SPA with a native high-throughput Rust geospatial computation microservice.
- ***Visuals***:
    ![Sentinel Viewer UI](./img/sentinel_viewer_ui.png)
- ***Frontend Container (`sentinel-viewer`)***:
    - Built via multi-stage Docker ([Dockerfile](../Dockerfile)) with Vite/Svelte 5.
    - Served over high-performance Alpine Nginx embedded in [Dockerfile](../Dockerfile).
- ***Reverse Proxy (`traefik`)***:
    - Routes incoming traffic at domain `sentinel.localhost` (or production subdomains) to the frontend container on port 80.
    - Routes `water-api.localhost` to the Rust microservice on port 8000.
- ***Geospatial Backend (`water-quality-api`)***:
    - Native Rust microservice ([main.rs](../../008_water_quality_api_rust/src/main.rs)) built with Axum, Tokio, GDAL 0.17, and Rayon.
    - Directly handles remote HTTP range requests to AWS S3 Cloud-Optimized GeoTIFFs (COGs).
- ***External Services***:
    - AWS Earth Search STAC API for querying Sentinel-2 Level 2A scenes.
    - OpenStreetMap / CARTO raster basemaps for MapLibre background layers.
- ***File References***:
    - Docker Orchestration: [docker-compose.yml](../../docker-compose.yml)
    - Frontend Dockerfile: [Dockerfile](../Dockerfile)
    - Rust API Entrypoint: [main.rs](../../008_water_quality_api_rust/src/main.rs)

[←Index](#index)

## 2 Frontend Component Hierarchy

- ***Component Tree***:
    - [App.svelte](../src/App.svelte): Top-level orchestrator. Houses the MapLibre GL map canvas, session tab bar, modal overlays, and toast notifications.
    - [ControlPanel.svelte](../src/components/ControlPanel.svelte): Draggable glassmorphism control window. Hosts AOI drawing buttons, date range pickers, cloud threshold slider, scientific SCL info modal, and primary search trigger.
    - [PassList.svelte](../src/components/PassList.svelte): Floating sidebar list displaying chronological satellite passes grouped by date and orbit.
    - [PassCard.svelte](../src/components/PassCard.svelte): Individual pass card rendering dual cloud badges (`☁️ X.X% AOI` and `Y.Y% Scene`), band visualization toggles (RGB, False Color, NDVI, Water Indices), and download action buttons.
    - [ExportModal.svelte](../src/components/ExportModal.svelte): Modal dialogue allowing high-resolution export of currently selected imagery with bounding box coordinates and metadata.
    - [TimelapseModal.svelte](../src/components/TimelapseModal.svelte): Interactive timeline player for animating chronological satellite passes over the target water body.
- ***File References***:
    - Open [App.svelte](../src/App.svelte)
    - Open [ControlPanel.svelte](../src/components/ControlPanel.svelte)
    - Open [PassList.svelte](../src/components/PassList.svelte)
    - Open [PassCard.svelte](../src/components/PassCard.svelte)

[←Index](#index)

## 3 Controllers and Services Separation

- ***Controllers Directory ([src/lib/controllers/](../src/lib/controllers/))***:
    - [SearchController.ts](../src/lib/controllers/SearchController.ts): Orchestrates user search clicks, query validation, cache checks, loading states, and exact SCL cloud calculations.
    - [MapLayerController.ts](../src/lib/controllers/MapLayerController.ts): Manages MapLibre layer lifecycle, source creation, band switches, opacity controls, and raster z-ordering.
- ***Services Directory ([src/lib/services/](../src/lib/services/))***:
    - [esaStacService.ts](../src/lib/services/esaStacService.ts): Queries AWS Earth Search STAC, groups items into satellite passes, and sends passes to the Rust backend for exact AOI cloud scanning.
    - [GroupingEngine.ts](../src/lib/services/GroupingEngine.ts): Consolidates multi-tile Sentinel-2 granules sharing identical acquisition dates and relative orbits into singular composite passes.
    - [MemoryCacheService.ts](../src/lib/services/MemoryCacheService.ts): Provides client-side in-memory caching for query results to ensure instant back-and-forth toggling without duplicate network requests.
    - [clippedProtocol.ts](../src/lib/services/clippedProtocol.ts): Implements a custom MapLibre raster protocol (`clipped://`) to mask satellite tiles strictly to user-drawn polygons via HTML5 2D canvas.
    - [ImageExportService.ts](../src/lib/services/ImageExportService.ts): Handles client-side high-resolution image compositing and GeoTIFF generation for export.
- ***Drawing Managers***:
    - [DrawManager.ts](../src/lib/DrawManager.ts): Manages bounding box rectangular AOI interactions.
    - [PolygonDrawManager.ts](../src/lib/PolygonDrawManager.ts): Handles freehand or multi-vertex polygon drawing for custom lake and reservoir geometries.
- ***File References***:
    - Review [SearchController.ts](../src/lib/controllers/SearchController.ts)
    - Review [MapLayerController.ts](../src/lib/controllers/MapLayerController.ts)
    - Review [esaStacService.ts](../src/lib/services/esaStacService.ts)

[←Index](#index)

## 4 Next steps

- [002 Frontend State and Runes](./002_frontend_state_and_runes.md)
- [003 Map Engine and Drawing](./003_map_engine_and_drawing.md)
