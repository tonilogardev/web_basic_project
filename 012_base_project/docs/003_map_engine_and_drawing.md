# Map Engine and Drawing

## Index

1. [MapLibre GL Integration and Map Lifecycle](#1-maplibre-gl-integration-and-map-lifecycle)
2. [AOI and Polygon Drawing Engines](#2-aoi-and-polygon-drawing-engines)
3. [Dynamic Raster Layer Management](#3-dynamic-raster-layer-management)
4. [Canvas Polygon Clipping Protocol](#4-canvas-polygon-clipping-protocol)
5. [Next steps](#5-next-steps)

---

## 1 MapLibre GL Integration and Map Lifecycle

- ***Map Engine Selection***: MapLibre GL JS v4 is the official WebGL rendering engine. DOM-based map renderers (e.g., Leaflet) are prohibited to ensure 60 FPS performance when compositing multi-spectral satellite rasters.
- ***Map Canvas Initialization***:
    - Initialized in [App.svelte](../src/App.svelte) inside `onMount`.
    - Custom dark basemap style combined with high-contrast satellite tile overlays.
    - Preserves WebGL context during tab switching to avoid expensive context recreation.
- ***Visuals***:
    ![Sentinel Viewer UI](./img/sentinel_viewer_ui.png)
- ***File References***:
    - Map Initialization: [App.svelte](../src/App.svelte)
    - Custom Protocol Registration: [clippedProtocol.ts](../src/lib/services/clippedProtocol.ts)

[←Index](#index)

## 2 AOI and Polygon Drawing Engines

- ***Bounding Box Manager ([src/lib/DrawManager.ts](../src/lib/DrawManager.ts))***:
    - Handles rectangular Area of Interest (AOI) selection via click-and-drag.
    - Synchronizes bounding box coordinates `[minLon, minLat, maxLon, maxLat]` into `store.activeSession.boundingBox`.
    - Enforces safety limits: flags `isAreaTooLarge` when selection exceeds 10,000 km² to prevent memory exhaustion.
- ***Polygon Drawing Manager ([src/lib/PolygonDrawManager.ts](../src/lib/PolygonDrawManager.ts))***:
    - Provides freehand and multi-vertex drawing tools for tracing non-rectangular natural boundaries (e.g., lakes, reservoirs, river basins).
    - Stores geometry as standard GeoJSON `Polygon` in `store.activeSession.polygon`.
    - Calculates geodesic surface area in real time using Turf.js (`@turf/area`).
- ***File References***:
    - Open [DrawManager.ts](../src/lib/DrawManager.ts)
    - Open [PolygonDrawManager.ts](../src/lib/PolygonDrawManager.ts)
    - Review State Bindings: [store.svelte.ts](../src/lib/store.svelte.ts)

[←Index](#index)

## 3 Dynamic Raster Layer Management

- ***Controller Responsibilities ([src/lib/controllers/MapLayerController.ts](../src/lib/controllers/MapLayerController.ts))***:
    - Dynamically generates raster tile sources using the custom `clipped://` protocol.
    - Controls layer visibility without destroying WebGL resources: sets `visibility: 'none'` when unchecking a pass, and `visibility: 'visible'` when rechecking, achieving **0 ms latency**.
    - Orders layers so that vector boundaries, labels, and water markers remain strictly above raster imagery.
- ***Band Combination Switching***:
    - Supports real-time rendering transitions between:
        - `RGB (True Color)`: Sentinel-2 bands 4, 3, 2.
        - `False Color (Infrared)`: Sentinel-2 bands 8, 4, 3 (vegetation and shoreline contrast).
        - `NDVI (Vegetation Index)`: `(B08 - B04) / (B08 + B04)`.
        - `MNDWI / NDWI (Modified Normalized Difference Water Index)`: `(B03 - B11) / (B03 + B11)`.
        - `NDTI (Turbidity Index)`: `(B04 - B03) / (B04 + B03)`.
        - `NDCI (Chlorophyll-a Index)`: `(B05 - B04) / (B05 + B04)`.
- ***File References***:
    - Edit layer logic in [MapLayerController.ts](../src/lib/controllers/MapLayerController.ts)
    - Pass Card toggles in [PassCard.svelte](../src/components/PassCard.svelte)

[←Index](#index)

## 4 Canvas Polygon Clipping Protocol

- ***Custom Protocol Definition ([src/lib/services/clippedProtocol.ts](../src/lib/services/clippedProtocol.ts))***:
    - Registered via `maplibregl.addProtocol('clipped', ...)`.
    - Intercepts tile requests of format `clipped://{tileUrl}?polygon={encodedGeoJSON}`.
- ***Key Optimizations***:
    - **1x1 Transparent Buffer**: Returns a pre-allocated transparent 1x1 PNG for any tile completely outside the user polygon bounding box, reducing network and CPU load.
    - **LRU Memory Cache**: Stores up to 500 clipped tiles in RAM for instant re-rendering during panning and zooming.
    - **Canvas Alpha Masking**: Fetches the underlying satellite tile, draws it onto an HTML5 Canvas, and applies the user's polygon boundary using `globalCompositeOperation = 'destination-in'`.
    - **Hardware WebP Encoding**: Compresses final clipped tiles to `image/webp` (quality 0.95), leveraging browser hardware acceleration.
- ***File References***:
    - Inspect implementation: [clippedProtocol.ts](../src/lib/services/clippedProtocol.ts)

[←Index](#index)

## 5 Next steps

- [004 STAC Search and Caching](./004_stac_search_and_caching.md)
- [005 Rust SCL Exact Clouds](./005_rust_scl_exact_clouds.md)
