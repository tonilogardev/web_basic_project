# Sentinel Viewer Master Documentation

## Index

1. [Project Overview](#1-project-overview)
2. [Fast Onboarding for AI and Developers](#2-fast-onboarding-for-ai-and-developers)
3. [Local Development Commands](#3-local-development-commands)
4. [Documentation Chapters](#4-documentation-chapters)
5. [Next steps](#5-next-steps)

---

## 1 Project Overview

- ***Core Mission***: Sentinel Viewer is a high-performance web GIS application designed to discover, visualize, and analyze Sentinel-2 multi-spectral satellite imagery over water bodies and land areas of interest (AOI).
- ***Key Differentiator***: Replaces inaccurate 10,000 km² scene-level cloud averages with native 20m Scene Classification Layer (SCL) pixel scanning strictly inside the user's drawn boundary via a parallelized Rust engine.
- ***Visuals***:
    ![Sentinel Viewer UI](./img/sentinel_viewer_ui.png)
- ***File References***:
    - Application Root: [012_base_project/](../)
    - Source Directory: [src/](../src/)
    - Docker Compose Stack: [docker-compose.yml](../../docker-compose.yml)
    - Unified Rust Backend: [008_water_quality_api_rust/](../../008_water_quality_api_rust/)

[←Index](#index)

## 2 Fast Onboarding for AI and Developers

- ***Role Context***: Use this documentation when starting a new chat or handover session to immediately restore full context of the codebase without reading hundreds of source files.
- ***Frontend Framework***: Svelte 5 (Runes state model: `$state`, `$derived`, `$effect`). Zero Virtual DOM overhead.
- ***Map Engine***: MapLibre GL JS with custom WebGL canvas clipping protocols. Leaflet is strictly prohibited.
- ***Geospatial Backend***: High-performance Rust microservice ([008_water_quality_api_rust](../../008_water_quality_api_rust/)) using Axum, GDAL, and Rayon for parallel COG pixel classification. TiTiler (Python) is retired.
- ***STAC Provider***: AWS Earth Search STAC API (`https://earth-search.aws.element84.com/v1`) querying collection `sentinel-2-l2a`.
- ***Primary Guardrails***:
    - Never execute `git push` unless the user explicitly orders it in the prompt.
    - Keep B1/B2 English coaching tips in every assistant communication turn.
    - Follow strict TypeScript typing; `any` is prohibited.
- ***File References***:
    - Read state management: [store.svelte.ts](../src/lib/store.svelte.ts)
    - Read search coordinator: [SearchController.ts](../src/lib/controllers/SearchController.ts)
    - Read map renderer: [MapLayerController.ts](../src/lib/controllers/MapLayerController.ts)

[←Index](#index)

## 3 Local Development Commands

- ***Install Dependencies***:
  ```bash
  cd 012_base_project
  npm install
  ```
- ***Start Development Server***:
  ```bash
  npm run dev
  ```
- ***Type Check and Lint***:
  ```bash
  npm run check
  ```
- ***Production Build***:
  ```bash
  npm run build
  ```
- ***Docker Deployment Simulation***:
  ```bash
  docker compose build sentinel-viewer
  docker compose up -d sentinel-viewer
  ```
- ***File References***:
    - Edit scripts: [package.json](../package.json)
    - Review build setup: [vite.config.ts](../vite.config.ts)
    - Inspect Dockerfile: [Dockerfile](../Dockerfile)

[←Index](#index)

## 4 Documentation Chapters

- ***[001_system_architecture.md](./001_system_architecture.md)***: Complete full-stack architectural map, container boundaries, and component breakdown.
- ***[002_frontend_state_and_runes.md](./002_frontend_state_and_runes.md)***: Svelte 5 Runes reactivity, data models, and multi-session workspaces.
- ***[003_map_engine_and_drawing.md](./003_map_engine_and_drawing.md)***: MapLibre GL JS integration, polygon drawing, and client-side canvas raster clipping.
- ***[004_stac_search_and_caching.md](./004_stac_search_and_caching.md)***: Earth Search STAC integration, pass grouping by orbit, and memory caching.
- ***[005_rust_scl_exact_clouds.md](./005_rust_scl_exact_clouds.md)***: Native 20m ESA SCL cloud masking pipeline in Rust with Rayon and GDAL `/vsicurl/`.
- ***[006_export_and_timelapse.md](./006_export_and_timelapse.md)***: High-resolution image export and temporal animated timelapse generator.
- ***[007_ci_cd_and_deployment.md](./007_ci_cd_and_deployment.md)***: GitHub Actions deployment pipeline, Hetzner VPS hosting, and concurrency control.

[←Index](#index)

## 5 Next steps

- [001 System Architecture](./001_system_architecture.md)
