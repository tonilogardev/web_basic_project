# Especificació de l'Algorisme de Qualitat de l'Aigua i Emmascarament SCL de Sentinel-2

## Índex

1. [Declaració del problema i evidència visual](#1-declaració-del-problema-i-evidència-visual)
2. [Arquitectura del pipeline de processament](#2-arquitectura-del-pipeline-de-processament)
3. [Finestrament espacial i reprojecció de coordenades](#3-finestrament-espacial-i-reprojecció-de-coordenades)
4. [Emmascarament d'aigua i filtratge SCL de núvols i terra](#4-emmascarament-daigua-i-filtratge-scl-de-núvols-i-terra)
5. [Formulació dels índexs espectrals de contaminació](#5-formulació-dels-índexs-espectrals-de-contaminació)
6. [Llindars de percentils dinàmics i jerarquia de classificació](#6-llindars-de-percentils-dinàmics-i-jerarquia-de-classificació)
7. [Diagnosi de la causa arrel: estudi de cas del Golf de Roses](#7-diagnosi-de-la-causa-arrel-estudi-de-cas-del-golf-de-roses)
8. [Accions correctives i solucions implementades](#8-accions-correctives-i-solucions-implementades)
9. [Properes passes](#9-properes-passes)

---

## 1 Declaració del problema i evidència visual

- ***Incidència diagnosticada***: En badies costaneres i zones marines (per exemple, el Golf de Roses, Girona), en executar `Detect Water Pollution`, les tessel·les de satèl·lit en RGB natural es renderitzen correctament, però la capa de classificació de qualitat de l'aigua es mostra totalment transparent o absent sobre el mar.
- ***Evidència visual***:
    - *Figura 1.1: Imatge RGB natural visible en mode "Both", però sense capa visible de classificació de qualitat de l'aigua*:
    ![Roses RGB Both Mode](./img/roses_rgb_both_mode_both.png)
    - *Figura 1.2: En mode de visualització "Water", tot el polígon marí roman completament transparent/buit*:
    ![Roses Water Mode Empty](./img/roses_water_mode_empty.png)
- ***Referències de fitxers***:
    - Veure el controlador del frontend [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts)
    - Veure el processador ràster de Rust [processor.rs](../../008_water_quality_api_rust/src/processor.rs)

[←Índex](#índex)

---

## 2 Arquitectura del pipeline de processament

- ***Flux d'execució***:
    1. L'usuari dibuixa un polígon a la interfície ([MapView.svelte](../src/components/MapView.svelte)).
    2. El frontend llença una petició `POST /api/analyze` amb `{ stac_item_id, bbox: [minLng, minLat, maxLng, maxLat] }`.
    3. El backend de Rust ([main.rs](../../008_water_quality_api_rust/src/main.rs)) resol els enllaços Cloud Optimized GeoTIFF (COG) des del bucket d'AWS S3 `sentinel-cogs`.
    4. GDAL llegeix els buffers de píxels de subfinestres per a les 9 bandes espectrals en paral·lel mitjançant el pool de fils Rayon ([processor.rs](../../008_water_quality_api_rust/src/processor.rs)).
    5. Els píxels es classifiquen en categories `0..5` i s'escriuen al fitxer COG local `classification_*.tif`.
    6. El servidor de tessel·les ([tiler.rs](../../008_water_quality_api_rust/src/tiler.rs)) serveix tessel·les PNG en Web Mercator `{z}/{x}/{y}.png` amb transformació de colors per mapa de paleta.
- ***Bandes requerides***:
    - `B02` (Blau, 490 nm, 10m)
    - `B03` (Verd, 560 nm, 10m)
    - `B04` (Vermell, 665 nm, 10m)
    - `B05` (RedEdge 1, 705 nm, 20m remostrejat a 10m)
    - `B06` (RedEdge 2, 740 nm, 20m remostrejat a 10m)
    - `B08` (NIR Banda Ampla, 842 nm, 10m)
    - `B8A` (NIR Estreta, 865 nm, 20m remostrejat a 10m)
    - `B11` (SWIR 1.6µm, 1610 nm, 20m remostrejat a 10m)
    - `SCL` (Scene Classification Layer, 20m remostrejat a 10m via Veí Més Proper)

[←Índex](#índex)

---

## 3 Finestrament espacial i reprojecció de coordenades

- ***Càlcul de la finestra ràster***:
    - Transforma la capsa delimitadora (bounding box) WGS84 de l'usuari `[minLng, minLat, maxLng, maxLat]` (EPSG:4326) cap al sistema de coordenades natiu UTM del conjunt de dades (ex. EPSG:32631 per a la Zona 31N) emprant GDAL `CoordTransform`.
    - Calcula els desplaçaments en píxels `(win_x, win_y)` i les mides de destí `(win_w, win_h)`:
    ```rust
    let px_min = ((utm_min_x - gt[0]) / gt[1]).floor();
    let py_min = ((utm_max_y - gt[3]) / gt[5]).floor();
    let px_max = ((utm_max_x - gt[0]) / gt[1]).ceil();
    let py_max = ((utm_min_y - gt[3]) / gt[5]).ceil();
    ```
    - Ajusta les coordenades de la finestra als límits físics del ràster:
    ```rust
    let win_x = (px_min as isize).clamp(0, ds_w as isize - 1);
    let win_y = (py_min as isize).clamp(0, ds_h as isize - 1);
    let win_w = ((px_max - px_min) as usize).max(1).min((ds_w as isize - win_x) as usize);
    let win_h = ((py_max - py_min) as usize).max(1).min((ds_h as isize - win_y) as usize);
    ```
- ***Referències de fitxers***:
    - Inspeccionar la lògica de subfinestra a [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L30-L96)

[←Índex](#índex)

---

## 4 Emmascarament d'aigua i filtratge SCL de núvols i terra

- ***Normalització de reflectàncies***:
    - Els Nombres Digitals (DN) de Sentinel-2 L2A es converteixen a reflectància de superfície al fons de l'atmosfera (BOA, Bottom-Of-Atmosphere):
    $$\rho_\lambda = \frac{\text{DN}_\lambda}{10000.0}$$
- ***Fórmules dels índexs d'aigua***:
    - **NDWI** (Índex d'Aigua per Diferència Normalitzada, McFeeters):
    $$\text{NDWI} = \frac{\rho_{B03} - \rho_{B08}}{\rho_{B03} + \rho_{B08}}$$
    - **MNDWI** (Índex d'Aigua Modificat per Diferència Normalitzada, Xu):
    $$\text{MNDWI} = \frac{\rho_{B03} - \rho_{B11}}{\rho_{B03} + \rho_{B11}}$$
- ***Filtratge de la capa de classificació d'escena (SCL)***:
    - Classes oficials de Sentinel-2 L2A Sen2Cor SCL:
        - `0`: SENSE_DADES (NO_DATA)
        - `1`: SATURAT_O_DEFECTUÓS (SATURATED_OR_DEFECTIVE)
        - `2`: PÍXELS_DÀREA_FOSCA (DARK_AREA_PIXELS)
        - `3`: OMBRES_DE_NÚVOLS (CLOUD_SHADOWS)
        - `4`: VEGETACIÓ (VEGETATION)
        - `5`: NO_VEGETAT (Sòl nu / Terreny)
        - `6`: AIGUA (WATER)
        - `7`: NO_CLASSIFICAT (UNCLASSIFIED)
        - `8`: NÚVOLS_PROBABILITAT_MITJANA (CLOUD_MEDIUM_PROBABILITY)
        - `9`: NÚVOLS_PROBABILITAT_ALTA (CLOUD_HIGH_PROBABILITY)
        - `10`: CIRRUS_FINS (THIN_CIRRUS)
        - `11`: NEU_O_GEL (SNOW_OR_ICE)
    - Implementació del filtre:
    ```rust
    let is_scl_water = p_scl == 6;
    let is_index_water = (ndwi > 0.02 || mndwi > 0.05) && !matches!(p_scl, 4 | 5);
    let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
    let valid_water = (is_scl_water || is_index_water) && !cloud_mask;
    ```
- ***Referències de fitxers***:
    - Veure l'avaluació de màscares a [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L371-L376)

[←Índex](#índex)

---

## 5 Formulació dels índexs espectrals de contaminació

Per a tots els píxels vàlids d'aigua (`valid_water == true`), l'algorisme calcula quatre índexs òptics:

1. **Índex d'Algues Flotants (FAI)** (Hu, 2009):
    - Subtracció de la línia de base entre Vermell ($664.6\text{ nm}$), NIR ($832.8\text{ nm}$) i SWIR ($1613.7\text{ nm}$):
    $$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
    $$\text{FAI} = \rho_{B08} - \text{NIR}'$$
2. **Índex de Clorofil·la per Diferència Normalitzada (NDCI)** (Mishra & Mishra, 2012):
    - Empra el pic d'absorció de RedEdge1 ($705\text{ nm}$) enfront del Vermell ($665\text{ nm}$):
    $$\text{NDCI} = \frac{\rho_{B05} - \rho_{B04}}{\rho_{B05} + \rho_{B04}}$$
3. **Índex de Terbolesa per Diferència Normalitzada (NDTI)** (Lacaux et al., 2007):
    - Quantifica la matèria inorgànica en suspensió i sediments mitjançant la relació Vermell/Verd:
    $$\text{NDTI} = \frac{\rho_{B04} - \rho_{B03}}{\rho_{B04} + \rho_{B03}}$$
4. **Índex d'Anomalia per Excés de Vermell**:
    - Detecta abocaments industrials anòmals no clorofil·lians, drenatges àcids i escorrenties químiques:
    $$\Delta\text{Red} = \rho_{B04} - \rho_{B03}$$

[←Índex](#índex)

---

## 6 Llindars de percentils dinàmics i jerarquia de classificació

- ***Calibració dinàmica per AOI***:
    - En lloc d'utilitzar llindars estàtics que fallen sota canvis d'il·luminació estacional, els llindars es calculen dinàmicament sobre els píxels d'aigua vàlids de l'escena:
    ```rust
    let thr_algae = percentile(&mut fai_water, 95.0);
    let thr_chl   = percentile(&mut ndci_water, 85.0);
    let thr_turb  = percentile(&mut ndti_water, 85.0);
    let thr_red   = percentile(&mut red_water, 85.0);
    ```
- ***Jerarquia de l'arbre de decisió***:
    ```
    És valid_water == false?
       ├─ SÍ ➔ Classe 0: Fons / Terra / Núvols (RGBA: 0,0,0,0 Transparent)
       └─ NO ➔ Presenta Excés de Vermell i Terbolesa anòmala sense Clorofil·la?
                  ├─ SÍ ➔ Classe 5: Anomalia Crítica (#7a0000 Vermell Fosc)
                  └─ NO ➔ FAI > P95 (thr_algae)?
                             ├─ SÍ ➔ Classe 4: Proliferació d'Algues Superficials (#1b8a0a Verd Intens)
                             └─ NO ➔ NDCI > P85 (thr_chl)?
                                        ├─ SÍ ➔ Classe 3: Clorofil·la / Eutrofització (#beff6b Verd Llima)
                                        └─ NO ➔ NDTI > P85 (thr_turb)?
                                                   ├─ SÍ ➔ Classe 2: Terbolesa Alta (#e8430f Taronja Rogenc)
                                                   └─ NO ➔ Classe 1: Aigua Neta (#2196f3 Blau Cian)
    ```

[←Índex](#índex)

---

## 7 Diagnosi de la causa arrel: estudi de cas del Golf de Roses

Mitjançant la consulta de l'estat del servidor i l'anàlisi directa dels fitxers ràster GeoTIFF generats, s'han identificat dues causes arrel:

### Causa Arrel A: Frontera de tessel·les MGRS Multi-Grànul (Causa Principal)

1. La passada de satèl·lit `20261025_R008` sobre Roses abasta **dos grànuls MGRS constituents**:
    - `S2A_31TDG_20261025_0_L2A` (grànul occidental, que finalitza al meridià $3^\circ 00' 00''\text{E}$)
    - `S2A_31TEG_20261025_1_L2A` (grànul oriental, que va de $3^\circ 00' 00''\text{E}$ a $4^\circ 00' 00''\text{E}$)
2. El polígon traçat per l'usuari al Golf de Roses es troba entre **$3.11^\circ\text{E}$ i $3.23^\circ\text{E}$**.
3. A [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts#L23):
    ```typescript
    const stacItemId = pass.stacItemId || pass.granules[0]?.id;
    ```
    El frontend enviava arbitràriament `pass.granules[0]` (`31TDG`).
4. **Verificació física del ràster**:
    - Fullejant `/app/public/classification_S2A_31TDG_*.tif`:
      - **Dimensions ràster**: `(alçada: 472, amplada: 6)`
      - L'amplada era de **només 6 píxels** perquè `31TDG` només vorejava la platja d'Empuriabrava a l'oest extrem. El Golf de Roses no existeix dins de `31TDG`.
    - Fullejant `/app/public/classification_S2A_31TEG_*.tif`:
      - **Dimensions ràster**: `(alçada: 610, amplada: 531)`
      - **Píxels classificats**: `136.559` Aigua Neta, `14.535` Terbolesa, `11.543` Clorofil·la, `4.112` Algues, `3.333` Anomalia.
    - **Conclusió**: L'anàlisi s'estava sol·licitant contra el gránul equivocat per a aquest polígon.

### Causa Arrel B: Classificació SCL vs Llindar Òptic NDWI (Causa Secundària)

1. En aigües marines clares i profundes, la manca de clorofil·la i matèria en suspensió produeix una forta absorció a l'infraroig proper ($\rho_{B08} \approx 0.01$). Amb certes correccions atmosfèriques, el Verd ($\rho_{B03}$) pot ser baix, provocant que $\text{NDWI} \le 0.05$.
2. El codi previ exigia:
    ```rust
    let water_mask = ndwi > 0.05 || mndwi > 0.10;
    let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
    let valid_water = water_mask && !cloud_mask;
    ```
3. Ignorava completament la classificació d'escena oficial de Sentinel-2:
    - Si `p_scl == 6` (Aigua), però $\text{NDWI} \le 0.05$, el píxel era descartat com a no-aigua (`valid_water = false`), tornant-se transparent.
    - La classe `6` del fitxer SCL s'ha d'incorporar com a validador explícit d'aigua:
    $$\text{valid\_water} = (\text{p\_scl} == 6 \lor \text{ndwi} > 0.02 \lor \text{mndwi} > 0.05) \land \neg \text{cloud\_mask}$$

[←Índex](#índex)

---

## 8 Accions correctives i solucions implementades

### Solució 1: Selecció geomètrica i anàlisi multi-grànul al frontend

- S'ha actualitzat [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts) per calcular l'àrea d'intersecció geomètrica entre cada grànul de la passada i el polígon de l'usuari.
- Totes les tessel·les constituents que intersequen l'àrea s'analitzen en paral·lel (`Promise.all`), ordenant-les per percentatge de solapament.
- A [MapLayerController.ts](../src/lib/controllers/MapLayerController.ts), cada grànul constituent genera la seva capa ràster de classificació superposada i retallada a MapLibre.

### Solució 2: Integració d'aigua SCL al backend de Rust

- A [processor.rs](../../008_water_quality_api_rust/src/processor.rs), s'ha actualitzat la lògica de `valid_water` per reconèixer directament la classe 6 (`WATER`) del producte SCL Sen2Cor:
```rust
let is_scl_water = p_scl == 6;
let is_index_water = (ndwi > 0.02 || mndwi > 0.05) && !matches!(p_scl, 4 | 5);
let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
let valid_water = (is_scl_water || is_index_water) && !cloud_mask;
```

### Solució 3: Resultats verificats en calent

- Execució de prova sobre el Golf de Roses (553.410 píxels):
  - **Terra / Màscara (Classe 0)**: 259.740 píxels
  - **Aigua Neta (Classe 1)**: 205.775 píxels
  - **Terbolesa Alta (Classe 2)**: 29.245 píxels
  - **Clorofil·la / Eutrofització (Classe 3)**: 38.611 píxels
  - **Proliferació d'Algues (Classe 4)**: 12.552 píxels
  - **Anomalia Crítica (Classe 5)**: 7.487 píxels
- Més de **293.000 píxeles d'aigua calculats** de manera contínua a través de la frontera de la quadrícula MGRS.

[←Índex](#índex)

---

## 9 Properes passes

- [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts): Verificar les mètriques d'agregació en polígons multi-grànul.
- [processor.rs](../../008_water_quality_api_rust/src/processor.rs): Avaluar l'ampliació de màscares per a estuaris amb alts nivells de sedimentació costanera.

[←Índex](#índex)
