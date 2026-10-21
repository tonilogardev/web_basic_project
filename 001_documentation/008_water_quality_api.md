# Water Quality API

## Index

1. [Architecture Overview](#1-architecture-overview)
2. [Local Development](#2-local-development)
3. [API Endpoints](#3-api-endpoints)
4. [Spectral Indexes](#4-spectral-indexes)
5. [Water Classification](#5-water-classification)
6. [Output Format](#6-output-format)
7. [Image Cleanup](#7-image-cleanup)
8. [Integration with Sentinel Viewer](#8-integration-with-sentinel-viewer)
9. [Next steps](#9-next-steps)

---

## 1 Architecture Overview

- **Runtime**: Native Rust microservice with Axum 0.7 + Tokio + GDAL 0.17 + Rayon 1.10.
- **Unified Responsibilities**:
  1. Water Quality analysis calculation (NDWI, MNDWI, FAI, NDTI, NDCI) on AOI bounding boxes.
  2. Dynamic XYZ tile rendering engine (`GET /api/tiles/:z/:x/:y.png`) with RGB composites, false color, spectral indices, and color mapping.
  3. STAC search proxy and in-memory cache (`POST /api/stac/search`) with 15-minute TTL.
- **Communication**: Reads Sentinel-2 COGs directly from AWS S3 via `/vsicurl/` with GDAL internal overview selection. Completely replaces TiTiler.
- **Deployment**: Multi-stage Docker container (`FROM rust:bookworm` -> `debian:bookworm-slim`), routed through Traefik at `water-api.tonilogar.com`.
- ***File References***:
  - Module Root: [008_water_quality_api_rust/](../008_water_quality_api_rust/)
  - API Entry & Router: [main.rs](../008_water_quality_api_rust/src/main.rs)
  - Tile Server: [tiler.rs](../008_water_quality_api_rust/src/tiler.rs)
  - STAC Proxy & Cache: [stac.rs](../008_water_quality_api_rust/src/stac.rs)
  - Water Quality Processor: [processor.rs](../008_water_quality_api_rust/src/processor.rs)
  - Dockerfile: [Dockerfile](../008_water_quality_api_rust/Dockerfile)

[←Index](#index)

## 2 Local Development

- ***Instruction***: Build and run the API container in isolation.
- Run from project root:
  ```
  docker compose up water-quality-api --build
  ```
- The API starts at `http://water-quality-api:8000` (internal Docker network) or `http://localhost:8001` (if Traefik is running).
- ***Instruction***: Test the health endpoint.
  ```
  curl http://localhost:8001/water-api/
  ```
  Expected response: `{"status":"Water Quality API is running"}`
- ***File References***:
  - Orchestrator: [docker-compose.yml](../docker-compose.yml)

[←Index](#index)

## 3 API Endpoints

### `GET /`

- Health check. Returns `{"status": "Water Quality API is running"}`.

### `POST /api/analyze`

- **Purpose**: Trigger water quality analysis on a Sentinel-2 scene.
- **Request Body** (JSON):
  ```json
  {
    "stac_item_id": "S2B_L2A_20250411T100559_R008",
    "bbox": [-0.35, 39.30, -0.20, 39.45]
  }
  ```
  | Field | Type | Description |
  |-------|------|-------------|
  | `stac_item_id` | `string` | Sentinel-2 L2A item ID from Element 84 STAC |
  | `bbox` | `[number, number, number, number]` | `[minLng, minLat, maxLng, maxLat]` in EPSG:4326 |
- **Response**:
  ```json
  {
    "status": "success",
    "classification_url": "http://water-quality-api:8000/public/classification_abc123.tif",
    "rgb_url": "http://water-quality-api:8000/public/rgb_abc123.tif",
    "job_id": "S2B_4521"
  }
  ```
  | Field | Type | Description |
  |-------|------|-------------|
  | `classification_url` | `string` | Internal URL for analysis GeoTIFF |
  | `rgb_url` | `string` | Internal URL for RGB GeoTIFF |
  | `job_id` | `string` | Unique identifier for the generated files |

### `GET /api/tiles/:z/:x/:y.png`

- **Purpose**: Dynamic XYZ raster tile server replacing TiTiler.
- **Parameters**:
  - Path: `z` (zoom level), `x` (tile column), `y` (tile row).
  - Query:
    - `b1`, `b2`, `b3`: URLs of band COGs (e.g., Red, Green, Blue or NIR).
    - `url`: Direct COG URL (e.g., classification TIFF).
    - `preset`: `"true_color"`, `"false_color"`, `"ndvi"`, `"ndwi"`.
    - `rescale`: Reflectance scale range (default `"0,3000"` for Sentinel-2, or `"-1,1"` for NDVI/NDWI).
    - `colormap`: JSON dictionary of hex colors for index/classification values.
- **Response**: Binary PNG (`image/png`) with HTTP caching headers (`Cache-Control: public, max-age=86400`).

### `POST /api/stac/search`

- **Purpose**: Proxied STAC search to Earth Search API with 15-minute in-memory caching.
- **Request Body**: STAC query payload (`collections`, `bbox`, `datetime`, `query`, `limit`, `sortby`).
- **Response**: Standard STAC GeoJSON feature collection.

[←Index](#index)

## 4 Spectral Indexes

- ***Instruction***: All computations happen in [processor.py](../008_water_quality_api/processor.py).

| Index | Formula | Bands Used | Purpose |
|-------|---------|------------|---------|
| NDWI | `(GREEN - NIR) / (GREEN + NIR)` | B03, B08 | Water detection |
| MNDWI | `(GREEN - SWIR) / (GREEN + SWIR)` | B03, B11 | Built-up area suppression |
| FAI | `NIR - NIR2` (baseline interpolation) | B04, B08, B11 | Floating algae blooms |
| NDCI | `(REDEDGE1 - RED) / (REDEDGE1 + RED)` | B04, B05 | Chlorophyll concentration |
| NDTI | `(RED - GREEN) / (RED + GREEN)` | B03, B04 | Turbidity |

- **Water mask**: Pixels where `NDWI > 0.05` or `MNDWI > 0.10`.
- **Cloud mask**: Pixels excluded if SCL band is in `[3, 8, 9, 10, 11]` (clouds, shadows, cirrus).
- **Band scaling**: All raw DN values divided by 10000 to obtain reflectance.
- **20m resampling**: B05, B06, B8A, B11, SCL resampled to 10m via `rasterio.warp.reproject`. SCL uses nearest neighbor; others use bilinear.

[←Index](#index)

## 5 Water Classification

- ***Instruction***: Pixels are classified into 5 categories using percentile-based adaptive thresholds.

| Class | Value | Criteria |
|-------|-------|----------|
| **Clear water** | 1 | Valid water pixel, no anomaly detected |
| **Turbid** | 2 | `NDTI > P85(NDTI)` |
| **Chlorophyll** | 3 | `NDCI > P85(NDCI)` |
| **Algae bloom** | 4 | `FAI > P95(FAI)` |
| **Anomaly** | 5 | `NDTI > P85(NDTI)` AND `RED_EXCESS > P85(RED_EXCESS)` AND `NDCI < P85(NDCI)` |

- **Adaptive thresholds**: Each percentile threshold is computed per-scene from the valid water pixels (`numpy.nanpercentile`). This makes classification robust across different water bodies and illumination conditions.
- ***File References***:
  - Classification logic: [processor.py](../008_water_quality_api/processor.py#L190-L197)

[←Index](#index)

## 6 Output Format

- **Purpose**: Two GeoTIFFs per request, stored in the `public/` directory and served as static files.
- ***File References***:
  - Output directory: [public/](../008_water_quality_api/public/)

### `classification_<job_id>.tif`
- **Type**: Single-band uint8, LZW compression.
- **Values**: 0 (no-data), 1–5 (water classes).
- **Usage**: Loaded by Titiler with a discrete colormap for the map overlay.

### `rgb_<job_id>.tif`
- **Type**: 3-band uint8 RGB, LZW compression.
- **Composition**:
  - R: Turbidity (NDTI normalized)
  - G: Chlorophyll (NDCI normalized)
  - B: Algae (FAI normalized)
- **Usage**: Visual diagnostic composite.

- ***File References***:
  - Export functions: [processor.py](../008_water_quality_api/processor.py#L87-L115)

[←Index](#index)

## 7 Image Cleanup

- **Problem**: On-demand TIF generation fills disk space over time.
- **Solution**: Background garbage collector triggered on each request.
- **How it works**: A `BackgroundTasks` task calls `cleanup_old_files()`, deleting any `.tif` file in `public/` older than 1 hour.
- ***File References***:
  - Cleanup function: [main.py](../008_water_quality_api/main.py#L32-L43)
  - Background task registration: [main.py](../008_water_quality_api/main.py#L53)

[←Index](#index)

## 8 Integration with Sentinel Viewer

- **Frontend**: The [Sentinel Viewer](../005_sentinel_viewer/) selects the "Water Quality Analysis" band preset.
- **Flow**:
  1. User selects Water Quality band preset and clicks Search.
  2. [titilerApi.ts](../005_sentinel_viewer/src/lib/titilerApi.ts) detects `external_api` mode.
  3. Frontend calls `POST /api/analyze` with the STAC item ID and bbox.
  4. API returns `classification_url` and `rgb_url`.
  5. Frontend passes the classification URL to Titiler, which applies a colormap and renders tiles.
  6. [Legend.svelte](../005_sentinel_viewer/src/components/Legend.svelte) displays the class legend.
- ***File References***:
  - API integration: [titilerApi.ts](../005_sentinel_viewer/src/lib/titilerApi.ts)
  - Legend: [Legend.svelte](../005_sentinel_viewer/src/components/Legend.svelte)

[←Index](#index)

## 9 Next steps

- [Back to Main README](../README.md)
