🌐 **Language / Idioma:** **[English (Active)](#)** · [Català](./001_especificacio_cientifica_qualitat_aigua_catalan.md) · [Español](./001_especificacion_cientifica_calidad_agua.md)

---

# Scientific Specification: Water Quality and Pollution Detection Algorithm (Sentinel-2 and Menut)

## Table of Contents

1. [Executive Summary and Scientific Rationale](#1-executive-summary-and-scientific-rationale)
2. [Sensor Spectral Bands: Sentinel-2 MSI & Menut VNIR](#2-sensor-spectral-bands-sentinel-2-msi--menut-vnir)
3. [Atmospheric Filtering and Cloud Masking](#3-atmospheric-filtering-and-cloud-masking)
4. [Water Body Delineation Algorithm](#4-water-body-delineation-algorithm)
5. [Bio-optical Indices of Water Quality and Contamination](#5-bio-optical-indices-of-water-quality-and-contamination)
6. [Dynamic Adaptive Calibration (Statistical Percentiles)](#6-dynamic-adaptive-calibration-statistical-percentiles)
7. [Classification Hierarchy and Spectral Decision Matrix](#7-classification-hierarchy-and-spectral-decision-matrix)
8. [Peer-Reviewed Scientific References](#8-peer-reviewed-scientific-references)
9. [Next Steps](#9-next-steps)

---

## 1 Executive Summary and Scientific Rationale

- ***Technical Objective***: Assess the environmental status, sediment turbidity, and trophic anomalies of inland and coastal water bodies at $10\text{ m}$ (Sentinel-2) and $4.75\text{ m}$ (Menut) spatial resolution using passive multispectral optical remote sensing.
- ***Bio-optical Principle***:
    - Pure, clear water strongly absorbs solar radiation in the Near-Infrared (NIR) and Short-Wave Infrared (SWIR) spectra, displaying its reflectance peak in the blue and green bands.
    - Suspended phytoplankton (chlorophyll-a), inorganic particulate matter (sediments/turbidity), and surface-floating vegetation drastically alter this spectral reflectance profile at distinct diagnostic wavelengths.
- ***Scientific Rigor and Validity***:
    - The algorithm applies equations internationally validated in peer-reviewed remote sensing literature (McFeeters, Xu, Hu, Mishra, Lacaux), coupled with adaptive percentile-based thresholds to guarantee robustness across seasonal solar zenith angle fluctuations and atmospheric correction residuals.
- ***Source Code References***:
    - High-performance Rust raster engine: [processor.rs](../../008_water_quality_api_rust/src/processor.rs)
    - Technical manual and cloud masking workflow: [003_procesamiento_satelital_nubes_mascaras_clasificacion.md](./003_procesamiento_satelital_nubes_mascaras_clasificacion.md)
    - Classification model and color schemes: [water.model.ts](../src/lib/models/water.model.ts)

[←Table of Contents](#table-of-contents)

---

## 2 Sensor Spectral Bands: Sentinel-2 MSI & Menut VNIR

The algorithm processes **Level-2A (L2A)** products atmospherically corrected to Bottom-of-Atmosphere (BOA) surface reflectance:

### 2.1 Sentinel-2 MSI (Copernicus / ESA)
Operates at spatial resolutions of $10\text{ m}$ and $20\text{ m}$, providing each channel in separate Cloud-Optimized GeoTIFFs:

| Band | Channel Name | Central Wavelength ($\lambda$) | Bandwidth ($\Delta\lambda$) | Native Resolution | Role in Algorithm |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B02** | Blue | $490\text{ nm}$ | $66\text{ nm}$ | $10\text{ m}$ | Baseline water reflectance and RGB rendering |
| **B03** | Green | $560\text{ nm}$ | $36\text{ nm}$ | $10\text{ m}$ | Pure water reflectance peak & NDWI numerator |
| **B04** | Red | $665\text{ nm}$ | $31\text{ nm}$ | $10\text{ m}$ | Chlorophyll-a absorption pit & turbidity peak (NDTI) |
| **B05** | RedEdge 1 | $705\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ | Phytoplankton cellular scattering peak (NDCI) |
| **B06** | RedEdge 2 | $740\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ | Red-edge spectral transition slope control |
| **B08** | Near-Infrared (NIR) | $842\text{ nm}$ | $115\text{ nm}$ | $10\text{ m}$ | Complete water absorption / floating algae peak (FAI) |
| **B8A** | Narrow NIR | $865\text{ nm}$ | $21\text{ nm}$ | $20\text{ m}$ | Atmospheric water vapor reference |
| **B11** | Short-Wave IR (SWIR-1) | $1610\text{ nm}$ | $91\text{ nm}$ | $20\text{ m}$ | Land-water separation (MNDWI) & FAI baseline |
| **SCL** | Scene Classification Layer | Discrete thematic mask | Classes 0–11 | $20\text{ m}$ | Cloud, shadow, snow, and water validation |

### 2.2 Menut VNIR (NewSpace / ICGC / Open Cosmos)
Operates at a submetric resolution of $4.75\text{ m}$, packaging 7 optical channels into a single COG file (`visual.tif`):

| Band | Channel Name | Wavelength ($\lambda$) | Native Resolution | Role in Algorithm |
| :--- | :--- | :--- | :--- | :--- |
| **Band 1** | Blue (BLU) | $\sim 490\text{ nm}$ | $4.75\text{ m}$ | RGB composite, whiteness test, haze filtering (HOT) |
| **Band 2** | Green (GRN) | $\sim 560\text{ nm}$ | $4.75\text{ m}$ | Pure water peak, NDWI calculation, turbidity baseline |
| **Band 3** | Red (RED) | $\sim 665\text{ nm}$ | $4.75\text{ m}$ | Chlorophyll absorption, NDTI turbidity, and Red Excess ($\Delta\text{Red}$) |
| **Band 4** | RedEdge 1 (RE1) | $\sim 705\text{ nm}$ | $4.75\text{ m}$ | Phytoplankton cell reflection for NDCI chlorophyll index |
| **Band 5** | RedEdge 2 (RE2) | $\sim 740\text{ nm}$ | $4.75\text{ m}$ | RedEdge transition control |
| **Band 6** | RedEdge 3 (RE3) | $\sim 783\text{ nm}$ | $4.75\text{ m}$ | Transition to Near-Infrared |
| **Band 7** | Near-Infrared (NIR) | $\sim 842\text{ nm}$ | $4.75\text{ m}$ | Water absorption, cloud detection, and floating algae contrast (FAI) |

[←Table of Contents](#table-of-contents)

---

## 3 Atmospheric Filtering and Cloud Masking

Atmospheric filtering eliminates pixels compromised by clouds, projected shadows, or heavy aerosols before computing bio-optical parameters.

### 3.1 Sentinel-2: Sen2Cor SCL Mask
Leverages the pre-computed Scene Classification Layer:
$$\text{cloud\_mask}_{S2} = \text{p\_scl} \in \{3, 8, 9, 10, 11\}$$
- **Class 3**: Cloud shadows projected on water or terrain.
- **Class 8**: Medium-probability clouds.
- **Class 9**: High-probability clouds (opaque).
- **Class 10**: Thin cirrus and high-altitude ice crystals.
- **Class 11**: Snow or surface ice.

### 3.2 Menut: Real-Time Physical Optical Screening
Lacking an operational SCL mask, Menut applies physical multiespectral tests:
1. **Whiteness & Brightness Test**:
   $$\text{VisMean} = \frac{\rho_{\text{BLU}} + \rho_{\text{GRN}} + \rho_{\text{RED}}}{3} > 0.25 \quad \land \quad \text{Whiteness} < 0.18$$
2. **NIR Reflectance Thresholding**:
   Water absorbs heavily in NIR ($\rho_{\text{NIR}} < 0.15$), whereas clouds scatter strongly ($\rho_{\text{NIR}} \ge 0.20$):
   $$\text{is\_opaque\_cloud} = \rho_{\text{NIR}} \ge 0.25$$
3. **Haze Optimized Transformation (HOT)**:
   $$\text{HOT} = \rho_{\text{BLU}} - 0.5 \cdot \rho_{\text{RED}} > 0.15$$
4. **Integrated Exclusion Rule**:
   $$\text{is\_cloud}_{\text{Menut}} = (\text{VisMean} > 0.25 \land \text{Whiteness} < 0.18) \lor \rho_{\text{NIR}} \ge 0.25 \lor \text{HOT} > 0.15$$

[←Table of Contents](#table-of-contents)

---

## 4 Water Body Delineation Algorithm

To reliably isolate water surfaces and exclude bare soil, urban areas, and sand:

### 4.1 Radiometric BOA Conversion
Raw integer digital numbers are converted to dimensionless reflectance values:
$$\rho_\lambda = \frac{\text{DN}_\lambda}{10000.0}$$

### 4.2 Spectral Water Indices
- **NDWI (McFeeters, 1996)**:
  $$\text{NDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{NIR}}}{\rho_{\text{Green}} + \rho_{\text{NIR}}}$$
- **MNDWI (Xu, 2006)**:
  $$\text{MNDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{SWIR}}}{\rho_{\text{Green}} + \rho_{\text{SWIR}}}$$

### 4.3 Validation Logic by Platform
- **Sentinel-2**:
  $$\text{valid\_water}_{S2} = \Big((\text{p\_scl} == 6) \lor \big((\text{NDWI} > 0.02 \lor \text{MNDWI} > 0.05) \land \text{p\_scl} \notin \{4, 5\}\Big)\Big) \land \neg \text{cloud\_mask}_{S2}$$
- **Menut**:
  $$\text{valid\_water}_{\text{Menut}} = (\text{NDWI} > 0.02) \land (\rho_{\text{NIR}} < 0.25) \land \neg \text{is\_cloud}_{\text{Menut}}$$

[←Table of Contents](#table-of-contents)

---

## 5 Bio-optical Indices of Water Quality and Contamination

On all pixels satisfying `valid_water == true`, four physical metrics are derived:

### 5.1 FAI: Floating Algae Index (Hu, 2009)
Detects surface-floating vegetation, algal scums, and macroalgae:
- **Sentinel-2 (with SWIR B11 channel)**:
  $$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
  $$\text{FAI}_{S2} = \rho_{B08} - \text{NIR}'$$
- **Menut (adapted to VNIR sensor without SWIR)**:
  $$\text{FAI}_{\text{Menut}} = \rho_{\text{NIR}} - \rho_{\text{RED}}$$

### 5.2 NDCI: Normalized Difference Chlorophyll Index (Mishra & Mishra, 2012)
Estimates chlorophyll-a in turbid waters via the ratio of red absorption to red-edge cellular reflection:
$$\text{NDCI} = \frac{\rho_{\text{RedEdge1}} - \rho_{\text{Red}}}{\rho_{\text{RedEdge1}} + \rho_{\text{Red}}}$$
- Sentinel-2: B05 ($705\text{ nm}$) and B04 ($665\text{ nm}$).
- Menut: Band 4 RE1 ($705\text{ nm}$) and Band 3 RED ($665\text{ nm}$).

### 5.3 NDTI: Normalized Difference Turbidity Index (Lacaux et al., 2007)
Suspended inorganic particles enhance red reflectance relative to green:
$$\text{NDTI} = \frac{\rho_{\text{Red}} - \rho_{\text{Green}}}{\rho_{\text{Red}} + \rho_{\text{Green}}}$$

### 5.4 Red Excess ($\Delta\text{Red}$)
Detects atypical chromatic divergence caused by industrial effluents or mineral mine runoffs without photosynthetic chlorophyll activity:
$$\Delta\text{Red} = \rho_{\text{Red}} - \rho_{\text{Green}}$$

[←Table of Contents](#table-of-contents)

---

## 6 Dynamic Adaptive Calibration (Statistical Percentiles)

- ***Scientific Premise***: Fluctuations in solar elevation angle, seasonal water temperatures, and atmospheric residuals preclude rigid static thresholds.
- ***Dynamic Strategy***:
    - Statistical distributions are computed **exclusively over valid water pixels**:
        - $\text{thr\_algae} = \text{Percentile}_{95}(\text{FAI})$: Isolates the top $5\%$ of surface floating biomass.
        - $\text{thr\_chl} = \text{Percentile}_{85}(\text{NDCI})$: Isolates the top $15\%$ of column phytoplankton concentration.
        - $\text{thr\_turb} = \text{Percentile}_{85}(\text{NDTI})$: Isolates the top $15\%$ of suspended sediment load.
        - $\text{thr\_red} = \text{Percentile}_{85}(\Delta\text{Red})$: Isolates anomalous red spectral excesses.

[←Table of Contents](#table-of-contents)

---

## 7 Classification Hierarchy and Spectral Decision Matrix

Each pixel within the requested AOI is classified into one of 6 mutually exclusive categories:

| Code | Category | Hex Color | Visual Color | Decision Rule | Environmental Interpretation |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **0** | **Background / Land / Cloud** | `transparent` | Transparent | `valid_water == false` | Land, terrestrial canopy, cloud, or shadow. |
| **5** | **Critical Anomaly** | `#7a0000` | Dark Red | $\text{NDTI} > \text{thr} \land \Delta\text{Red} > \text{thr} \land \text{NDCI} < \text{thr}$ | High turbidity + red excess without chlorophyll (potential chemical spill). |
| **4** | **Surface Algae Bloom** | `#1b8a0a` | Deep Green | $\text{FAI} > \text{thr\_algae}$ | Floating algal scums, cyanobacteria mats, or macroalgal coverage. |
| **3** | **Chlorophyll / Eutrophication** | `#beff6b` | Lime Green | $\text{NDCI} > \text{thr\_chl}$ | Elevated phytoplankton biomass in water column; eutrophic conditions. |
| **2** | **High Turbidity** | `#e8430f` | Orange | $\text{NDTI} > \text{thr\_turb}$ | Suspended inorganic solids, runoff plumes, or coastal sediment resuspension. |
| **1** | **Clean Water** | `#2196f3` | Cyan Blue | Below all anomaly thresholds | Oligotrophic or standard mesotrophic clear water body. |

[←Table of Contents](#table-of-contents)

---

## 8 Peer-Reviewed Scientific References

1. **McFeeters, S. K. (1996)**. *The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features*. International Journal of Remote Sensing, 17(7), 1425-1432. [DOI: 10.1080/01431169608948714](https://doi.org/10.1080/01431169608948714).
2. **Xu, H. (2006)**. *Modification of normalised difference water index (NDWI) to enhance open water features in remotely sensed imagery*. International Journal of Remote Sensing, 27(14), 3025-3033. [DOI: 10.1080/01431160600589179](https://doi.org/10.1080/01431160600589179).
3. **Hu, C. (2009)**. *A novel ocean color index to detect floating algae in the global oceans*. Remote Sensing of Environment, 113(10), 2118-2129. [DOI: 10.1016/j.rse.2009.05.012](https://doi.org/10.1016/j.rse.2009.05.012).
4. **Mishra, S., & Mishra, D. R. (2012)**. *Normalized difference chlorophyll index: A novel model for normalized surface chlorophyll-a retrieval in turbid productive waters*. Remote Sensing of Environment, 117, 394-406. [DOI: 10.1016/rse.2011.10.016](https://doi.org/10.1016/j.rse.2011.10.016).
5. **Lacaux, J. P., et al. (2007)**. *Classification of ponds from high-spatial resolution remote sensing: Application to Rift Valley Fever in Senegal*. Remote Sensing of Environment, 106(1), 66-74. [DOI: 10.1016/j.rse.2006.07.012](https://doi.org/10.1016/j.rse.2006.07.012).
6. **Main-Knorn, M., et al. (2017)**. *Sen2Cor for Sentinel-2*. Image and Signal Processing for Remote Sensing XXIII, Proc. SPIE 10427, 1042704. [DOI: 10.1117/12.2278218](https://doi.org/10.1117/12.2278218).

[←Table of Contents](#table-of-contents)

---

## 9 Next Steps

- Review the raster processing and cloud detection manual in [003_procesamiento_satelital_nubes_mascaras_clasificacion.md](./003_procesamiento_satelital_nubes_mascaras_clasificacion.md).
- Review the Roses MGRS case report in [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md).
- Inspect the high-performance Rust engine in [processor.rs](../../008_water_quality_api_rust/src/processor.rs).
- Inspect the catalog index in [README.md](./README.md).

[←Table of Contents](#table-of-contents)
