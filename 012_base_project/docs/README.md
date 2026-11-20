# Sentinel Viewer Documentation

## Index

1. [Quick Navigation](#1-quick-navigation)
2. [Project Summary](#2-project-summary)
3. [Next steps](#3-next-steps)

---

## 1 Quick Navigation

- ***Master Index***: Open [000_master_index.md](./000_master_index.md) for full onboarding instructions.
- ***Visuals***:
    ![Sentinel Viewer UI](./img/sentinel_viewer_ui.png)
- ***File References***:
    - [000_master_index.md](./000_master_index.md)
    - [001_system_architecture.md](./001_system_architecture.md)
    - [002_frontend_state_and_runes.md](./002_frontend_state_and_runes.md)
    - [003_map_engine_and_drawing.md](./003_map_engine_and_drawing.md)
    - [004_stac_search_and_caching.md](./004_stac_search_and_caching.md)
    - [005_rust_scl_exact_clouds.md](./005_rust_scl_exact_clouds.md)
    - [006_export_and_timelapse.md](./006_export_and_timelapse.md)
    - [007_ci_cd_and_deployment.md](./007_ci_cd_and_deployment.md)

[←Index](#index)

## 2 Project Summary

- **Technology**: Svelte 5 (Runes), MapLibre GL JS, Rust GDAL backend, Traefik, Docker.
- **Key Capability**: Real-time STAC Sentinel-2 imagery exploration with parallel exact 20m SCL cloud calculation in AOI.
- ***File References***:
    - Frontend Entry: [App.svelte](../src/App.svelte)
    - Rust Service: [main.rs](../../008_water_quality_api_rust/src/main.rs)

[←Index](#index)

## 3 Next steps

- [Master Index](./000_master_index.md)
- [001 System Architecture](./001_system_architecture.md)
