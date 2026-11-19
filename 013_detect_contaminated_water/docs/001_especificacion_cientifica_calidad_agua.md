🌐 **Idioma / Language:** [English](./001_water_quality_scientific_specification.md) · [Català](./001_especificacio_cientifica_qualitat_aigua_catalan.md) · **[Español (Activo)](#)**

---

# Especificación Científica: Algoritmo de Detección de Calidad de Agua y Contaminación (Sentinel-2 y Menut)

## Índice

1. [Resumen Ejecutivo y Base Científica](#1-resumen-ejecutivo-y-base-científica)
2. [Bandas Espectrales: Sentinel-2 MSI y Menut VNIR](#2-bandas-espectrales-sentinel-2-msi-y-menut-vnir)
3. [Detección Atmosférica y Máscaras de Nubes](#3-detección-atmosférica-y-máscaras-de-nubes)
4. [Algoritmo de Delineación de Masas de Agua](#4-algoritmo-de-delineación-de-masas-de-agua)
5. [Índices Bio-ópticos de Contaminación y Calidad del Agua](#5-índices-bio-ópticos-de-contaminación-y-calidad-del-agua)
6. [Calibración Adaptativa Dinámica (Percentiles Estadísticos)](#6-calibración-adaptativa-dinámica-percentiles-estadísticos)
7. [Jerarquía de Clasificación y Matriz Espectral (Clases 0 a 5)](#7-jerarquía-de-clasificación-y-matriz-espectral-clases-0-a-5)
8. [Referencias Científicas Arbitradas](#8-referencias-científicas-arbitradas)
9. [Próximos pasos](#9-próximos-pasos)

---

## 1 Resumen Ejecutivo y Base Científica

- ***Objetivo Técnico***: Evaluar el estado trófico, turbidez sedimentaria y anomalías contaminantes de masas de agua continentales y costeras a resolución de $10\text{ m}$ (Sentinel-2) y $4.75\text{ m}$ (Menut) mediante teledetección óptica multiespectral.
- ***Fundamento Bio-óptico***:
    - El agua limpia pura absorbe fuertemente la radiación en el infrarrojo cercano (NIR) y de onda corta (SWIR), mientras refleja en el espectro visible (azul y verde).
    - La presencia de fitoplancton (clorofila-a), sólidos inorgánicos en suspensión (sedimentos) o biomasa flotante altera la curva de reflectancia espectral en longitudes de onda específicas.
- ***Rigor y Validez***:
    - El algoritmo implementa formulaciones validadas por la comunidad científica internacional (McFeeters, Xu, Hu, Mishra, Lacaux), combinadas con calibración adaptativa por percentiles para garantizar robustez ante variaciones estacionales de ángulo cenital solar y corrección atmosférica.
- ***Referencias de Archivos***:
    - Proceso principal de cálculo ràster: [processor.rs](../../008_water_quality_api_rust/src/processor.rs)
    - Manual técnico y flujo de nubes: [003_procesamiento_satelital_nubes_mascaras_clasificacion.md](./003_procesamiento_satelital_nubes_mascaras_clasificacion.md)
    - Modelo de datos y codificación de clases: [water.model.ts](../src/lib/models/water.model.ts)

[←Índice](#índice)

---

## 2 Bandas Espectrales: Sentinel-2 MSI y Menut VNIR

El sistema procesa productos **Nivel-2A (L2A)** corregidos atmosféricamente a reflectancia de superficie de fondo de atmósfera (BOA, Bottom-of-Atmosphere):

### 2.1 Sensor Sentinel-2 MSI (Copernicus / ESA)
Opera a resoluciones de $10\text{ m}$ a $20\text{ m}$, distribuyendo cada canal en archivos COG individuales:

| Banda | Nombre del Canal | Longitud de Onda Central ($\lambda$) | Ancho de Banda ($\Delta\lambda$) | Resolución Nativa | Función en el Algoritmo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B02** | Azul (Blue) | $490\text{ nm}$ | $66\text{ nm}$ | $10\text{ m}$ | Reflectancia base y visualización RGB |
| **B03** | Verde (Green) | $560\text{ nm}$ | $36\text{ nm}$ | $10\text{ m}$ | Pico de reflectancia del agua y cociente NDWI |
| **B04** | Rojo (Red) | $665\text{ nm}$ | $31\text{ nm}$ | $10\text{ m}$ | Absorción de clorofila y pico de turbidez (NDTI) |
| **B05** | RedEdge 1 | $705\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ | Reflectancia celular de fitoplancton (NDCI) |
| **B06** | RedEdge 2 | $740\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ | Control de transición espectral borde rojo |
| **B08** | Infrarrojo Cercano (NIR) | $842\text{ nm}$ | $115\text{ nm}$ | $10\text{ m}$ | Absorción de agua / detección de floraciones (FAI) |
| **B8A** | NIR Estrecho | $865\text{ nm}$ | $21\text{ nm}$ | $20\text{ m}$ | Control de absorción atmosférica de vapor |
| **B11** | Infrarrojo Onda Corta (SWIR) | $1610\text{ nm}$ | $91\text{ nm}$ | $20\text{ m}$ | Separación agua/tierra (MNDWI) y línea base FAI |
| **SCL** | Scene Classification Layer | Clasificación temática | Categorías 0-11 | $20\text{ m}$ | Máscara oficial de nubes, sombras, nieve y agua |

### 2.2 Sensor Menut VNIR (NewSpace / ICGC / Open Cosmos)
Opera a resolución submétrica de $4.75\text{ m}$, empaquetando 7 bandas ópticas en un único archivo COG (`visual.tif`):

| Banda | Canal VNIR | Longitud de Onda ($\lambda$) | Resolución Nativa | Función en el Algoritmo |
| :--- | :--- | :--- | :--- | :--- |
| **Banda 1** | Azul (BLU) | $\sim 490\text{ nm}$ | $4.75\text{ m}$ | Composición RGB, test de blancura y filtro de neblina (HOT) |
| **Banda 2** | Verde (GRN) | $\sim 560\text{ nm}$ | $4.75\text{ m}$ | Pico de agua pura, NDWI y línea base de turbidez |
| **Banda 3** | Rojo (RED) | $\sim 665\text{ nm}$ | $4.75\text{ m}$ | Absorción de clorofila, NDTI y exceso de rojo ($\Delta\text{Red}$) |
| **Banda 4** | RedEdge 1 (RE1) | $\sim 705\text{ nm}$ | $4.75\text{ m}$ | Reflectancia celular de fitoplancton para NDCI |
| **Banda 5** | RedEdge 2 (RE2) | $\sim 740\text{ nm}$ | $4.75\text{ m}$ | Transición borde rojo |
| **Banda 6** | RedEdge 3 (RE3) | $\sim 783\text{ nm}$ | $4.75\text{ m}$ | Transición al infrarrojo cercano |
| **Banda 7** | Infrarrojo Cercano (NIR) | $\sim 842\text{ nm}$ | $4.75\text{ m}$ | Absorción hídrica, discriminación de nubes y FAI |

[←Índice](#índice)

---

## 3 Detección Atmosférica y Máscaras de Nubes

El filtrado atmosférico elimina píxeles con cobertura nubosa, sombras o aerosoles gruesos antes de procesar la calidad del agua.

### 3.1 Sentinel-2: Máscara Sen2Cor SCL
Aprovecha la banda temática precalculada `SCL`:
$$\text{cloud\_mask}_{S2} = \text{p\_scl} \in \{3, 8, 9, 10, 11\}$$
- **Clase 3**: Sombras de nube proyectadas sobre agua o tierra.
- **Clase 8**: Nubes de media probabilidad.
- **Clase 9**: Nubes de alta probabilidad (opacas).
- **Clase 10**: Cirros finos y velos de alta atmósfera.
- **Clase 11**: Nieve o hielo en superficie.

### 3.2 Menut: Filtrado Físico-Óptico en Tiempo Real
Al carecer de máscara precalculada SCL, se aplica discriminación física multiespectral:
1. **Test de Blancura**:
   $$\text{VisMean} = \frac{\rho_{\text{BLU}} + \rho_{\text{GRN}} + \rho_{\text{RED}}}{3} > 0.25 \quad \land \quad \text{Whiteness} < 0.18$$
2. **Reflectancia Infrarroja (NIR Thresholding)**:
   Las masas de agua absorben fuertemente en NIR ($\rho_{\text{NIR}} < 0.15$), mientras que las nubes reflejan intensamente:
   $$\text{is\_opaque\_cloud} = \rho_{\text{NIR}} \ge 0.25$$
3. **Transformación Optimizada de Neblina (HOT)**:
   $$\text{HOT} = \rho_{\text{BLU}} - 0.5 \cdot \rho_{\text{RED}} > 0.15$$
4. **Regla de Exclusión Integrada**:
   $$\text{is\_cloud}_{\text{Menut}} = (\text{VisMean} > 0.25 \land \text{Whiteness} < 0.18) \lor \rho_{\text{NIR}} \ge 0.25 \lor \text{HOT} > 0.15$$

[←Índice](#índice)

---

## 4 Algoritmo de Delineación de Masas de Agua

Para aislar con exactitud el agua y descartar tierra emergida, arena y áreas ribereñas:

### 4.1 Conversión Radiométrica BOA
Los valores digitales enteros se transforman en reflectancias adimensionales en escala $0.0 - 1.0$:
$$\rho_\lambda = \frac{\text{DN}_\lambda}{10000.0}$$

### 4.2 Índices Espectrales de Agua
- **NDWI (McFeeters, 1996)**:
  $$\text{NDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{NIR}}}{\rho_{\text{Green}} + \rho_{\text{NIR}}}$$
- **MNDWI (Xu, 2006)**:
  $$\text{MNDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{SWIR}}}{\rho_{\text{Green}} + \rho_{\text{SWIR}}}$$

### 4.3 Validación según Plataforma
- **Sentinel-2**:
  $$\text{valid\_water}_{S2} = \Big((\text{p\_scl} == 6) \lor \big((\text{NDWI} > 0.02 \lor \text{MNDWI} > 0.05) \land \text{p\_scl} \notin \{4, 5\}\big)\Big) \land \neg \text{cloud\_mask}_{S2}$$
- **Menut**:
  $$\text{valid\_water}_{\text{Menut}} = (\text{NDWI} > 0.02) \land (\rho_{\text{NIR}} < 0.25) \land \neg \text{is\_cloud}_{\text{Menut}}$$

[←Índice](#índice)

---

## 5 Índices Bio-ópticos de Contaminación y Calidad del Agua

Sobre los píxeles donde `valid_water == true`, se calculan cuatro variables físicas:

### 5.1 FAI: Índice de Algas Flotantes (Floating Algae Index, Hu 2009)
Mide la biomasa vegetal acumulada en superficie:
- **Sentinel-2 (con canal SWIR B11)**:
  $$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
  $$\text{FAI}_{S2} = \rho_{B08} - \text{NIR}'$$
- **Menut (adaptado a sensor VNIR sin SWIR)**:
  $$\text{FAI}_{\text{Menut}} = \rho_{\text{NIR}} - \rho_{\text{RED}}$$

### 5.2 NDCI: Índice de Clorofila por Diferencia Normalizada (Mishra & Mishra 2012)
Estima la clorofila-a en aguas túrbidas mediante el ratio entre la absorción en rojo y la dispersión en el borde rojo:
$$\text{NDCI} = \frac{\rho_{\text{RedEdge1}} - \rho_{\text{Red}}}{\rho_{\text{RedEdge1}} + \rho_{\text{Red}}}$$
- Sentinel-2: B05 ($705\text{ nm}$) y B04 ($665\text{ nm}$).
- Menut: Banda 4 RE1 ($705\text{ nm}$) y Banda 3 RED ($665\text{ nm}$).

### 5.3 NDTI: Índice de Turbidez por Diferencia Normalizada (Lacaux et al. 2007)
Aprovecha que los sedimentos inorgánicos en suspensión incrementan fuertemente la reflectancia roja respecto a la verde:
$$\text{NDTI} = \frac{\rho_{\text{Red}} - \rho_{\text{Green}}}{\rho_{\text{Red}} + \rho_{\text{Green}}}$$

### 5.4 Exceso de Rojo Espectral ($\Delta\text{Red}$)
Detecta anomalías de coloración atípica provocadas por vertidos químicos industriales o drenaje de sales de hierro sin actividad fotosintética:
$$\Delta\text{Red} = \rho_{\text{Red}} - \rho_{\text{Green}}$$

[←Índice](#índice)

---

## 6 Calibración Adaptativa Dinámica (Percentiles Estadísticos)

- ***Principio Científico***: Las variaciones del ángulo cenital solar estacional y los residuos atmosféricos impiden el empleo de umbrales fijos universales.
- ***Estrategia Dinámica del Algoritmo***:
    - Se extrae la distribución estadística de los índices **exclusivamente sobre los píxeles de agua válidos**:
        - $\text{thr\_algae} = \text{Percentil}_{95}(\text{FAI})$: Aísla el $5\%$ superior con proliferación más severa de algas en superficie.
        - $\text{thr\_chl} = \text{Percentil}_{85}(\text{NDCI})$: Aísla el $15\%$ superior con mayor densidad de fitoplancton en columna.
        - $\text{thr\_turb} = \text{Percentil}_{85}(\text{NDTI})$: Aísla el $15\%$ superior con mayor carga sedimentaria.
        - $\text{thr\_red} = \text{Percentil}_{85}(\Delta\text{Red})$: Aísla el $15\%$ con mayor exceso anómalo de reflectancia roja.

[←Índice](#índice)

---

## 7 Jerarquía de Clasificación y Matriz Espectral (Clases 0 a 5)

Cada píxel del área de interés se clasifica en una de las 6 categorías temáticas exclusivas:

| Código | Categoría | Color | Signatura Espectral Determinante | Significado Ambiental / Físico |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Fondo / Tierra / Nube** | Transparente | `valid_water == false` | Suelo emergido, vegetación terrestre, sombras o nubes filtradas. |
| **5** | **Anomalía Crítica** | Rojo Oscuro (`#7a0000`) | $\text{NDTI} > \text{thr\_turb} \land \Delta\text{Red} > \text{thr\_red} \land \text{NDCI} < \text{thr\_chl}$ | Turbidez con exceso de rojo sin clorofila. Sugiere vertido químico o lixiviado minero. |
| **4** | **Proliferación de Algas** | Verde Intenso (`#1b8a0a`) | $\text{FAI} > \text{thr\_algae}$ | Biomasa algal flotante en superficie o acumulación macrofítica superficial. |
| **3** | **Clorofila / Eutrofización** | Verde Lima (`#beff6b`) | $\text{NDCI} > \text{thr\_chl}$ | Alta densidad fitoplanctónica en columna de agua. Estado trófico elevado. |
| **2** | **Turbidez Alta** | Naranja (`#e8430f`) | $\text{NDTI} > \text{thr\_turb}$ | Sólidos minerales en suspensión, arrastre de sedimentos o erosión de cuenca. |
| **1** | **Agua Limpia** | Azul Cian (`#2196f3`) | Píxel de agua que no supera los umbrales de alerta | Masa de agua con baja reflectancia en NIR/Rojo, oligotrófica o mesotrófica estándar. |

[←Índice](#índice)

---

## 8 Referencias Científicas Arbitradas

1. **McFeeters, S. K. (1996)**. *The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features*. International Journal of Remote Sensing, 17(7), 1425-1432. [DOI: 10.1080/01431169608948714](https://doi.org/10.1080/01431169608948714).
2. **Xu, H. (2006)**. *Modification of normalised difference water index (NDWI) to enhance open water features in remotely sensed imagery*. International Journal of Remote Sensing, 27(14), 3025-3033. [DOI: 10.1080/01431160600589179](https://doi.org/10.1080/01431160600589179).
3. **Hu, C. (2009)**. *A novel ocean color index to detect floating algae in the global oceans*. Remote Sensing of Environment, 113(10), 2118-2129. [DOI: 10.1016/j.rse.2009.05.012](https://doi.org/10.1016/j.rse.2009.05.012).
4. **Mishra, S., & Mishra, D. R. (2012)**. *Normalized difference chlorophyll index: A novel model for normalized surface chlorophyll-a retrieval in turbid productive waters*. Remote Sensing of Environment, 117, 394-406. [DOI: 10.1016/j.rse.2011.10.016](https://doi.org/10.1016/j.rse.2011.10.016).
5. **Lacaux, J. P., et al. (2007)**. *Classification of ponds from high-spatial resolution remote sensing: Application to Rift Valley Fever in Senegal*. Remote Sensing of Environment, 106(1), 66-74. [DOI: 10.1016/j.rse.2006.07.012](https://doi.org/10.1016/j.rse.2006.07.012).
6. **Main-Knorn, M., et al. (2017)**. *Sen2Cor for Sentinel-2*. Image and Signal Processing for Remote Sensing XXIII, Proc. SPIE 10427, 1042704. [DOI: 10.1117/12.2278218](https://doi.org/10.1117/12.2278218).

[←Índice](#índice)

---

## 9 Próximos pasos

- Consultar la guía de implementación de nubes y clasificación en [003_procesamiento_satelital_nubes_mascaras_clasificacion.md](./003_procesamiento_satelital_nubes_mascaras_clasificacion.md).
- Revisar la resolución del caso Roses en [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md).
- Consultar el motor ràster en [processor.rs](../../008_water_quality_api_rust/src/processor.rs).
- Consultar el índice de documentación en [README.md](./README.md).

[←Índice](#índice)
