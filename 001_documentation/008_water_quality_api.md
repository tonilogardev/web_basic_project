# Water Quality API (Rust Microservice)

## Index

1. [Architecture Overview](#1-architecture-overview)
2. [Local Development & Docker](#2-local-development--docker)
3. [API Endpoints](#3-api-endpoints)
4. [Satellite Platforms: Sentinel-2 vs Menut](#4-satellite-platforms-sentinel-2-vs-menut)
5. [Cloud Masking & Water Screening](#5-cloud-masking--water-screening)
6. [Spectral Pollution Indexes](#6-spectral-pollution-indexes)
7. [Water Classification Engine](#7-water-classification-engine)
8. [Output Format & Tile Rendering](#8-output-format--tile-rendering)
9. [Next steps](#9-next-steps)

---

## 1 Architecture Overview

- **Core Engine**: Pure Rust microservice built with Axum 0.7, Tokio, GDAL 0.17 (C++ FFI), Rayon 1.10 multithreading, and `image`/`png` encoders.
- **Unified Services**:
  1. **Water Quality Analysis**: Computes spectral pollution indices and pixel classification over user AOI bounding boxes.
  2. **Dynamic Tile Server**: Serves fast XYZ PNG tiles (`GET /api/tiles/:z/:x/:y.png`) with RGB true color, false color, single-band indexes, and discrete color mapping.
  3. **STAC Proxy & Cache**: High-performance in-memory cache (`POST /api/stac/search`) with sub-millisecond repeat latency.
- **Band Streaming**: Direct windowed reading from Cloud-Optimized GeoTIFFs (COGs) via GDAL `/vsicurl/` and HTTP 206 partial content range requests.
- ***File References***:
  - Entrypoint & Routes: [main.rs](../008_water_quality_api_rust/src/main.rs)
  - Raster Processing: [processor.rs](../008_water_quality_api_rust/src/processor.rs)
  - Tile Engine: [tiler.rs](../008_water_quality_api_rust/src/tiler.rs)
  - STAC Resolver: [stac.rs](../008_water_quality_api_rust/src/stac.rs)
  - Container Definition: [Dockerfile](../008_water_quality_api_rust/Dockerfile)

[←Index](#index)

## 2 Local Development & Docker

- ***Instruction***: Build and launch the container using Docker Compose with environment variables.
  ```bash
  docker compose --env-file .env.development up -d --build water-quality-api
  ```
- ***Instruction***: Test the health status endpoint.
  ```bash
  curl http://localhost:8001/water-api/
  ```
  Expected output:
  ```json
  {
    "status": "Unified Geospatial Rust API is running",
    "engine": "Pure Rust Axum + GDAL + Rayon",
    "version": "2.0.0"
  }
  ```
- ***File References***:
  - Compose Orchestrator: [docker-compose.yml](../docker-compose.yml)
  - Local Env Config: [.env.development](../.env.development)

[←Index](#index)

## 3 API Endpoints

### `GET /`
- **Purpose**: Microservice health check and engine capabilities verification.

### `POST /api/analyze`
- **Purpose**: Analyze water pollution across a satellite scene within an AOI bounding box.
- **Request Body** (JSON):
  ```json
  {
    "stac_item_id": "geneo01a_0002900_20260302120322_20260302120404_l2a",
    "bbox": [0.720, 40.640, 0.760, 40.655],
    "satellite": "menut"
  }
  ```
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `stac_item_id` | `string` | Yes | STAC feature ID (Sentinel-2 L2A or Menut L2A) |
  | `bbox` | `[f64; 4]` | Yes | `[minLng, minLat, maxLng, maxLat]` in EPSG:4326 |
  | `satellite` | `string` | No | `"sentinel-2"` (default) or `"menut"` |
  | `assets` | `object` | No | Optional dictionary of direct band asset URLs |

- **Response Body** (JSON):
  ```json
  {
    "status": "success",
    "classification_url": "http://water-quality-api:8000/public/classification_abc.tif",
    "rgb_url": "http://water-quality-api:8000/public/rgb_abc.tif",
    "job_id": "classification_abc.tif",
    "cached": false
  }
  ```

### `GET /api/tiles/:z/:x/:y.png`
- **Purpose**: Direct XYZ tile streaming reprojected to Web Mercator (`EPSG:3857`).
- **Query Parameters**:
  - `url`: Direct GeoTIFF URL (e.g. `classification_url`).
  - `b1`, `b2`, `b3`: Individual band COG URLs (e.g. Red, Green, Blue).
  - `b1_idx`, `b2_idx`, `b3_idx`: Specific channel indices for multiband COGs (e.g. Menut).
  - `colormap`: JSON-encoded mapping of pixel values to hex color codes.

[←Index](#index)

## 4 Satellite Platforms: Sentinel-2 vs Menut

| Parameter | Sentinel-2 (Copernicus / ESA) | Menut (NewSpace / ICGC) |
| :--- | :--- | :--- |
| **Catalog Provider** | AWS Element 84 Earth Search | ICGC NewSpace STAC Catalog |
| **STAC Endpoint** | `https://earth-search.aws.element84.com/v1` | `https://geoserveis.icgc.cat/.../stac-api` |
| **Ground Resolution** | 10 meters | **4.75 meters** |
| **COG Structure** | Multiple individual files (`B02.tif`, `B03.tif`, etc.) | **Single 7-band COG** (`visual.tif`) |
| **Spectral Coverage** | VNIR + SWIR1/2 + Cirrus (12 bands) | VNIR only (7 bands: B, G, R, RE1-3, NIR) |
| **Processor Routing** | `process_water_quality` in [processor.rs](../008_water_quality_api_rust/src/processor.rs#L293) | `process_menut_water_quality` in [processor.rs](../008_water_quality_api_rust/src/processor.rs#L515) |

[←Index](#index)

## 5 Cloud Masking & Water Screening

### Sentinel-2 Cloud Masking
- Uses ESA Sen2Cor **Scene Classification Layer (SCL)** band.
- Pixels with SCL values `[3, 8, 9, 10, 11]` (cloud shadows, high/medium cloud probability, thin cirrus) are automatically masked out as invalid.
- Water validity: `scl == 6` OR `(ndwi > 0.02 || mndwi > 0.05)`.

### Menut Optical Cloud Masking
Menut lacks a dedicated SCL layer or Cirrus band. Our engine applies **physics-based deterministic optical screening**:
1. **Whiteness / Color Flatness Test**:
   $$\text{VisMean} = \frac{R_{\text{Blue}} + R_{\text{Green}} + R_{\text{Red}}}{3}$$
   $$\text{Whiteness} = \frac{\sum_{i \in \{B, G, R\}} |R_i - \text{VisMean}|}{\text{VisMean}}$$
   - Thick clouds reflect all visible light symmetrically without color tint: $\text{VisMean} > 0.25$ and $\text{Whiteness} < 0.18$.
2. **NIR Absorption Contrast**:
   - Liquid water strongly absorbs NIR ($R_{\text{NIR}} < 0.10$).
   - Clouds reflect NIR strongly ($R_{\text{NIR}} > 0.20 - 0.50$).
   - Pixels with $R_{\text{NIR}} \ge 0.15$ are rejected.
3. **Thin Cirrus / Haze Test (HOT)**:
   $$\text{HOT} = R_{\text{Blue}} - 0.5 \times R_{\text{Red}}$$
   - Detected when $\text{HOT} > 0.15$ and $R_{\text{Blue}} > 0.28$.
4. **Final Water Mask**:
   ```rust
   let valid_water = ndwi > 0.02 && p_nir < 0.15 && !is_cloud;
   ```

[←Index](#index)

## 6 Spectral Pollution Indexes

- Raw digital values are divided by 10,000 to convert to Bottom-of-Atmosphere (BOA) surface reflectance $[0.0 \dots 1.0]$.

| Index | Formula | Sentinel-2 Bands | Menut Channels | Target Indicator |
| :--- | :--- | :--- | :--- | :--- |
| **NDWI** | $\frac{\text{Green} - \text{NIR}}{\text{Green} + \text{NIR}}$ | B03, B08 | Canal 2, Canal 7 | Water body delineation |
| **MNDWI** | $\frac{\text{Green} - \text{SWIR}}{\text{Green} + \text{SWIR}}$ | B03, B11 | N/A (falls back to NDWI) | Built-up terrain suppression |
| **NDTI** | $\frac{\text{Red} - \text{Green}}{\text{Red} + \text{Green}}$ | B04, B03 | Canal 3, Canal 2 | Turbidity & Suspended Solids |
| **NDCI** | $\frac{\text{RedEdge1} - \text{Red}}{\text{RedEdge1} + \text{Red}}$ | B05, B04 | Canal 4, Canal 3 | Chlorophyll-a / Eutrophication |
| **FAI** | $\text{NIR} - \text{NIR}_{\text{baseline}}$ | B08, B04, B11 | Canal 7, Canal 3 | Floating Algae / Cyanobacteria |
| **Red Excess** | $\text{Red} - \text{Green}$ | B04, B03 | Canal 3, Canal 2 | Chemical spill / Atypical anomaly |

[←Index](#index)

## 7 Water Classification Engine

- Pixels are categorized into 6 distinct classes ($0 \dots 5$) using scene-adaptive statistical percentiles over valid water pixels:

| Class ID | Label | Badge Class | Detection Logic | Color Hex |
| :---: | :--- | :--- | :--- | :---: |
| **0** | **Background / Land** | `badge-bg` | Non-water, terrain, clouds, shadows | Transparent |
| **1** | **Clean Water** | `badge-clean` | Valid water with normal optical baseline | `#2196F3` |
| **2** | **High Turbidity** | `badge-turbid` | $\text{NDTI} > P_{85}(\text{NDTI})$ | `#E8430F` |
| **3** | **Chlorophyll / Eutrophication** | `badge-chl` | $\text{NDCI} > P_{85}(\text{NDCI})$ | `#BEFF6B` |
| **4** | **Surface Algae Bloom** | `badge-algae` | $\text{FAI} > P_{95}(\text{FAI})$ | `#1B8A0A` |
| **5** | **Critical Anomaly** | `badge-anomaly` | $\text{NDTI} > P_{85} \land \text{RedExcess} > P_{85} \land \text{NDCI} < P_{85}$ | `#7A0000` |

- Adaptive thresholds ($P_{85}, P_{95}$) are computed dynamically using Rayon parallel reduction on `f32` slices with `select_nth_unstable_by`.

[←Index](#index)

## 8 Output Format & Tile Rendering

- **Classification Raster** (`classification_<id>.tif`):
  - Type: Single-band `uint8`, LZW compression.
  - Spatial Reference: Native UTM zone (e.g. `EPSG:32631`).
  - Values: Integers $0 \dots 5$.
- **Diagnostic RGB Raster** (`rgb_<id>.tif`):
  - Type: 3-band `uint8` composite (Normalized Turbidity, Chlorophyll, and Algae).
- **MapLibre Integration**:
  - Tiles are delivered via `http://water-quality-api:8000/api/tiles/{z}/{x}/{y}.png?url=...&colormap=...`.
  - Frontend crops tiles seamlessly to the exact AOI polygon using the custom `clipped://` protocol.
- ***File References***:
  - Protocol Handler: [clippedProtocol.ts](../013_detect_contaminated_water/src/lib/services/clippedProtocol.ts)
  - Map Layer Controller: [MapLayerController.ts](../013_detect_contaminated_water/src/lib/controllers/MapLayerController.ts)

[←Index](#index)

## 9 Next steps

- [Detailed Pipeline Specification (015)](./015_water_quality_sentinel_menut_pipeline.md)
- [Context Handover & Status (012)](./012_context_handover_sentinel_viewer.md)
