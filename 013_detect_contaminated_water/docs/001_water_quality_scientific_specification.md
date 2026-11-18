🌐 **Language / Idioma:** **[English (Active)](#)** · [Català](./001_especificacio_cientifica_qualitat_aigua_catalan.md) · [Español](./001_especificacion_cientifica_calidad_agua.md)

---

# Scientific Specification: Water Quality and Pollution Detection Algorithm (Sentinel-2)

## Table of Contents

1. [Executive Summary and Scientific Rationale](#1-executive-summary-and-scientific-rationale)
2. [Sentinel-2 MSI Spectral Bands](#2-sentinel-2-msi-spectral-bands)
3. [Water Body Delineation Algorithm](#3-water-body-delineation-algorithm)
4. [Atmospheric Filtering and Cloud Masking (SCL)](#4-atmospheric-filtering-and-cloud-masking-scl)
5. [Bio-optical Indices of Water Quality and Contamination](#5-bio-optical-indices-of-water-quality-and-contamination)
6. [Dynamic Adaptive Calibration (Percentiles)](#6-dynamic-adaptive-calibration-percentiles)
7. [Classification Hierarchy and Spectral Decision Matrix](#7-classification-hierarchy-and-spectral-decision-matrix)
8. [Peer-Reviewed Scientific References](#8-peer-reviewed-scientific-references)
9. [Next Steps](#9-next-steps)

---

## 1 Executive Summary and Scientific Rationale

- ***Technical Objective***: Assess the environmental and trophic status of inland and coastal water bodies at a 10-meter spatial resolution using passive multispectral optical remote sensing.
- ***Bio-optical Principle***:
    - Pure, clear water strongly absorbs solar radiation in the Near-Infrared (NIR) and Short-Wave Infrared (SWIR) spectra, displaying its reflectance peak in the blue and green bands.
    - Suspended phytoplankton (chlorophyll-a), inorganic particulate matter (sediments/turbidity), and surface-floating vegetation drastically alter this spectral reflectance profile at distinct diagnostic wavelengths.
- ***Scientific Rigor and Validity***:
    - The algorithm applies equations internationally validated in peer-reviewed remote sensing literature (McFeeters, Xu, Hu, Mishra, Lacaux), coupled with adaptive percentile-based thresholds to guarantee robustness across seasonal solar zenith angle fluctuations and atmospheric correction residuals.
- ***Source Code References***:
    - High-performance Rust raster engine: [processor.rs](../../008_water_quality_api_rust/src/processor.rs)
    - Classification model and color schemes: [water.model.ts](../src/lib/models/water.model.ts)

[←Table of Contents](#table-of-contents)

---

## 2 Sentinel-2 MSI Spectral Bands

The Sentinel-2 mission (European Space Agency / Copernicus Programme) carries the MultiSpectral Instrument (MSI). The algorithm processes **Level-2A (L2A)** products atmospherically corrected to Bottom-of-Atmosphere (BOA) surface reflectance:

| Band | Channel Name | Central Wavelength ($\lambda$) | Bandwidth ($\Delta\lambda$) | Native Resolution | Role in Algorithm |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B02** | Blue | $490\text{ nm}$ | $66\text{ nm}$ | $10\text{ m}$ | Baseline water reflectance and RGB rendering |
| **B03** | Green | $560\text{ nm}$ | $36\text{ nm}$ | $10\text{ m}$ | Pure water reflectance peak & NDWI numerator |
| **B04** | Red | $665\text{ nm}$ | $31\text{ nm}$ | $10\text{ m}$ | Chlorophyll-a absorption pit & turbidity peak (NDTI) |
| **B05** | RedEdge 1 | $705\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ (resampled to $10\text{ m}$) | Phytoplankton cellular scattering peak (NDCI) |
| **B06** | RedEdge 2 | $740\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ (resampled to $10\text{ m}$) | Red-edge spectral transition slope control |
| **B08** | Near-Infrared (NIR) | $842\text{ nm}$ | $115\text{ nm}$ | $10\text{ m}$ | Complete water absorption / floating algae peak (FAI) |
| **B8A** | Narrow NIR | $865\text{ nm}$ | $21\text{ nm}$ | $20\text{ m}$ (resampled to $10\text{ m}$) | Atmospheric water vapor reference |
| **B11** | Short-Wave IR (SWIR-1) | $1610\text{ nm}$ | $91\text{ nm}$ | $20\text{ m}$ (resampled to $10\text{ m}$) | Land-water separation (MNDWI) & FAI baseline |
| **SCL** | Scene Classification Layer | Discrete thematic mask | Classes 0–11 | $20\text{ m}$ (resampled to $10\text{ m}$) | Cloud, shadow, snow, and water validation |

[←Table of Contents](#table-of-contents)

---

## 3 Water Body Delineation Algorithm

To accurately isolate open water surfaces and eliminate dry soil, built-up areas, and coastal margins, the system employs a hybrid spectral and thematic decision rule:

### 3.1 Radiometric Conversion to BOA Reflectance
Raw digital numbers are converted to unitless surface reflectance in the $[0.0, 1.0]$ interval:
$$\rho_\lambda = \frac{\text{DN}_\lambda}{10000.0}$$

### 3.2 Normalized Difference Water Index (NDWI, McFeeters 1996)
Leverages high green reflectance against total absorption in NIR:
$$\text{NDWI} = \frac{\rho_{B03} - \rho_{B08}}{\rho_{B03} + \rho_{B08}}$$

### 3.3 Modified Normalized Difference Water Index (MNDWI, Xu 2006)
Replaces NIR with SWIR-1 to suppress false positives caused by urban infrastructure and bare ground:
$$\text{MNDWI} = \frac{\rho_{B03} - \rho_{B11}}{\rho_{B03} + \rho_{B11}}$$

### 3.4 Hybrid Water Validation Condition
A pixel is classified as water if verified by Copernicus Sen2Cor thematic classification or if meeting positive optical water index thresholds while excluding terrestrial vegetation and bare soil:
$$\text{is\_water} = (\text{p\_scl} == 6) \lor \Big(\big(\text{NDWI} > 0.02 \lor \text{MNDWI} > 0.05\big) \land \text{p\_scl} \notin \{4, 5\}\Big)$$
Where SCL class 4 represents dense vegetation and SCL class 5 represents un-vegetated bare soil.

[←Table of Contents](#table-of-contents)

---

## 4 Atmospheric Filtering and Cloud Masking (SCL)

Sentinel-2 Level-2A products incorporate an automated Scene Classification Layer produced by ESA's **Sen2Cor** radiative transfer pipeline.

### 4.1 SCL Pixel Quality Filtering
To eliminate spurious signals, the algorithm systematically masks clouds, cloud shadows, cirrus, and frozen surfaces:

$$\text{cloud\_mask} = \text{p\_scl} \in \{3, 8, 9, 10, 11\}$$

- **Class 3**: Cloud shadows projected on water or terrain.
- **Class 8**: Medium-probability clouds.
- **Class 9**: High-probability opaque clouds.
- **Class 10**: Thin cirrus and high-altitude ice crystal veils.
- **Class 11**: Snow or surface ice.

Valid pixels admitted to bio-optical analysis:
$$\text{valid\_water} = \text{is\_water} \land \neg \text{cloud\_mask}$$

[←Table of Contents](#table-of-contents)

---

## 5 Bio-optical Indices of Water Quality and Contamination

For all pixels where `valid_water == true`, four physical indices are computed simultaneously:

### 5.1 FAI: Floating Algae Index (Hu, 2009)
Engineered to detect surface scums and floating macroalgae while mitigating atmospheric aerosol variations and sun-glint. It quantifies the NIR reflectance anomaly above a baseline formed by Red and SWIR-1:

$$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{\lambda_{B08} - \lambda_{B04}}{\lambda_{B11} - \lambda_{B04}}$$
$$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
$$\text{FAI} = \rho_{B08} - \text{NIR}'$$

- **Physical Interpretation**: Positive spikes indicate dense floating biomass accumulations (cyanobacterial blooms, *Sargassum*, duckweed, or macroalgae mats).

### 5.2 NDCI: Normalized Difference Chlorophyll Index (Mishra & Mishra, 2012)
Designed specifically for chlorophyll-a estimation in turbid productive waters. It exploits the diagnostic chlorophyll absorption pit at $665\text{ nm}$ (Red) against the peak of cellular scattering at $705\text{ nm}$ (Red-Edge 1):

$$\text{NDCI} = \frac{\rho_{B05} - \rho_{B04}}{\rho_{B05} + \rho_{B04}}$$

- **Physical Interpretation**: Highly correlated with subsurface phytoplankton density, eutrophication levels, and microalgal concentrations.

### 5.3 NDTI: Normalized Difference Turbidity Index (Lacaux et al., 2007)
Exploits the sharp increase in red reflectance caused by inorganic mineral suspended solids relative to the green band:

$$\text{NDTI} = \frac{\rho_{B04} - \rho_{B03}}{\rho_{B04} + \rho_{B03}}$$

- **Physical Interpretation**: Quantifies Suspended Particulate Matter (SPM), silt runoff, and river discharge plumes.

### 5.4 Red Spectral Excess ($\Delta\text{Red}$)
Identifies anomalous spectral signatures where red band reflectance surpasses green reflectance in the absence of algal bloom characteristics:

$$\Delta\text{Red} = \rho_{B04} - \rho_{B03}$$

- **Physical Interpretation**: Detects chemical effluents, acid mine drainage rich in iron oxides, industrial discharges, or extreme sediment contamination.

[←Table of Contents](#table-of-contents)

---

## 6 Dynamic Adaptive Calibration (Percentiles)

- ***Scientific Problem***: Static reflectance thresholds fail across geographic domains and seasons due to changing sun zenith angles, atmospheric path radiance, and water optical types (e.g., Case-1 oceanic vs. Case-2 turbid waters).
- ***Statistical Solution***:
    - The engine computes the empirical probability distribution of each index **strictly across the valid water pixels of the target scene**.
    - Robust percentiles isolate upper distribution extremes:
        - $\text{thr\_algae} = \text{Percentile}_{95}(\text{FAI})$: Identifies the top $5\%$ of surface biomass proliferation.
        - $\text{thr\_chl} = \text{Percentile}_{85}(\text{NDCI})$: Isolates the top $15\%$ of elevated chlorophyll-a concentration.
        - $\text{thr\_turb} = \text{Percentile}_{85}(\text{NDTI})$: Isolates the top $15\%$ of suspended sediment concentration.
        - $\text{thr\_red} = \text{Percentile}_{85}(\Delta\text{Red})$: Isolates the top $15\%$ of anomalous red spectral divergence.

[←Table of Contents](#table-of-contents)

---

## 7 Classification Hierarchy and Spectral Decision Matrix

Each pixel is assigned to one of six mutually exclusive classes via the following prioritized decision tree:

| Code | Category | Hex Color | Determinant Spectral Signature | Environmental / Physical Significance |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Background / Land / Cloud** | Transparent | `valid_water == false` | Land, dense vegetation, cloud cover, or shadow. |
| **5** | **Critical Anomaly** | Dark Red (`#7a0000`) | $\text{NDTI} > \text{thr\_turb} \land \Delta\text{Red} > \text{thr\_red} \land \text{NDCI} < \text{thr\_chl}$ | Turbidity with extreme red excess without chlorophyll. Indicates industrial discharge, mineral runoff, or chemical effluent. |
| **4** | **Algal Bloom** | Deep Green (`#1b8a0a`) | $\text{FAI} > \text{thr\_algae}$ | Floating algal scums, cyanobacterial mats, or surface macrophyte accumulation. |
| **3** | **Chlorophyll / Eutrophication** | Lime Green (`#beff6b`) | $\text{NDCI} > \text{thr\_chl}$ | Elevated phytoplankton biomass in water column. High trophic status. |
| **2** | **High Turbidity** | Orange (`#e8430f`) | $\text{NDTI} > \text{thr\_turb}$ | Suspended particulate matter, sediment plume, or catchment soil erosion. |
| **1** | **Clean Water** | Cyan Blue (`#2196f3`) | Water pixel below alert thresholds | Low NIR/Red reflectance; standard oligotrophic or mesotrophic natural water body. |

[←Table of Contents](#table-of-contents)

---

## 8 Peer-Reviewed Scientific References

1. **McFeeters, S. K. (1996)**. *The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features*. International Journal of Remote Sensing, 17(7), 1425–1432. [DOI: 10.1080/01431169608948714](https://doi.org/10.1080/01431169608948714).
2. **Xu, H. (2006)**. *Modification of normalised difference water index (NDWI) to enhance open water features in remotely sensed imagery*. International Journal of Remote Sensing, 27(14), 3025–3033. [DOI: 10.1080/01431160600589179](https://doi.org/10.1080/01431160600589179).
3. **Hu, C. (2009)**. *A novel ocean color index to detect floating algae in the global oceans*. Remote Sensing of Environment, 113(10), 2118–2129. [DOI: 10.1016/j.rse.2009.05.012](https://doi.org/10.1016/j.rse.2009.05.012).
4. **Mishra, S., & Mishra, D. R. (2012)**. *Normalized difference chlorophyll index: A novel model for normalized surface chlorophyll-a retrieval in turbid productive waters*. Remote Sensing of Environment, 117, 394–406. [DOI: 10.1016/j.rse.2011.10.016](https://doi.org/10.1016/j.rse.2011.10.016).
5. **Lacaux, J. P., et al. (2007)**. *Classification of ponds from high-spatial resolution remote sensing: Application to Rift Valley Fever in Senegal*. Remote Sensing of Environment, 106(1), 66–74. [DOI: 10.1016/j.rse.2006.07.012](https://doi.org/10.1016/j.rse.2006.07.012).
6. **Main-Knorn, M., et al. (2017)**. *Sen2Cor for Sentinel-2*. Image and Signal Processing for Remote Sensing XXIII, Proc. SPIE 10427, 1042704. [DOI: 10.1117/12.2278218](https://doi.org/10.1117/12.2278218).

[←Table of Contents](#table-of-contents)

---

## 9 Next Steps

- Inspect the Rust high-performance implementation in [processor.rs](../../008_water_quality_api_rust/src/processor.rs).
- For engineering multi-granule incident analysis, see [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md).

[←Table of Contents](#table-of-contents)
