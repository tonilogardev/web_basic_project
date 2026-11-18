🌐 **Idioma / Language:** [English](./001_water_quality_scientific_specification.md) · **[Català (Actiu)](#)** · [Español](./001_especificacion_cientifica_calidad_agua.md)

---

# Especificació Científica: Algorisme de Detecció de Qualitat de l'Aigua i Contaminació (Sentinel-2)

## Índex

1. [Resum Executiu i Base Científica](#1-resum-executiu-i-base-científica)
2. [Bandes Espectrals de Sentinel-2 MSI](#2-bandes-espectrals-de-sentinel-2-msi)
3. [Algorisme de Delineació de Masses d'Aigua](#3-algorisme-de-delineació-de-masses-daigua)
4. [Filtratge Atmosfèric i Màscara de Núvols (SCL)](#4-filtratge-atmosfèric-i-màscara-de-núvols-scl)
5. [Índexs Bio-òptics de Contaminació i Qualitat de l'Aigua](#5-índexs-bio-òptics-de-contaminació-i-qualitat-de-laigua)
6. [Calibració Adaptativa Dinàmica (Percentils)](#6-calibració-adaptativa-dinàmica-percentils)
7. [Jerarquia de Classificació i Matriu Espectral](#7-jerarquia-de-classificació-i-matriu-espectral)
8. [Referències Científiques Arbitrades](#8-referències-científiques-arbitrades)
9. [Properes passes](#9-properes-passes)

---

## 1 Resum Executiu i Base Científica

- ***Objectiu Tècnic***: Avaluar l'estat de qualitat de masses d'aigua continentals i costaneres a una resolució espacial de 10 metres mitjançant teledetecció òptica passiva multispectral.
- ***Fonament Bio-òptic***:
    - L'aigua neta pura absorbeix amb gran intensitat la radiació a l'infraroig proper (NIR) i d'ona curta (SWIR), mentre reflecteix a l'espectre visible (blau i verd).
    - La presència de fitoplàncton (clorofil·la-a), sòlids inorgànics en suspensió (sediments) o biomassa flotant altera significativament la corba de reflectància espectral en longituds d'ona específiques.
- ***Rigor i Validesa***:
    - L'algorisme implementa formulacions validades per la comunitat científica internacional (McFeeters, Xu, Hu, Mishra, Lacaux), combinades amb calibració adaptativa per percentils per garantir robustesa davant de variacions estacionals d'angle solar cenital i correcció atmosfèrica.
- ***Referències de Fitxers***:
    - Procés principal de càlcul ràster: [processor.rs](../../008_water_quality_api_rust/src/processor.rs)
    - Model de dades i codificació de classes: [water.model.ts](../src/lib/models/water.model.ts)

[←Índex](#índex)

---

## 2 Bandes Espectrals de Sentinel-2 MSI

El satèl·lit Sentinel-2 (Agència Espacial Europea, programa Copernicus) transporta el sensor MultiSpectral Instrument (MSI). L'algorisme opera sobre productes **Nivell-2A (L2A)** corregits atmosfèricament a reflectància de superfície al fons de l'atmosfera (BOA, Bottom-of-Atmosphere):

| Banda | Nom del Canal | Longitud d'Ona Central ($\lambda$) | Amplada de Banda ($\Delta\lambda$) | Resolució Nativa | Funció a l'Algorisme |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B02** | Blau (Blue) | $490\text{ nm}$ | $66\text{ nm}$ | $10\text{ m}$ | Reflectància base i visualització RGB |
| **B03** | Verd (Green) | $560\text{ nm}$ | $36\text{ nm}$ | $10\text{ m}$ | Pic de reflectància de l'aigua i quocient NDWI |
| **B04** | Vermell (Red) | $665\text{ nm}$ | $31\text{ nm}$ | $10\text{ m}$ | Absorció de clorofil·la i pic de terbolesa (NDTI) |
| **B05** | RedEdge 1 | $705\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ (remostrejat a $10\text{ m}$) | Reflectància cel·lular de fitoplàncton (NDCI) |
| **B06** | RedEdge 2 | $740\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ (remostrejat a $10\text{ m}$) | Control de transició espectral de vora vermella |
| **B08** | Infraroig Proper (NIR) | $842\text{ nm}$ | $115\text{ nm}$ | $10\text{ m}$ | Absorció d'aigua / detecció de floracions (FAI) |
| **B8A** | NIR Estret | $865\text{ nm}$ | $21\text{ nm}$ | $20\text{ m}$ (remostrejat a $10\text{ m}$) | Control d'absorció atmosfèrica de vapor d'aigua |
| **B11** | Infraroig d'Ona Curta (SWIR) | $1610\text{ nm}$ | $91\text{ nm}$ | $20\text{ m}$ (remostrejat a $10\text{ m}$) | Separació aigua/terra i línia base de FAI |
| **SCL** | Scene Classification Layer | Classificació temàtica | Categories 0-11 | $20\text{ m}$ (remostrejat a $10\text{ m}$) | Màscara de núvols, ombres, neu i aigua |

[←Índex](#índex)

---

## 3 Algorisme de Delineació de Masses d'Aigua

Per aïllar amb precisió l'aigua i descartar terra emergida, platges i zones de ribera, l'algorisme utilitza un discriminador dual espectral i temàtic:

### 3.1 Conversió Radiomètrica BOA
Els valors digitals es transformen en reflectàncies adimensionals en escala $0.0 - 1.0$:
$$\rho_\lambda = \frac{\text{DN}_\lambda}{10000.0}$$

### 3.2 Índex NDWI (McFeeters, 1996)
Explota l'alta reflectància de l'aigua al canal verd i la seva absorció total a l'infraroig proper:
$$\text{NDWI} = \frac{\rho_{B03} - \rho_{B08}}{\rho_{B03} + \rho_{B08}}$$

### 3.3 Índex MNDWI (Xu, 2006)
Substitueix NIR per SWIR-1 per suprimir falsos positius en zones urbanes, infraestructures i sòls nus:
$$\text{MNDWI} = \frac{\rho_{B03} - \rho_{B11}}{\rho_{B03} + \rho_{B11}}$$

### 3.4 Condició de Validació Híbrida
Un píxel es valida com a superfície aquàtica si compleix la condició espectral de reflectància positiva o si està catalogat com a aigua per la classificació d'escena oficial de Copernicus:
$$\text{is\_water} = (\text{p\_scl} == 6) \lor \Big(\big(\text{NDWI} > 0.02 \lor \text{MNDWI} > 0.05\big) \land \text{p\_scl} \notin \{4, 5\}\Big)$$
On la classe SCL 4 representa vegetació terrestre densa i la classe SCL 5 representa sòl no vegetat.

[←Índex](#índex)

---

## 4 Filtratge Atmosfèric i Màscara de Núvols (SCL)

El producte Sentinel-2 L2A incorpora una capa de classificació espectral generada per l'algorisme de transferència radiativa **Sen2Cor** de l'ESA.

### 4.1 Categories SCL i Regla d'Exclusió
L'algorisme emmascara de forma estricta tots els píxels afectats per cobertura de núvols, ombres projectades o elements reflectors d'alta interferència:

$$\text{cloud\_mask} = \text{p\_scl} \in \{3, 8, 9, 10, 11\}$$

- **Classe 3**: Ombres de núvols projectades sobre aigua o terra.
- **Classe 8**: Núvols de probabilitat mitjana.
- **Classe 9**: Núvols de probabilitat alta (opacs).
- **Classe 10**: Cirrus fins i vels d'alta atmosfera.
- **Classe 11**: Neu o gel a la superfície.

Píxels validats per a l'anàlisi espectral bio-òptica:
$$\text{valid\_water} = \text{is\_water} \land \neg \text{cloud\_mask}$$

[←Índex](#índex)

---

## 5 Índexs Bio-òptics de Contaminació i Qualitat de l'Aigua

Sobre els píxels que compleixen `valid_water == true`, es calculen quatre variables físiques independents:

### 5.1 FAI: Índex d'Algues Flotants (Floating Algae Index, Hu 2009)
Dissenyat específicament per mitigar els efectes del reflex solar (sun-glint) i aerosols atmosfèrics. Mesura la reflectància residual a NIR respecte a una línia base recta traçada entre el Vermell i el SWIR-1:

$$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{\lambda_{B08} - \lambda_{B04}}{\lambda_{B11} - \lambda_{B04}}$$
$$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
$$\text{FAI} = \rho_{B08} - \text{NIR}'$$

- **Interpretació**: Valors alts positius indiquen presència de biomassa flotant acumulada en superfície (escumes de cianobacteris, macroalgues o llentilla d'aigua).

### 5.2 NDCI: Índex de Clorofil·la per Diferència Normalitzada (Mishra & Mishra 2012)
Dissenyat per estimar la concentració de clorofil·la-a en aigües tèrboles productives (continentals i d'estuari). Aprofita l'absorció de pigments fotosintètics al vermell ($665\text{ nm}$) i el pic de dispersió cel·lular a la vora vermella ($705\text{ nm}$):

$$\text{NDCI} = \frac{\rho_{B05} - \rho_{B04}}{\rho_{B05} + \rho_{B04}}$$

- **Interpretació**: Correlaciona directament amb la biomassa fitoplanctònica subsuperficial i l'estat d'eutrofització del cos d'aigua.

### 5.3 NDTI: Índex de Terbolesa per Diferència Normalitzada (Lacaux et al. 2007)
Aprofita que els sediments minerals inorgànics en suspensió incrementen significativament la reflectància a la banda vermella respecte a la verda:

$$\text{NDTI} = \frac{\rho_{B04} - \rho_{B03}}{\rho_{B04} + \rho_{B03}}$$

- **Interpretació**: Quantifica la concentració de material particulat en suspensió (SPM) i sediments arrossegats per descàrregues fluvials o erosió.

### 5.4 Excés de Vermell Espectral ($\Delta\text{Red}$)
Mesura la divergència cromàtica anòmala on el canal vermell supera notablement el canal verd sense correspondre's amb una signatura algal:

$$\Delta\text{Red} = \rho_{B04} - \rho_{B03}$$

- **Interpretació**: Detecta efluents químics, abocaments miners amb òxids de ferro o descàrregues industrials de coloració atípica.

[←Índex](#índex)

---

## 6 Calibració Adaptativa Dinàmica (Percentils)

- ***Principi Científic***: En teledetecció aquàtica, els valors absoluts de reflectància varien segons la latitud, l'hora del dia i l'època de l'any. L'ús de llindars estàtics fixos provoca falses alarmes a l'estiu o desensibilització a l'hivern.
- ***Estratègia Dinàmica de l'Algorisme***:
    - S'extreu la distribució estadística dels índexs calculats **exclusivament sobre els píxels d'aigua vàlids de l'àrea d'interès**.
    - Es calculen percentils estadístics robustos que aïllen els valors extrems:
        - $\text{thr\_algae} = \text{Percentil}_{95}(\text{FAI})$: Identifica el $5\%$ superior amb proliferació més severa de biomassa superficial.
        - $\text{thr\_chl} = \text{Percentil}_{85}(\text{NDCI})$: Aïlla el $15\%$ superior amb major concentració de clorofil·la.
        - $\text{thr\_turb} = \text{Percentil}_{85}(\text{NDTI})$: Aïlla el $15\%$ superior amb major càrrega sedimentària.
        - $\text{thr\_red} = \text{Percentil}_{85}(\Delta\text{Red})$: Aïlla les signatures amb excés anòmal de reflectància vermella.

[←Índex](#índex)

---

## 7 Jerarquia de Classificació i Matriu Espectral

Cada píxel del producte resultant es classifica en una de les 6 categories exclusives segons el següent arbre de decisió bio-òptic:

| Codi | Categoria | Color | Signatura Espectral Determinant | Significat Ambiental / Físic |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Fons / Terra / Núvol** | Transparent | `valid_water == false` | Sòl, cobertura vegetal, núvols o ombres. |
| **5** | **Anomalia Crítica** | Vermell Fosc (`#7a0000`) | $\text{NDTI} > \text{thr\_turb} \land \Delta\text{Red} > \text{thr\_red} \land \text{NDCI} < \text{thr\_chl}$ | Terbolesa amb fort excés de vermell sense clorofil·la. Suggereix abocament químic, escorrentia mineral o lixiviat industrial. |
| **4** | **Proliferació d'Algues** | Verd Intens (`#1b8a0a`) | $\text{FAI} > \text{thr\_algae}$ | Biomassa algal flotant en superfície o acumulació macrofítica superficial. |
| **3** | **Clorofil·la / Eutrofització** | Verd Llima (`#beff6b`) | $\text{NDCI} > \text{thr\_chl}$ | Alta densitat fitoplanctònica a la columna d'aigua. Estat tròfic elevat. |
| **2** | **Terbolesa Alta** | Taronja (`#e8430f`) | $\text{NDTI} > \text{thr\_turb}$ | Sòlids minerals en suspensió, arrossegament de sediments o erosió de conca. |
| **1** | **Aigua Neta** | Blau Cian (`#2196f3`) | Píxel d'aigua que no supera els llindars d'alerta | Massa d'aigua amb baixa reflectància a NIR/Vermell, oligotròfica o mesotròfica estàndard. |

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

## 9 Properes passes

- Consultar l'arquitectura del backend a [processor.rs](../../008_water_quality_api_rust/src/processor.rs).
- Consultar l'informe tècnic del cas Roses a [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md).

[←Índex](#índex)
