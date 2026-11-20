# STAC Search and Caching

## Index

1. [STAC Search Architecture and Earth Search Integration](#1-stac-search-architecture-and-earth-search-integration)
2. [Grouping Multi-Tile Passes](#2-grouping-multi-tile-passes)
3. [Memory Caching and Cache Hit Optimization](#3-memory-caching-and-cache-hit-optimization)
4. [Next steps](#4-next-steps)

---

## 1 STAC Search Architecture and Earth Search Integration

- ***Catalog Integration ([src/lib/services/esaStacService.ts](../src/lib/services/esaStacService.ts))***:
    - Sentinel Viewer queries the SpatioTemporal Asset Catalog (STAC) via the Rust backend proxy (`/api/stac/search`), which forwards requests to AWS Earth Search Element84.
    - Collection queried: `sentinel-2-l2a` (Copernicus Sentinel-2 Level-2A Bottom of Atmosphere reflectance).
- ***Expanded Result Limits (`limit: 500`)***:
    - Sentinel-2 orbits often intersect a water body across multiple adjoining granules (e.g., 3 to 5 tiles per pass).
    - Standard default limits (100 items) truncated passes at ~20 dates over a 90-day search window.
    - Setting `limit: 500` guarantees full time-series coverage without missing dates.
- ***Visuals***:
    ![Sentinel Viewer UI](./img/sentinel_viewer_ui.png)
- ***File References***:
    - STAC Client: [esaStacService.ts](../src/lib/services/esaStacService.ts)
    - Rust Proxy: [main.rs](../../008_water_quality_api_rust/src/main.rs)
    - Search Controller: [SearchController.ts](../src/lib/controllers/SearchController.ts)

[←Index](#index)

## 2 Grouping Multi-Tile Passes

- ***Grouping Engine ([src/lib/services/GroupingEngine.ts](../src/lib/services/GroupingEngine.ts))***:
    - Raw STAC search queries return individual 100x100 km granules (e.g., `T31TDF`, `T31TDG`).
    - Presenting raw granules directly causes duplicate pass dates and fragmented user experiences.
    - `groupGranulesIntoPasses()` aggregates granules using a composite key: `Date (YYYY-MM-DD) + Relative Orbit Number`.
- ***Pass Properties Aggregation***:
    - Granules collected on the same orbital track within minutes are merged into a single `SatellitePass`.
    - Merges tile bounding boxes to form the pass footprint.
    - Retains individual tile STAC assets (visual, B02, B03, B04, B08, B11, SCL) for targeted raster rendering.
- ***File References***:
    - Inspect grouping logic: [GroupingEngine.ts](../src/lib/services/GroupingEngine.ts)
    - Review Pass Model: [pass.model.ts](../src/lib/models/pass.model.ts)

[←Index](#index)

## 3 Memory Caching and Cache Hit Optimization

- ***In-Memory Cache ([src/lib/services/MemoryCacheService.ts](../src/lib/services/MemoryCacheService.ts))***:
    - Avoids repetitive network requests when users switch back and forth between dates or search filters.
    - Deterministic MD5 query key generated from: `boundingBox + startDate + endDate`.
- ***Cache Hit Workflow***:
    - When `SearchController.ts` initiates a search, it first checks `memoryCache.get(cacheKey)`.
    - On cache hit: Restores passes in **0 ms**, updating `store.isCachedResult = true`.
    - Tracks global performance metrics (`cacheHitRatio`, `benchmark.durationMs`).
- ***File References***:
    - Cache Service: [MemoryCacheService.ts](../src/lib/services/MemoryCacheService.ts)
    - Coordinator: [SearchController.ts](../src/lib/controllers/SearchController.ts)

[←Index](#index)

## 4 Next steps

- [05 Rust SCL Exact Clouds](./05_rust_scl_exact_clouds.md)
- [06 Export and Timelapse](./06_export_and_timelapse.md)
