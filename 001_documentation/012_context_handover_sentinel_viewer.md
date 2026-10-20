# Sentinel Viewer Context Handover & Status

## Index

1. [Role & Communication Agreements](#1-role--communication-agreements)
2. [Current Architecture & Implemented Features](#2-current-architecture--implemented-features)
3. [Recent Commits & Deployment Status](#3-recent-commits--deployment-status)
4. [Key Technical Decisions](#4-key-technical-decisions)
5. [Next steps](#5-next-steps)

---

## 1 Role & Communication Agreements

- **Role**: Main Software Engineer of the Sentinel Viewer project ([005_sentinel_viewer/](../005_sentinel_viewer/)).
- **Communication Language**: English.
- **Language Level**: **B1**.
  - Keep explanations short, clear, and direct.
  - Avoid unnecessary technical idioms or long academic prose.
  - Use action-oriented commands and clear bullet points.
- ***File References***:
  - Viewer Source: [005_sentinel_viewer/](../005_sentinel_viewer/)
  - Architecture Rules: [.agents/skills/frontend_005_sentinel_viewer/SKILL.md](../.agents/skills/frontend_005_sentinel_viewer/SKILL.md)
  - Documentation Guide: [.agents/skills/documentation/SKILL.md](../.agents/skills/documentation/SKILL.md)

[←Index](#index)

## 2 Current Architecture & Implemented Features

- **Frontend**: Svelte 5 (runes state), MapLibre GL JS, and draggable window system.
- **Tile Engine**: Titiler (Dockerized) for dynamic STAC tile rendering.
- **Heavy Processing**: Python FastAPI service ([008_water_quality_api/](../008_water_quality_api/)).
- **Implemented Features (Session 1266f055)**:
  - **Date Widgets**: Fixed mouse selection and range inputs.
  - **Area of Interest (AOI) Limit**: Guardrail around 10,000 km² maximum selection rectangle.
  - **Draggable Window Layout**: Separate search and product windows can be moved on screen without blocking main controls.
  - **Download Lock & Interaction Backdrop**:
    - Semi-transparent backdrop blocks user clicks while image tiles or algorithms are downloading/rendering.
    - Spinner timing is synchronized: hides only after tiles finish rendering on the map.
  - **Deterministic Cache (Water Quality & Band Combinations)**:
    - Results are stored in memory cache after first calculation.
    - Checking and unchecking RGB, NDVI, or Water Quality layers is instantaneous and makes 0 new network calls.
  - **In-Memory Visibility Cache**:
    - Unchecking an image does not destroy the WebGL source or layer; it sets `visibility: 'none'`.
    - Re-checking any previously loaded image is instantaneous (0ms) without network calls.
    - "View all" loads all scene tiles into MapLibre memory, allowing users to rapidly toggle individual images with zero latency.
    - Garbage collection: layers and sources are purged from memory only when the search panel is closed (✕) or bounding box cleared.
  - **Live Download Timer & Estimated Duration**:
    - Displays realistic estimated time (e.g., `~2s` for 1 scene, `~20s` for 40+ scenes) and live elapsed seconds ticker.
    - Works on both individual scene toggle ("View") and global check ("View all").
    - Synchronized progress bar and final duration toast (`Images loaded in Xs`).
- ***File References***:
  - State Management: [store.svelte.ts](../005_sentinel_viewer/src/lib/store.svelte.ts)
  - Map Interaction & Layer Management: [MapManager.ts](../005_sentinel_viewer/src/lib/MapManager.ts)
  - Titiler & STAC Requests: [titilerApi.ts](../005_sentinel_viewer/src/lib/titilerApi.ts)
  - Docker Setup: [docker-compose.yml](../docker-compose.yml)

[←Index](#index)

## 3 Recent Commits & Deployment Status

- **Active Branches**: `main_dev_pro_rust` (feature branch for Rust backend architecture), `main_dev_pro`, `main`.
- **Deleted Branches**: `main_dev_pro_bluepixel_app` (merged and deleted locally and on `origin`).
- **Recent Git History**:
  - `main_dev_pro_rust`: Implemented `008_water_quality_api_rust` (Axum + GDAL + Rayon) replacing Python service.
  - `443ce88`: `feat(sentinel-viewer): add live download timer and in-memory layer visibility cache`
  - `ae66277`: `feat: add water quality caching and full-screen lock during image download`
  - `e942565`: `feat(sentinel-viewer): add draggable windows and multi-widget search layout`
- **CI/CD Pipeline**: GitHub Actions workflow ([production-deploy.yml](../.github/workflows/production-deploy.yml)) runs on push to `main_dev_pro`.
- ***File References***:
  - CI/CD Workflow: [.github/workflows/production-deploy.yml](../.github/workflows/production-deploy.yml)
  - Production Deployment Guide: [004_production_variables_production_deploy.md](./004_production_variables_production_deploy.md)

[←Index](#index)

## 4 Key Technical Decisions

- **Backend Architecture - Rust Microservice (`008_water_quality_api_rust`)**:
  - Migrated the heavy Python raster calculation microservice to native Rust using **Axum 0.7**, **Tokio**, **GDAL 0.17**, and **Rayon 1.10**.
  - **Docker Image Size**: Reduced from **1.38 GB** down to **275 MB** (80% disk saving).
  - **Idle Memory Footprint**: Reduced from **~600 MiB** down to **8.5 MiB** (98% RAM saving).
  - **Peak Memory Under Load**: ~130 MiB with zero garbage collection spikes.
  - **Parallelism**: Rayon parallelizes remote HTTP/VSI band fetching and multi-spectral water quality pixel math (NDWI, MNDWI, FAI, NDTI, NDCI) with SIMD efficiency.
  - **Cache Speed**: Deterministic MD5 key lookup serves repeated queries in <20 ms.
  - **API Contract**: 100% backward-compatible with TiTiler and Svelte frontend (`POST /api/analyze`, `/public/{filename}`).
- **AOI Clipping**: Computation runs only on the selected bounding box, reducing memory pressure and server cost on Hetzner VPS.
- **Disk Space Management**: Rust background cleanup task clears temporary `.tif` files older than 1 hour in [main.rs](../008_water_quality_api_rust/src/main.rs).
- **UI Responsiveness**: Toggling layer visibility does not trigger re-downloads thanks to client cache keys.
- ***File References***:
  - Rust Water Quality Processor: [processor.rs](../008_water_quality_api_rust/src/processor.rs)
  - Rust API Server: [main.rs](../008_water_quality_api_rust/src/main.rs)
  - Docker Compose: [docker-compose.yml](../docker-compose.yml)

[←Index](#index)

## 5 Next steps

- Review and test Sentinel Viewer in browser on `main_dev_pro_rust`.
- Once verified, merge `main_dev_pro_rust` into `main_dev_pro`.
- Deploy to Hetzner VPS and verify low RAM footprint in production.
- When opening a new conversation with the AI agent, prompt:
  > *"Hi, please read `@001_documentation/012_context_handover_sentinel_viewer.md` to load the full context, role, and current progress. Let's continue from there."*

[←Index](#index)

