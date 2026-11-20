# Frontend State and Runes

## Index

1. [Svelte 5 Runes Architecture](#1-svelte-5-runes-architecture)
2. [Core Domain Models](#2-core-domain-models)
3. [Multi-Session Management](#3-multi-session-management)
4. [Next steps](#4-next-steps)

---

## 1 Svelte 5 Runes Architecture

- ***Reactive State Engine***: State is centralized in [store.svelte.ts](../src/lib/store.svelte.ts) using Svelte 5 class-based runes (`$state` and `$derived`). No legacy writable stores or complex subscriptions are used.
- ***Key Reactive Runes***:
    - `sessions = $state<Session[]>([])`: Collection of independent user search workspaces.
    - `activeSessionId = $state<string>('')`: Identifier of currently selected session tab.
    - `maxCloudCover = $state<number>(100)`: Cloud filtering slider threshold (default is 100% to ensure zero pass omission).
    - `showCloudInfo = $state<boolean>(false)`: Visibility toggle for the scientific SCL information dialog.
    - `isSearching = $state<boolean>(false)`: Loading flag for asynchronous STAC and Rust calculations.
    - `searchStatusText = $state<string | null>(null)`: Human-readable status ticker (e.g. `'Scanning 20m SCL bands in AOI (~1.5s)...'`).
- ***Key Derived Computations***:
    - `activeSession = $derived(...)`: Returns the active session object based on `activeSessionId`.
    - `boundingBox = $derived(this.activeSession?.boundingBox)`: Spatial extent of active session.
    - `polygon = $derived(this.activeSession?.polygon)`: Active GeoJSON polygon geometry.
    - `passes = $derived(this.activeSession?.passes ?? [])`: Satellite passes available in the current session.
    - `isAreaTooLarge = $derived(...)`: Validates whether the drawn area exceeds the safety threshold (default: 10,000 km²).
- ***File References***:
    - State Store: [store.svelte.ts](../src/lib/store.svelte.ts)
    - UI Consumer: [ControlPanel.svelte](../src/components/ControlPanel.svelte)
    - UI Consumer: [App.svelte](../src/App.svelte)

[←Index](#index)

## 2 Core Domain Models

- ***Pass Model ([src/lib/models/pass.model.ts](../src/lib/models/pass.model.ts))***:
    - `id: string`: Unique pass identifier (e.g., date + orbit).
    - `date: string`: ISO acquisition timestamp.
    - `cloudCover: number`: European Space Agency catalog metadata cloud cover (scene level, 10,000 km² average).
    - `aoiCloudCover?: number`: Exact cloud percentage calculated within the drawn AOI boundary via the Rust SCL raster engine.
    - `orbitNumber?: number`: Sentinel-2 relative orbit track.
    - `tiles: STACItem[]`: Individual Copernicus granules comprising the pass.
    - `isVisible: boolean`: Whether the pass is currently active and rendered on the MapLibre canvas.
    - `activeBand: BandCombination`: Currently rendered visualization mode (`RGB`, `FalseColor`, `NDVI`, `MNDWI`, `NDTI`, `NDCI`).
- ***In-Memory Pass Curation Tools ([src/components/PassList.svelte](../src/components/PassList.svelte))***:
    - `discardedIds = $state<Set<string>>(new Set())`: Set of passes removed/dismissed by the user via the `[ ✕ ]` button on each card.
    - `cloudFilterThreshold = $state<number>(100)`: Quick-filter pills (`All`, `<10%`, `<25%`, `<50%`) filtering passes instantly in memory against `aoiCloudCover`.
    - `sortOption = $state<'newest' | 'oldest' | 'cleanest'>('newest')`: Sorts passes chronologically or by lowest AOI cloud contamination.
    - Dedicated visibility toggle (`[ 👁️ ]` / `[ 🕶️ ]`): Explicit per-card switch controlling MapLibre raster layer visibility.
    - Curated downstream output: Timelapse and Export All automatically inherit only non-discarded, filtered passes.
- ***Session Model ([src/lib/models/session.model.ts](../src/lib/models/session.model.ts))***:
    - `id: string`: Unique session UUID.
    - `title: string`: Label displayed on the session tab (e.g., "Lake Victoria", "Session 1").
    - `boundingBox: BoundingBox | null`: Selected geographical bounding box `[minLon, minLat, maxLon, maxLat]`.
    - `polygon: GeoJSON.Polygon | null`: Custom water boundary geometry drawn by user.
    - `startDate: string` & `endDate: string`: Temporal query window.
    - `passes: SatellitePass[]`: Retrieved satellite passes for this specific session.
    - `activePassId: string | null`: Currently highlighted pass.
- ***STAC Model ([src/lib/models/stac.model.ts](../src/lib/models/stac.model.ts))***:
    - Standard STAC Item structure including `assets` (visual, B02, B03, B04, B08, B11, SCL rasters).
- ***File References***:
    - Model Definition: [pass.model.ts](../src/lib/models/pass.model.ts)
    - Model Definition: [session.model.ts](../src/lib/models/session.model.ts)
    - Model Definition: [stac.model.ts](../src/lib/models/stac.model.ts)

[←Index](#index)

## 3 Multi-Session Management

- ***Session Isolation***: Users can analyze multiple water bodies simultaneously in separate tabs. Switching tabs changes the active AOI, date range, pass catalog, and map viewpoint without reloading the application.
- ***State Snapshotting***: When a search is triggered, `SearchController.ts` snapshots the bounding box, polygon, and date filters into the active session.
- ***Tab Switching Lifecycle***:
    - In [App.svelte](../src/App.svelte), clicking a tab calls `store.setActiveSession(sessionId)`.
    - The MapLibre engine immediately updates its vector highlight layers to reflect the new session's polygon.
    - Cached satellite pass layers associated with previous sessions are made invisible with `visibility: 'none'` (conserving WebGL context without re-downloading).
- ***File References***:
    - Session UI Controls: [App.svelte](../src/App.svelte)
    - Session Controller: [SearchController.ts](../src/lib/controllers/SearchController.ts)
    - Store Logic: [store.svelte.ts](../src/lib/store.svelte.ts)

[←Index](#index)

## 4 Next steps

- [003 Map Engine and Drawing](./003_map_engine_and_drawing.md)
- [004 STAC Search and Caching](./004_stac_search_and_caching.md)
