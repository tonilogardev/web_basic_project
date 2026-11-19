🌐 **Idioma / Language:** [English](./001_water_quality_scientific_specification.md) · **[Català (Actiu)](#)** · [Español](./001_especificacion_cientifica_calidad_agua.md)

---

# Especificació Científica: Algorisme de Detecció de Qualitat d'Aigua i Contaminació (Sentinel-2 i Menut)

## Índex

1. [Resum Executiu i Fonament Científic](#1-resum-executiu-i-fonament-científic)
2. [Bandes Espectrals: Sentinel-2 MSI i Menut VNIR](#2-bandes-espectrals-sentinel-2-msi-i-menut-vnir)
3. [Detecció Atmosfèrica i Màscares de Núvols](#3-detecció-atmosfèrica-i-màscares-de-núvols)
4. [Algorisme de Delineació de Masses d'Aigua](#4-algorisme-de-delineació-de-masses-daigua)
5. [Índexs Bio-òptics de Contaminació i Qualitat de l'Aigua](#5-índexs-bio-òptics-de-contaminació-i-qualitat-de-laigua)
6. [Calibració Adaptativa Dinàmica (Percentils Estadístics)](#6-calibració-adaptativa-dinàmica-percentils-estadístics)
7. [Jerarquia de Classificació i Matriu Espectral (Classes 0 a 5)](#7-jerarquia-de-classificació-i-matriu-espectral-classes-0-a-5)
8. [Referències Científiques Arbitrades](#8-referències-científiques-arbitrades)
9. [Propers passos](#9-propers-passos)

---

## 1 Resum Executiu i Fonament Científic

- ***Objectiu Tècnic***: Avaluar l'estat tròfic, la terbolesa per sediments i anomalies contaminants en masses d'aigua continentals i costaneres a resolució de $10\text{ m}$ (Sentinel-2) i $4.75\text{ m}$ (Menut) mitjançant teledetecció òptica multiespectral.
- ***Fonament Bio-òptic***:
    - L'aigua neta pura absorbeix fortament la radiació a l'infraroig proper (NIR) i d'ona curta (SWIR), mentre presenta el pic de reflectància en l'espectre visible (blau i verd).
    - La presència de fitoplàncton (clorofil·la-a), sòlids inorgànics en suspensió (sediments) o biomassa flotant altera la corba de reflectància espectral en longituds d'ona diagnòstiques.
- ***Rigor i Validesa***:
    - L'algorisme implementa formulacions validades per la comunitat científica internacional (McFeeters, Xu, Hu, Mishra, Lacaux), combinades amb calibració adaptativa per percentils per garantir robustesa davant de variacions estacionals d'angle zenital solar i correcció atmosfèrica.
- ***Referències de Fitxers***:
    - Motor ràster principal en Rust: [processor.rs](../../008_water_quality_api_rust/src/processor.rs)
    - Manual tècnic de processament i núvols: [003_procesamiento_satelital_nubes_mascaras_clasificacion.md](./003_procesamiento_satelital_nubes_mascaras_clasificacion.md)
    - Model de dades i codificació de classes: [water.model.ts](../src/lib/models/water.model.ts)

[←Índex](#índex)

---

## 2 Bandes Espectrals: Sentinel-2 MSI i Menut VNIR

El sistema processa productes **Nivell-2A (L2A)** corregits atmosfèricament a reflectància de superfície al fons de l'atmosfera (BOA, Bottom-of-Atmosphere):

### 2.1 Sensor Sentinel-2 MSI (Copernicus / ESA)
Opera a resolucions de $10\text{ m}$ a $20\text{ m}$, distribuint cada canal en fitxers COG individuals:

| Banda | Nom del Canal | Longitud d'Ona Central ($\lambda$) | Amplada de Banda ($\Delta\lambda$) | Resolució Nativa | Funció a l'Algorisme |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B02** | Blau (Blue) | $490\text{ nm}$ | $66\text{ nm}$ | $10\text{ m}$ | Reflectància base i visualització RGB |
| **B03** | Verd (Green) | $560\text{ nm}$ | $36\text{ nm}$ | $10\text{ m}$ | Pic de reflectància de l'aigua i quocient NDWI |
| **B04** | Vermell (Red) | $665\text{ nm}$ | $31\text{ nm}$ | $10\text{ m}$ | Absorció de clorofil·la i pic de terbolesa (NDTI) |
| **B05** | RedEdge 1 | $705\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ | Reflectància cel·lular de fitoplàncton (NDCI) |
| **B06** | RedEdge 2 | $740\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ | Control de transició espectral de vora vermella |
| **B08** | Infraroig Proper (NIR) | $842\text{ nm}$ | $115\text{ nm}$ | $10\text{ m}$ | Absorció d'aigua / detecció de floracions (FAI) |
| **B8A** | NIR Estret | $865\text{ nm}$ | $21\text{ nm}$ | $20\text{ m}$ | Control d'absorció atmosfèrica de vapor d'aigua |
| **B11** | Infraroig d'Ona Curta (SWIR) | $1610\text{ nm}$ | $91\text{ nm}$ | $20\text{ m}$ | Separació aigua/terra (MNDWI) i línia base FAI |
| **SCL** | Scene Classification Layer | Classificació temàtica | Categories 0-11 | $20\text{ m}$ | Màscara oficial de núvols, ombres, neu i aigua |

### 2.2 Sensor Menut VNIR (NewSpace / ICGC / Open Cosmos)
Opera a resolució submètrica de $4.75\text{ m}$, empaquetant 7 bandes òptiques en un únic fitxer COG (`visual.tif`):

| Banda | Canal VNIR | Longitud d'Ona ($\lambda$) | Resolució Nativa | Funció a l'Algorisme |
| :--- | :--- | :--- | :--- | :--- |
| **Banda 1** | Blau (BLU) | $\sim 490\text{ nm}$ | $4.75\text{ m}$ | Composició RGB, test de blancor i filtratge de calitja (HOT) |
| **Banda 2** | Verd (GRN) | $\sim 560\text{ nm}$ | $4.75\text{ m}$ | Pic d'aigua neta, NDWI i línia base de terbolesa |
| **Banda 3** | Vermell (RED) | $\sim 665\text{ nm}$ | $4.75\text{ m}$ | Absorció de clorofil·la, NDTI i excés de vermell ($\Delta\text{Red}$) |
| **Banda 4** | RedEdge 1 (RE1) | $\sim 705\text{ nm}$ | $4.75\text{ m}$ | Reflectància cel·lular de fitoplàncton per a NDCI |
| **Banda 5** | RedEdge 2 (RE2) | $\sim 740\text{ nm}$ | $4.75\text{ m}$ | Transició de vora vermella |
| **Banda 6** | RedEdge 3 (RE3) | $\sim 783\text{ nm}$ | $4.75\text{ m}$ | Transició a l'infraroig proper |
| **Banda 7** | Infraroig Proper (NIR) | $\sim 842\text{ nm}$ | $4.75\text{ m}$ | Absorció hídrica, discriminació de núvols i FAI |

[←Índex](#índex)

---

## 3 Detecció Atmosfèrica i Màscares de Núvols

El filtratge atmosfèric elimina píxels afectats per cobertura de núvols, ombres o aerosols abans de processar la qualitat de l'aigua.

### 3.1 Sentinel-2: Màscara Sen2Cor SCL
Aprofita la banda temàtica precalculada `SCL`:
$$\text{cloud\_mask}_{S2} = \text{p\_scl} \in \{3, 8, 9, 10, 11\}$$
- **Classe 3**: Ombres de núvol projectades sobre aigua o terra.
- **Classe 8**: Núvols de probabilitat mitjana.
- **Classe 9**: Núvols de probabilitat alta (opacs).
- **Classe 10**: Cirrus fins i vels d'alta atmosfera.
- **Classe 11**: Neu o gel a la superfície.

### 3.2 Menut: Filtratge Físic-Òptic en Temps Real
Com que no disposa de màscara precalculada SCL, s'aplica una discriminació física multiespectral:
1. **Test de Blancor**:
   $$\text{VisMean} = \frac{\rho_{\text{BLU}} + \rho_{\text{GRN}} + \rho_{\text{RED}}}{3} > 0.25 \quad \land \quad \text{Whiteness} < 0.18$$
2. **Reflectància Infraroja (NIR Thresholding)**:
   L'aigua absorbeix fortament en NIR ($\rho_{\text{NIR}} < 0.15$), mentre que els núvols reflecteixen intensament:
   $$\text{is\_opaque\_cloud} = \rho_{\text{NIR}} \ge 0.25$$
3. **Transformació Optimitzada de Calitja (HOT)**:
   $$\text{HOT} = \rho_{\text{BLU}} - 0.5 \cdot \rho_{\text{RED}} > 0.15$$
4. **Regla d'Exclusió Integrada**:
   $$\text{is\_cloud}_{\text{Menut}} = (\text{VisMean} > 0.25 \land \text{Whiteness} < 0.18) \lor \rho_{\text{NIR}} \ge 0.25 \lor \text{HOT} > 0.15$$

[←Índex](#índex)

---

## 4 Algorisme de Delineació de Masses d'Aigua

Per aïllar amb precisió l'aigua i descartar terra emergida, sorra i zones de ribera:

### 4.1 Conversió Radiomètrica BOA
Els valors digitals enters es transformen en reflectàncies adimensionals:
$$\rho_\lambda = \frac{\text{DN}_\lambda}{10000.0}$$

### 4.2 Índexs Espectrals d'Aigua
- **NDWI (McFeeters, 1996)**:
  $$\text{NDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{NIR}}}{\rho_{\text{Green}} + \rho_{\text{NIR}}}$$
- **MNDWI (Xu, 2006)**:
  $$\text{MNDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{SWIR}}}{\rho_{\text{Green}} + \rho_{\text{SWIR}}}$$

### 4.3 Validació segons Plataforma
- **Sentinel-2**:
  $$\text{valid\_water}_{S2} = \Big((\text{p\_scl} == 6) \lor \big((\text{NDWI} > 0.02 \lor \text{MNDWI} > 0.05) \land \text{p\_scl} \notin \{4, 5\}\Big)\Big) \land \neg \text{cloud\_mask}_{S2}$$
- **Menut**:
  $$\text{valid\_water}_{\text{Menut}} = (\text{NDWI} > 0.02) \land (\rho_{\text{NIR}} < 0.25) \land \neg \text{is\_cloud}_{\text{Menut}}$$

[←Índex](#índex)

---

## 5 Índexs Bio-òptics de Contaminació i Qualitat de l'Aigua

Sobre els píxels on `valid_water == true`, es calculen quatre variables físiques:

### 5.1 FAI: Índex d'Algues Flotants (Floating Algae Index, Hu 2009)
Mesura la biomassa vegetal acumulada a la superfície:
- **Sentinel-2 (amb canal SWIR B11)**:
  $$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
  $$\text{FAI}_{S2} = \rho_{B08} - \text{NIR}'$$
- **Menut (adaptat a sensor VNIR sense SWIR)**:
  $$\text{FAI}_{\text{Menut}} = \rho_{\text{NIR}} - \rho_{\text{RED}}$$

### 5.2 NDCI: Índex de Clorofil·la per Diferència Normalitzada (Mishra & Mishra 2012)
Estima la clorofil·la-a en aigües tèrboles mitjançant el quocient entre l'absorció en vermell i la dispersió a la vora vermella:
$$\text{NDCI} = \frac{\rho_{\text{RedEdge1}} - \rho_{\text{Red}}}{\rho_{\text{RedEdge1}} + \rho_{\text{Red}}}$$
- Sentinel-2: B05 ($705\text{ nm}$) i B04 ($665\text{ nm}$).
- Menut: Banda 4 RE1 ($705\text{ nm}$) i Banda 3 RED ($665\text{ nm}$).

### 5.3 NDTI: Índex de Terbolesa per Diferència Normalitzada (Lacaux et al. 2007)
Aprofita que els sediments inorgànics en suspensió incrementen fortament la reflectància vermella respecte a la verda:
$$\text{NDTI} = \frac{\rho_{\text{Red}} - \rho_{\text{Green}}}{\rho_{\text{Red}} + \rho_{\text{Green}}}$$

### 5.4 Excés de Vermell Espectral ($\Delta\text{Red}$)
Detecta anomalies de coloració atípica provocades per abocaments químics industrials o drenatge de sals de ferro sense activitat fotosintètica:
$$\Delta\text{Red} = \rho_{\text{Red}} - \rho_{\text{Green}}$$

[←Índex](#índex)

---

## 6 Calibració Adaptativa Dinàmica (Percentils Estadístics)

- ***Principi Científic***: Les variacions de l'angle zenital solar estacional i els residus atmosfèrics impedeixen l'ús de llindars fixos universals.
- ***Estratègia Dinàmica de l'Algorisme***:
    - S'extreu la distribució estadística dels índexs **exclusivament sobre els píxels d'aigua vàlids**:
        - $\text{thr\_algae} = \text{Percentil}_{95}(\text{FAI})$: Aïlla el $5\%$ superior amb proliferació més severa d'algues a la superfície.
        - $\text{thr\_chl} = \text{Percentil}_{85}(\text{NDCI})$: Aïlla el $15\%$ superior amb major densitat de fitoplàncton en columna.
        - $\text{thr\_turb} = \text{Percentil}_{85}(\text{NDTI})$: Aïlla el $15\%$ superior amb major càrrega sedimentària.
        - $\text{thr\_red} = \text{Percentil}_{85}(\Delta\text{Red})$: Aïlla el $15\%$ amb major excés anòmal de reflectància vermella.

[←Índex](#índex)

---

## 7 Jerarquia de Classificació i Matriu Espectral (Classes 0 a 5)

Cada píxel de l'àrea d'interès es classifica en una de les 6 categories temàtiques exclusives:

| Codi | Categoria | Color | Signatura Espectral Determinant | Significat Ambiental / Físic |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Fons / Terra / Núvol** | Transparent | `valid_water == false` | Sòl emergir, vegetació terrestre, ombres o núvols filtrats. |
| **5** | **Anomalia Crítica** | Vermell Fosc (`#7a0000`) | $\text{NDTI} > \text{thr\_turb} \land \Delta\text{Red} > \text{thr\_red} \land \text{NDCI} < \text{thr\_chl}$ | Terbolesa amb excés de vermell sense clorofil·la. Suggereix abocament químic o lixiviat miner. |
| **4** | **Proliferació d'Algues** | Verd Intens (`#1b8a0a`) | $\text{FAI} > \text{thr\_algae}$ | Biomassa algal flotant en superfície o acumulació macrofítica superficial. |
| **3** | **Clorofil·la / Eutrofització** | Verd Llima (`#beff6b`) | $\text{NDCI} > \text{thr\_chl}$ | Alta densitat fitoplanctònica en columna d'aigua. Estat tròfic elevat. |
| **2** | **Terbolesa Alta** | Taronja (`#e8430f`) | $\text{NDTI} > \text{thr\_turb}$ | Sòlids minerals en suspensió, arrossegament de sediments o erosió de conca. |
| **1** | **Aigua Neta** | Blau Cian (`#2196f3`) | Píxel d'aigua que no supera els llindars d'alerta | Massa d'aigua amb baixa reflectància en NIR/Vermell, oligotròfica o mesotròfica estàndard. |

[←Índex](#índex)

---

## 8 Referències Científiques Arbitrades

1. **McFeeters, S. K. (1996)**. *The use of the Normalized Difference Water Index (NDWI) in the delineation of open water features*. International Journal of Remote Sensing, 17(7), 1425-1432. [DOI: 10.1080/01431169608948714](https://doi.org/10.1080/01431169608948714).
2. **Xu, H. (2006)**. *Modification of normalised difference water index (NDWI) to enhance open water features in remotely sensed imagery*. International Journal of Remote Sensing, 27(14), 3025-3033. [DOI: 10.1080/01431160600589179](https://doi.org/10.1080/01431160600589179).
3. **Hu, C. (2009)**. *A novel ocean color index to detect floating algae in the global oceans*. Remote Sensing of Environment, 113(10), 2118-2129. [DOI: 10.1016/j.rse.2009.05.012](https://doi.org/10.1016/j.rse.2009.05.012).
4. **Mishra, S., & Mishra, D. R. (2012)**. *Normalized difference chlorophyll index: A novel model for normalized surface chlorophyll-a retrieval in turbid productive waters*. Remote Sensing of Environment, 117, 394-406. [DOI: 10.1016/j.rse.2011.10.016](https://doi.org/10.1016/j.rse.2011.10.016).
5. **Lacaux, J. P., et al. (2007)**. *Classification of ponds from high-spatial resolution remote sensing: Application to Rift Valley Fever in Senegal*. Remote Sensing of Environment, 106(1), 66-74. [DOI: 10.1016/j.rse.2006.07.012](https://doi.org/10.1016/j.rse.2006.07.012).
6. **Main-Knorn, M., et al. (2017)**. *Sen2Cor for Sentinel-2*. Image and Signal Processing for Remote Sensing XXIII, Proc. SPIE 10427, 1042704. [DOI: 10.1117/12.2278218](https://doi.org/10.1117/12.2278218).

[←Índex](#índex)

---

## 9 Propers passos

- Consultar la guia d'implementació de núvols i classificació a [003_procesamiento_satelital_nubes_mascaras_clasificacion.md](./003_procesamiento_satelital_nubes_mascaras_clasificacion.md).
- Revisar la resolució del cas Roses a [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md).
- Consultar el motor ràster a [processor.rs](../../008_water_quality_api_rust/src/processor.rs).
- Consultar l'índex de documentació a [README.md](./README.md).

[←Índex](#índex)
