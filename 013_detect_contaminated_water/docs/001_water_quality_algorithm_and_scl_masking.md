# Sentinel-2 Water Quality Algorithm & SCL Masking Specification

## Index

1. [Problem Statement & Visual Evidence](#1-problem-statement--visual-evidence)
2. [Processing Pipeline Architecture](#2-processing-pipeline-architecture)
3. [Spatial Windowing & Coordinate Reprojection](#3-spatial-windowing--coordinate-reprojection)
4. [Water Masking & SCL Cloud/Land Filtering](#4-water-masking--scl-cloudland-filtering)
5. [Contamination Spectral Indices Formulation](#5-contamination-spectral-indices-formulation)
6. [Dynamic Percentile Thresholding & Classification Hierarchy](#6-dynamic-percentile-thresholding--classification-hierarchy)
7. [Root Cause Diagnosis: Gulf of Roses Case Study](#7-root-cause-diagnosis-gulf-of-roses-case-study)
8. [Corrective Actions & Implementation Fixes](#8-corrective-actions--implementation-fixes)
9. [Next steps](#9-next-steps)

---

## 1 Problem Statement & Visual Evidence

- ***Diagnostic Issue***: In coastal bays and marine areas (e.g., Gulf of Roses, Girona), executing `Detect Water Pollution` results in natural RGB satellite tiles rendering correctly, but the water quality classification layer renders completely transparent or missing over the sea.
- ***Visual Evidence***:
    - *Figure 1.1: Natural RGB visible in "Both" mode, but no water quality classification overlay is apparent*:
    ![Roses RGB Both Mode](./img/roses_rgb_both_mode.png)
    - *Figure 1.2: In "Water" view mode, the entire marine polygon is completely transparent/empty*:
    ![Roses Water Mode Empty](./img/roses_water_mode_empty.png)
- ***File References***:
    - View frontend controller [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts)
    - View Rust raster processor [processor.rs](../../008_water_quality_api_rust/src/processor.rs)

[←Index](#index)

---

## 2 Processing Pipeline Architecture

- ***Execution Flow***:
    1. User draws polygon in frontend ([MapView.svelte](../src/components/MapView.svelte)).
    2. Frontend triggers `POST /api/analyze` with `{ stac_item_id, bbox: [minLng, minLat, maxLng, maxLat] }`.
    3. Rust backend ([main.rs](../../008_water_quality_api_rust/src/main.rs)) resolves asset Cloud Optimized GeoTIFF (COG) URLs from AWS S3 bucket `sentinel-cogs`.
    4. GDAL reads sub-window pixel buffers for 9 spectral bands in parallel via Rayon thread pool ([processor.rs](../../008_water_quality_api_rust/src/processor.rs)).
    5. Pixels are classified into classes `0..5` and written to local COG `classification_*.tif`.
    6. Tile server ([tiler.rs](../../008_water_quality_api_rust/src/tiler.rs)) serves Web Mercator PNG tiles `{z}/{x}/{y}.png` with colormap color lookup.
- ***Bands Required***:
    - `B02` (Blue, 490 nm, 10m)
    - `B03` (Green, 560 nm, 10m)
    - `B04` (Red, 665 nm, 10m)
    - `B05` (RedEdge 1, 705 nm, 20m resampled to 10m)
    - `B06` (RedEdge 2, 740 nm, 20m resampled to 10m)
    - `B08` (NIR Broadband, 842 nm, 10m)
    - `B8A` (NIR Narrow, 865 nm, 20m resampled to 10m)
    - `B11` (SWIR 1.6µm, 1610 nm, 20m resampled to 10m)
    - `SCL` (Scene Classification Layer, 20m resampled to 10m via Nearest Neighbour)

[←Index](#index)

---

## 3 Spatial Windowing & Coordinate Reprojection

- ***Window Calculation***:
    - Transform user WGS84 bounding box `[minLng, minLat, maxLng, maxLat]` (EPSG:4326) into dataset native UTM coordinate system (e.g., EPSG:32631 for Zone 31N) using GDAL `CoordTransform`.
    - Compute dataset pixel offsets `(win_x, win_y)` and target dimensions `(win_w, win_h)`:
    ```rust
    let px_min = ((utm_min_x - gt[0]) / gt[1]).floor();
    let py_min = ((utm_max_y - gt[3]) / gt[5]).floor();
    let px_max = ((utm_max_x - gt[0]) / gt[1]).ceil();
    let py_max = ((utm_min_y - gt[3]) / gt[5]).ceil();
    ```
    - Clamp window coordinates to dataset raster boundaries:
    ```rust
    let win_x = (px_min as isize).clamp(0, ds_w as isize - 1);
    let win_y = (py_min as isize).clamp(0, ds_h as isize - 1);
    let win_w = ((px_max - px_min) as usize).max(1).min((ds_w as isize - win_x) as usize);
    let win_h = ((py_max - py_min) as usize).max(1).min((ds_h as isize - win_y) as usize);
    ```
- ***File References***:
    - Inspect window logic in [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L30-L96)

[←Index](#index)

---

## 4 Water Masking & SCL Cloud/Land Filtering

- ***Reflectance Normalization***:
    - All Digital Numbers (DN) from Sentinel-2 L2A are converted to Bottom-Of-Atmosphere (BOA) surface reflectance:
    $$\rho_\lambda = \frac{\text{DN}_\lambda}{10000.0}$$
- ***Water Indices Formulae***:
    - **NDWI** (Normalized Difference Water Index, McFeeters):
    $$\text{NDWI} = \frac{\rho_{B03} - \rho_{B08}}{\rho_{B03} + \rho_{B08}}$$
    - **MNDWI** (Modified Normalized Difference Water Index, Xu):
    $$\text{MNDWI} = \frac{\rho_{B03} - \rho_{B11}}{\rho_{B03} + \rho_{B11}}$$
- ***Scene Classification Layer (SCL) Filtering***:
    - Sentinel-2 L2A Sen2Cor SCL classes:
        - `0`: NO_DATA
        - `1`: SATURATED_OR_DEFECTIVE
        - `2`: DARK_AREA_PIXELS
        - `3`: CLOUD_SHADOWS
        - `4`: VEGETATION
        - `5`: NOT_VEGETATED (Soil / Bare ground)
        - `6`: WATER
        - `7`: UNCLASSIFIED
        - `8`: CLOUD_MEDIUM_PROBABILITY
        - `9`: CLOUD_HIGH_PROBABILITY
        - `10`: THIN_CIRRUS
        - `11`: SNOW_OR_ICE
    - Current code implementation:
    ```rust
    let water_mask = ndwi > 0.05 || mndwi > 0.10;
    let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
    let valid_water = water_mask && !cloud_mask;
    ```
- ***File References***:
    - View mask evaluation in [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L371-L376)

[←Index](#index)

---

## 5 Contamination Spectral Indices Formulation

For all pixels with `valid_water == true`, the algorithm computes four distinct optical indices:

1. **Floating Algae Index (FAI)** (Hu, 2009):
    - Baseline reflectance subtraction between Red ($664.6\text{ nm}$), NIR ($832.8\text{ nm}$), and SWIR ($1613.7\text{ nm}$):
    $$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
    $$\text{FAI} = \rho_{B08} - \text{NIR}'$$
2. **Normalized Difference Chlorophyll Index (NDCI)** (Mishra & Mishra, 2012):
    - Uses RedEdge1 ($705\text{ nm}$) absorption peak against Red ($665\text{ nm}$):
    $$\text{NDCI} = \frac{\rho_{B05} - \rho_{B04}}{\rho_{B05} + \rho_{B04}}$$
3. **Normalized Difference Turbidity Index (NDTI)** (Lacaux et al., 2007):
    - Quantifies suspended inorganic matter and sediments via Red vs Green reflectance ratio:
    $$\text{NDTI} = \frac{\rho_{B04} - \rho_{B03}}{\rho_{B04} + \rho_{B03}}$$
4. **Excess Red Anomaly Index**:
    - Detects atypical non-chlorophyll industrial runoffs, mine drainage, and chemical discharge:
    $$\Delta\text{Red} = \rho_{B04} - \rho_{B03}$$

[←Index](#index)

---

## 6 Dynamic Percentile Thresholding & Classification Hierarchy

- ***Dynamic AOI Calibration***:
    - Rather than using static thresholds that fail under variable seasonal illumination, thresholds are calculated dynamically on the valid water pixels present in the scene:
    ```rust
    let thr_algae = percentile(&mut fai_water, 95.0);
    let thr_chl   = percentile(&mut ndci_water, 85.0);
    let thr_turb  = percentile(&mut ndti_water, 85.0);
    let thr_red   = percentile(&mut red_water, 85.0);
    ```
- ***Decision Tree Hierarchy***:
    ```
    Is valid_water == false?
       ├─ YES ➔ Class 0: Background / Land / Cloud (RGBA: 0,0,0,0 Transparent)
       └─ NO  ➔ Does it exhibit anomalous Red Excess & Turbidity without Chlorophyll?
                  ├─ YES ➔ Class 5: Critical Anomaly (#7a0000 Dark Red)
                  └─ NO  ➔ Is FAI > P95 (thr_algae)?
                             ├─ YES ➔ Class 4: Surface Algae Bloom (#1b8a0a Deep Green)
                             └─ NO  ➔ Is NDCI > P85 (thr_chl)?
                                        ├─ YES ➔ Class 3: Chlorophyll / Eutrophication (#beff6b Lime Green)
                                        └─ NO  ➔ Is NDTI > P85 (thr_turb)?
                                                   ├─ YES ➔ Class 2: High Turbidity (#e8430f Orange-Red)
                                                   └─ NO  ➔ Class 1: Clean Water (#2196f3 Cyan Blue)
    ```

[←Index](#index)

---

## 7 Root Cause Diagnosis: Gulf of Roses Case Study

By querying the server state and analyzing the generated GeoTIFF raster buffers directly, two distinct root causes were identified:

### Root Cause A: MGRS Multi-Granule Tile Boundary (Primary Cause)

1. The satellite pass `20261025_R008` over Roses spans **two constituent MGRS granules**:
    - `S2A_31TDG_20261025_0_L2A` (Western granule, ending at $3^\circ 00' 00''\text{E}$)
    - `S2A_31TEG_20261025_1_L2A` (Eastern granule, spanning $3^\circ 00' 00''\text{E}$ to $4^\circ 00' 00''\text{E}$)
2. The user's polygon in the Gulf of Roses is located between **$3.11^\circ\text{E}$ and $3.23^\circ\text{E}$**.
3. In [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts#L23):
    ```typescript
    const stacItemId = pass.stacItemId || pass.granules[0]?.id;
    ```
    The frontend arbitrarily dispatched `pass.granules[0]` (`31TDG`).
4. **Physical Raster Verification**:
    - Inspecting `/app/public/classification_S2A_31TDG_*.tif`:
      - **Raster Dimensions**: `(height: 472, width: 6)`
      - Width was **only 6 pixels** because `31TDG` only grazed the westernmost shoreline at Empuriabrava! The Gulf of Roses does not exist in `31TDG`.
    - Inspecting `/app/public/classification_S2A_31TEG_*.tif`:
      - **Raster Dimensions**: `(height: 610, width: 531)`
      - **Classified Pixels**: `136,559` Clean Water, `14,535` Turbid, `11,543` Chlorophyll, `4,112` Algae, `3,333` Anomaly.
    - **Conclusion**: The analysis was executed against the wrong granule for that polygon.

### Root Cause B: SCL Classification vs Optical Index Falloff (Secondary Cause)

1. In clear coastal and deep marine waters, low chlorophyll and low turbidity cause strong NIR absorption ($\rho_{B08} \approx 0.01$). Under certain atmospheric corrections, Green ($\rho_{B03}$) may be low, yielding $\text{NDWI} \le 0.05$.
2. The code in `processor.rs` currently requires:
    ```rust
    let water_mask = ndwi > 0.05 || mndwi > 0.10;
    let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
    let valid_water = water_mask && !cloud_mask;
    ```
3. It completely ignores Sentinel-2's official Scene Classification:
    - If `p_scl == 6` (Water), but $\text{NDWI} \le 0.05$, the pixel is discarded as non-water (`valid_water = false`), turning it transparent.
    - SCL class `6` must be incorporated as an explicit water validator:
    $$\text{valid\_water} = (\text{p\_scl} == 6 \lor \text{ndwi} > 0.02 \lor \text{mndwi} > 0.05) \land \neg \text{cloud\_mask}$$

[←Index](#index)

---

## 8 Corrective Actions & Implementation Fixes

### Fix 1: Frontend Best-Granule Selection (Immediate)

- Modify [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts) to calculate the spatial intersection area between each granule's footprint/bbox and the user's polygon, selecting the granule with the highest overlap rather than `granules[0]`.

### Fix 2: Backend SCL Water Integration (Immediate)

- In [processor.rs](../../008_water_quality_api_rust/src/processor.rs), update the `valid_water` logic to leverage SCL class 6 (`WATER`) and SCL class 2 (`DARK_AREA_PIXELS` in marine contexts):
```rust
let is_scl_water = p_scl == 6;
let is_index_water = ndwi > 0.02 || mndwi > 0.05;
let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
let valid_water = (is_scl_water || is_index_water) && !cloud_mask;
```

### Fix 3: Multi-Granule Virtual Mosaic (VRT) Backend Pipeline (Architecture)

- When a user's AOI spans multiple granules within the same pass date (e.g. `31TDG` + `31TEG`), the Rust API should build an in-memory `gdal::Dataset::build_vrt` or process both granules and mosaic their classification outputs seamlessly.

[←Index](#index)

---

## 9 Next steps

- [Implement Granule Intersection Selector in WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts)
- [Harden SCL Mask Logic in processor.rs](../../008_water_quality_api_rust/src/processor.rs)

[←Index](#index)
