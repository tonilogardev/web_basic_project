# Manual Técnico: Detección de Nubes, Máscara Óptica y Clasificación de Píxeles para Contaminación de Agua (Sentinel-2 y Menut)

## Índice

1. [Arquitectura General y Comparativa de Sensores](#1-arquitectura-general-y-comparativa-de-sensores)
2. [Ingesta Ràster y Lectura Parcial HTTP 206 (GDAL /vsicurl/)](#2-ingesta-ràster-y-lectura-parcial-http-206-gdal-vsicurl)
3. [Detección y Enmascaramiento de Nubes](#3-detección-y-enmascaramiento-de-nubes)
4. [Delineación y Extracción de Superficies de Agua](#4-delineación-y-extracción-de-superficies-de-agua)
5. [Cálculo Paralelo de Índices Bio-ópticos de Contaminación](#5-cálculo-paralelo-de-índices-bio-ópticos-de-contaminación)
6. [Calibración Adaptativa Dinámica por Percentiles Estadísticos](#6-calibración-adaptativa-dinámica-por-percentiles-estadísticos)
7. [Matriz de Clasificación Jerárquica de Píxeles (Clases 0 a 5)](#7-matriz-de-clasificación-jerárquica-de-píxeles-clases-0-a-5)
8. [Generación de Salida GeoTIFF y Renderizado GPU en MapLibre](#8-generación-de-salida-geotiff-y-renderizado-gpu-en-maplibre)
9. [Próximos pasos](#9-próximos-pasos)

---

## 1 Arquitectura General y Comparativa de Sensores

- ***Principio Operativo***: El sistema procesa imágenes satelitales ópticas multiespectrales para diagnosticar la calidad del agua y clasificar contaminantes en masas hídricas costeras y continentales sin descargas masivas de archivos completos.
- ***Soporte Multi-Sensor***:
    - **Sentinel-2 MSI (Copernicus / ESA)**: Satélite de observación terrestre global. Resolución espacial de $10\text{ m}$ a $20\text{ m}$. Cada banda espectral y la capa de clasificación de escena (SCL) se almacenan en archivos Cloud-Optimized GeoTIFF (COG) independientes en AWS S3.
    - **Menut VNIR (NewSpace / ICGC / Open Cosmos)**: Nanosatélite de órbita baja (LEO). Resolución espacial submétrica de $4.75\text{ m}$. Todas las 7 bandas ópticas del sensor VNIR se empaquetan en un único archivo COG (`visual.tif`) alojado en el repositorio oficial del Institut Cartogràfic i Geològic de Catalunya (ICGC).

| Parámetro | Sentinel-2 L2A (Copernicus) | Menut L2A (ICGC NewSpace) |
| :--- | :--- | :--- |
| **Resolución Espacial (GSD)** | $10\text{ m}$ (Visible/NIR) / $20\text{ m}$ (RedEdge/SWIR) | $4.75\text{ m}$ (VNIR nativo) |
| **Estructura COG** | 1 archivo `.tif` por cada banda (multi-archivo) | 1 único archivo `.tif` con 7 canales multiplexados |
| **Repositorio STAC** | AWS Earth Search (`sentinel-2-l2a`) | ICGC STAC API (`menut-l2a`) |
| **Canales Utilizados** | B02, B03, B04, B05, B06, B08, B8A, B11, SCL | Banda 1 (BLU), 2 (GRN), 3 (RED), 4 (RE1), 7 (NIR) |
| **Máscara de Nubes** | Sen2Cor Scene Classification Layer (SCL) | Algoritmo físico-óptico (Blancura + NIR + HOT) |
| **Infrarrojo Térmico/SWIR** | B11 ($1610\text{ nm}$) disponible | No disponible (sensor limitado a $450 - 900\text{ nm}$) |
| **Frecuencia de Reanálisis** | $5\text{ días}$ (constelación 2A/2B) | Órbitas periódicas bajo demanda sobre Cataluña |
| **Rango Temporal Operativo** | Diciembre de 2015 – Actualidad | Junio de 2023 – Marzo de 2026 |

- ***Referencias de Archivos***:
    - Motor de procesamiento ràster en Rust: [processor.rs](../../008_water_quality_api_rust/src/processor.rs)
    - Cliente STAC de resolución de catálogo: [stac.rs](../../008_water_quality_api_rust/src/stac.rs)
    - Servicio frontend Menut STAC: [MenutStacService.ts](../src/lib/services/MenutStacService.ts)

[←Índice](#índice)

---

## 2 Ingesta Ràster y Lectura Parcial HTTP 206 (GDAL /vsicurl/)

- ***Regla de Arquitectura***: Ninguna escena satelital completa (de 500 MB a 2 GB) se descarga al servidor. Solo se leen los bytes correspondientes a la ventana geográfica (`bbox`) del polígono del usuario.

### 2.1 Flujo para Sentinel-2 (Múltiples COGs en AWS S3)
- Abrir la banda base B03 (Verde) con el prefijo `/vsicurl/` en [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L355-L359).
- Calcular la ventana ràster en píxeles (`WindowInfo`) proyectando el `bbox` en coordenadas UTM de la escena.
- Descargar en paralelo con Rayon las 9 bandas necesarias mediante peticiones HTTP Range parciales (código 206):
    ```rust
    let bands_res: Result<Vec<Vec<f32>>, String> = [
        (b02_href, ResampleAlg::Bilinear),
        (b03_href, ResampleAlg::Bilinear),
        (b04_href, ResampleAlg::Bilinear),
        (b08_href, ResampleAlg::Bilinear),
        (b05_href, ResampleAlg::Bilinear),
        (b06_href, ResampleAlg::Bilinear),
        (b8a_href, ResampleAlg::Bilinear),
        (b11_href, ResampleAlg::Bilinear),
        (scl_href, ResampleAlg::NearestNeighbour),
    ]
    .par_iter()
    .map(|(href, alg)| read_band(href, &window_info, *alg))
    .collect();
    ```

### 2.2 Flujo para Menut (Único COG de 7 bandas en ICGC)
- Abrir el archivo único `visual.tif` mediante `/vsicurl/` en [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L540-L542).
- Calcular la ventana espacial para el `bbox` del cliente.
- Desmultiplexar las bandas espectrales extrayendo secuencialmente los canales ópticos específicos del mismo dataset abierto:
    - **Banda 1**: Azul ($490\text{ nm}$)
    - **Banda 2**: Verde ($560\text{ nm}$)
    - **Banda 3**: Rojo ($665\text{ nm}$)
    - **Banda 4**: Borde Rojo 1 ($705\text{ nm}$)
    - **Banda 7**: Infrarrojo Cercano ($842\text{ nm}$)
- **Doble propósito de las bandas de Menut**:
    - **Análisis de calidad de agua**: Se procesan los canales 1, 2, 3, 4 y 7 para el cálculo de NDTI, NDCI, FAI y $\Delta\text{Red}$.
    - **Visualización RGB de Color Real de fondo**: Se extraen y componen los canales **Banda 3 (Rojo)**, **Banda 2 (Verde)** y **Banda 1 (Azul)** para renderizar la imagen satelital nítida debajo de la capa de píxeles clasificados.
    ```rust
    let b_blue = read_band_from_ds(&ds, 1, &window_info, ResampleAlg::Bilinear)?;
    let b_green = read_band_from_ds(&ds, 2, &window_info, ResampleAlg::Bilinear)?;
    let b_red = read_band_from_ds(&ds, 3, &window_info, ResampleAlg::Bilinear)?;
    let b_re1 = read_band_from_ds(&ds, 4, &window_info, ResampleAlg::Bilinear)?;
    let b_nir = read_band_from_ds(&ds, 7, &window_info, ResampleAlg::Bilinear)?;
    ```

[←Índice](#índice)

---

## 3 Detección y Enmascaramiento de Nubes

El filtrado de interferencias atmosféricas y nubes es el paso crítico previo a cualquier cálculo bio-óptico. Un píxel catalogado como nube falsearía drásticamente los índices de turbidez o clorofila.

### 3.1 Sentinel-2: Máscara Atmosférica Sen2Cor SCL
Sentinel-2 incluye la banda `SCL` (Scene Classification Layer) a $20\text{ m}$ generada por el procesador oficial Sen2Cor de la ESA.
- Regla de exclusión en [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L416):
    $$\text{cloud\_mask}_{S2} = \text{p\_scl} \in \{3, 8, 9, 10, 11\}$$
    - **Clase 3**: Sombras de nube (Cloud shadows).
    - **Clase 8**: Nubes de media probabilidad (Medium probability clouds).
    - **Clase 9**: Nubes de alta probabilidad / opacas (High probability clouds).
    - **Clase 10**: Cirros finos de gran altitud (Thin cirrus).
    - **Clase 11**: Nieve y hielo superficial (Snow / Ice).
- Los píxeles con estas categorías se enmascaran automáticamente asignándoles el valor `valid_water = false`.

### 3.2 Menut: Detección Físico-Óptica en Tiempo Real
El catálogo L2A de Menut en el ICGC no contiene una capa precalculada SCL. El motor implementa una discriminación física multiespectral basada en las propiedades radiométricas del agua frente al vapor condensado y aerosoles:

1. **Test de Blancura y Luminancia Visible**:
   Las nubes son dispersores no selectivos en el espectro visible, mostrando reflectancia alta y balanceada en Azul, Verde y Rojo:
   $$\text{VisMean} = \frac{\rho_{\text{BLU}} + \rho_{\text{GRN}} + \rho_{\text{RED}}}{3}$$
   $$\text{Whiteness} = \sum_{\lambda \in \{\text{BLU, GRN, RED}\}} \frac{|\rho_\lambda - \text{VisMean}|}{\text{VisMean}}$$
   - Condición de nube blanca opaca: $\text{VisMean} > 0.25 \land \text{Whiteness} < 0.18$.

2. **Test de Absorción Infrarroja (NIR Thresholding)**:
   El agua pura o túrbida absorbe intensamente en el NIR ($\rho_{\text{NIR}} < 0.10 - 0.15$). En contraste, las nubes reflejan intensamente en el NIR ($\rho_{\text{NIR}} \ge 0.20$):
   $$\text{is\_opaque\_cloud} = \rho_{\text{NIR}} \ge 0.25$$

3. **Transformación Optimizada de Neblina (HOT - Haze Optimized Transformation)**:
   Aprovecha que en zonas libres de nubes la reflectancia en azul y rojo mantiene una relación lineal constante, mientras que la neblina y cirros incrementan la señal azul:
   $$\text{HOT} = \rho_{\text{BLU}} - 0.5 \cdot \rho_{\text{RED}} > 0.15$$

4. **Regla de Filtrado Integrada en Menut**:
   $$\text{is\_cloud}_{\text{Menut}} = (\text{VisMean} > 0.25 \land \text{Whiteness} < 0.18) \lor \rho_{\text{NIR}} \ge 0.25 \lor \text{HOT} > 0.15$$
   $$\text{valid\_water}_{\text{Menut}} = (\text{NDWI} > 0.02) \land (\rho_{\text{NIR}} < 0.25) \land \neg \text{is\_cloud}_{\text{Menut}}$$

[←Índice](#índice)

---

## 4 Delineación y Extracción de Superficies de Agua

Aislar las masas de agua respecto a riberas, vegetación terrestre, áreas urbanas y arena evita contaminar la muestra estadística.

### 4.1 Sentinel-2: Condición Dual Espectral y Temática
- **NDWI (McFeeters, 1996)**: $\text{NDWI} = \frac{\rho_{B03} - \rho_{B08}}{\rho_{B03} + \rho_{B08}}$
- **MNDWI (Xu, 2006)**: $\text{MNDWI} = \frac{\rho_{B03} - \rho_{B11}}{\rho_{B03} + \rho_{B11}}$
- **Condición Híbrida** en [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L414-L417):
    $$\text{is\_scl\_water} = (\text{p\_scl} == 6)$$
    $$\text{is\_index\_water} = (\text{NDWI} > 0.02 \lor \text{MNDWI} > 0.05) \land \text{p\_scl} \notin \{4, 5\}$$
    $$\text{valid\_water}_{S2} = (\text{is\_scl\_water} \lor \text{is\_index\_water}) \land \neg \text{cloud\_mask}_{S2}$$
    *(Donde SCL 4 es vegetación densa y SCL 5 es suelo desnudo).*

### 4.2 Menut: Discriminador Óptico VNIR
Dado que Menut no dispone de la banda B11 (SWIR) ni de la capa SCL:
- Se evalúa el índice NDWI entre la Banda 2 (Verde) y la Banda 7 (NIR):
    $$\text{NDWI}_{\text{Menut}} = \frac{\rho_{\text{GRN}} - \rho_{\text{NIR}}}{\rho_{\text{GRN}} + \rho_{\text{NIR}}}$$
- Se aplica el límite de corte físico de infrarrojo cercano en [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L579):
    $$\text{valid\_water}_{\text{Menut}} = (\text{NDWI}_{\text{Menut}} > 0.02) \land (\rho_{\text{NIR}} < 0.25)$$

[←Índice](#índice)

---

## 5 Cálculo Paralelo de Índices Bio-ópticos de Contaminación

Sobre todos los píxeles donde `valid_water == true`, el motor calcula cuatro variables diagnósticas independientes:

### 5.1 NDTI (Índice de Turbidez por Diferencia Normalizada, Lacaux et al. 2007)
Cuantifica la concentración de sedimentos minerales inorgánicos y material particulado en suspensión (SPM):
- **Sentinel-2**: $\text{NDTI} = \frac{\rho_{B04} - \rho_{B03}}{\rho_{B04} + \rho_{B03}}$
- **Menut**: $\text{NDTI} = \frac{\rho_{\text{RED}} - \rho_{\text{GRN}}}{\rho_{\text{RED}} + \rho_{\text{GRN}}}$

### 5.2 NDCI (Índice de Clorofila por Diferencia Normalizada, Mishra & Mishra 2012)
Estima la biomasa fitoplanctónica subsuperficial y el nivel de eutrofización mediante el contraste entre la absorción de clorofila-a en el rojo y la dispersión en el borde rojo:
- **Sentinel-2**: $\text{NDCI} = \frac{\rho_{B05} - \rho_{B04}}{\rho_{B05} + \rho_{B04}}$ (empleando B05 RedEdge a $705\text{ nm}$).
- **Menut**: $\text{NDCI} = \frac{\rho_{\text{RE1}} - \rho_{\text{RED}}}{\rho_{\text{RE1}} + \rho_{\text{RED}}}$ (empleando Banda 4 RedEdge-1 a $705\text{ nm}$).

### 5.3 FAI (Índice de Algas Flotantes, Hu 2009)
Detecta acumulaciones de biomasa macrofítica superficial, natas de cianobacterias y lentejas de agua:
- **Sentinel-2**: Mide la reflectancia residual sobre la línea base trazada entre el Rojo y el SWIR-1 ($1610\text{ nm}$):
    $$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
    $$\text{FAI}_{S2} = \rho_{B08} - \text{NIR}'$$
- **Menut**: Al no disponer de SWIR, calcula el gradiente agudo de biomasa flotante entre el infrarrojo cercano y el rojo en [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L586):
    $$\text{FAI}_{\text{Menut}} = \rho_{\text{NIR}} - \rho_{\text{RED}}$$

### 5.4 Exceso de Rojo ($\Delta\text{Red}$)
Detecta anomalías químicas industriales, efluentes mineros con sales de hierro o descargas con tinte rojo/pardo desprovistas de señal de clorofila fotosintética:
- **Fórmula**: $\Delta\text{Red} = \rho_{\text{Red}} - \rho_{\text{Green}}$

[←Índice](#índice)

---

## 6 Calibración Adaptativa Dinámica por Percentiles Estadísticos

- ***Principio Científico***: En teledetección óptica acuática, los umbrales fijos estáticos fallan sistemáticamente debido a variaciones en la altitud solar estacional, geometría de toma y aerosoles residuales.
- ***Metodología Dinámica***:
    1. Se aíslan las muestras de los índices calculados **únicamente sobre los píxeles válidos de agua** del área analizada.
    2. Se calculan los percentiles adaptativos en [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L617-L620):
        - $\text{thr\_algae} = \text{Percentil}_{95}(\text{FAI})$: Separa el $5\%$ de mayor acumulación de biomasa flotante.
        - $\text{thr\_chl} = \text{Percentil}_{85}(\text{NDCI})$: Aísla el $15\%$ con mayor concentración fitoplanctónica.
        - $\text{thr\_turb} = \text{Percentil}_{85}(\text{NDTI})$: Aísla el $15\%$ con mayor turbidez sedimentaria.
        - $\text{thr\_red} = \text{Percentil}_{85}(\Delta\text{Red})$: Aísla firmas con exceso espectral de rojo anómalo.

[←Índice](#índice)

---

## 7 Matriz de Clasificación Jerárquica de Píxeles (Clases 0 a 5)

Cada píxel del área de interés se evalúa a través de un árbol de decisión mutuamente excluyente y jerárquico codificado en [water.model.ts](../src/lib/models/water.model.ts) y [processor.rs](../../008_water_quality_api_rust/src/processor.rs#L623-L640):

```
¿Es píxel de agua válido? (valid_water == true)
 ├── NO ──> CLASE 0 (Fondo / Tierra / Nube)
 └── SÍ ──> ¿NDTI > thr_turb  Y  ΔRed > thr_red  Y  NDCI < thr_chl?
             ├── SÍ ──> CLASE 5 (Anomalía Crítica / Vertido Químico)
             └── NO ──> ¿FAI > thr_algae?
                         ├── SÍ ──> CLASE 4 (Proliferación de Algas en Superficie)
                         └── NO ──> ¿NDCI > thr_chl?
                                     ├── SÍ ──> CLASE 3 (Clorofila / Eutrofización)
                                     └── NO ──> ¿NDTI > thr_turb?
                                                 ├── SÍ ──> CLASE 2 (Alta Turbidez / Sedimentos)
                                                 └── NO ──> CLASE 1 (Agua Limpia)
```

### Tabla de Clases Temáticas y Significado Ambiental

| Clase ID | Nombre de Categoría | Código Hex | Color Visual | Condición Algorítmica | Diagnóstico Ambiental |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **0** | **Fondo / Tierra / Nube** | `transparent` | Transparente | `!valid_water` | Suelo emergido, vegetación terrestre, sombras o nubes filtradas. |
| **1** | **Agua Limpia** | `#2196f3` | Azul Cian | Valores de fondo en rango normal | Agua oligotrófica o mesotrófica con baja turbidez y reflectancia regular. |
| **2** | **Alta Turbidez** | `#e8430f` | Naranja | $\text{NDTI} > \text{thr\_turb}$ | Arrastre de sedimentos, sólidos minerales en suspensión o escorrentía fluvial. |
| **3** | **Clorofila / Eutrofización** | `#beff6b` | Verde Lima | $\text{NDCI} > \text{thr\_chl}$ | Floración de fitoplancton en columna de agua. Condición eutrófica o hipereutrófica. |
| **4** | **Proliferación de Algas** | `#1b8a0a` | Verde Intenso | $\text{FAI} > \text{thr\_algae}$ | Natas superficiales, espumas bacterianas o macroalgas flotantes visibles. |
| **5** | **Anomalía Crítica** | `#7a0000` | Rojo Oscuro | $\text{NDTI} > \text{thr} \land \Delta\text{Red} > \text{thr} \land \text{NDCI} < \text{thr}$ | Vertido químico, lixiviados de minería (óxidos) o descargas industriales atípicas. |

[←Índice](#índice)

---

## 8 Generación de Salida GeoTIFF y Renderizado GPU en MapLibre

### 8.1 Composición RGB de Color Real para Fondo Cartográfico

Para que el usuario pueda interpretar y contextualizar geográficamente los píxeles de agua clasificados (clorofila, turbidez, floraciones y anomalías), el sistema proyecta como capa base una composición en Color Real (True Color RGB) directamente extraída de la escena satelital:

#### Combinación de Canales Espectrales por Sensor

| Canal Visual | Sentinel-2 L2A | Menut L2A (ICGC NewSpace) | Longitud de Onda Central ($\lambda$) |
| :---: | :---: | :---: | :---: |
| **Canal Rojo ($R$)** | **B04** (archivo `B04.tif`) | **Banda 3** (`band_idx = 3`) | $\sim 662 - 665\text{ nm}$ |
| **Canal Verde ($G$)** | **B03** (archivo `B03.tif`) | **Banda 2** (`band_idx = 2`) | $\sim 560\text{ nm}$ |
| **Canal Azul ($B$)** | **B02** (archivo `B02.tif`) | **Banda 1** (`band_idx = 1`) | $\sim 480 - 490\text{ nm}$ |

- **Sentinel-2**: Al estar las bandas distribuidas en archivos COG separados en AWS S3, el Tiler solicita en paralelo los archivos individuales mediante `b1=B04&b2=B03&b3=B02` con un reescalado estándar `rescale=0,3000`.
- **Menut**: Al empaquetar 7 bandas multiplexadas en un único archivo GeoTIFF (`visual.tif`), el Tiler recibe la misma URL para los 3 canales junto con los índices de banda específicos: `b1=visual.tif&b2=visual.tif&b3=visual.tif&b1_band=3&b2_band=2&b3_band=1&rescale=0,2500`.

### 8.2 Desmultiplexado y Optimización Single-Pass en Rust (`tiler.rs`)

En lugar de re-proyectar y desocluir el archivo de Menut 3 veces por cada tesela solicitada, el módulo [tiler.rs](../../008_water_quality_api_rust/src/tiler.rs) implementa `read_tile_multiband_warped`:
1. **Un Solo Pase de Reproyección (`GDALWarp`)**: El dataset de 7 bandas se proyecta a memoria (`MEM`) en EPSG:3857 para el área de la tesela ($256 \times 256$ píxeles).
2. **Extracción Directa en Memoria**: Desde el dataset temporal resultante, se leen de forma secuencial los buffers de las Bandas 3 (Rojo), 2 (Verde) y 1 (Azul) mediante `GDALGetRasterBand` y `GDALRasterIO`.
3. **Ahorro de Cómputo**: Reduce en un $66\%$ el tiempo de reproyección GDAL y el ancho de banda transferido mediante HTTP Range requests (`/vsicurl/`).
4. **Reescalado Dinámico**: Se aplica la normalización a 8 bits:
   $$\text{Pixel}_{\text{byte}} = \left( \frac{\text{Reflectancia} - \text{min}}{\text{max} - \text{min}} \times 255 \right)$$
   Para Menut, $\text{min}=0$ y $\text{max}=2500$ ($0.0 - 0.25$ de reflectancia BOA), adaptado al rango dinámico de su sensor VNIR submétrico.

### 8.3 Pila de Capas en MapLibre GL JS y Modos de Visualización

En el frontend ([MapLayerController.ts](../src/lib/controllers/MapLayerController.ts)), las teselas se apilan de forma ordenada en el contexto WebGL:
1. **Capa Base (Fondo Satelital RGB)**:
   - Capa ràster con las teselas RGB de Color Real de Sentinel-2 o Menut.
   - Recortada estrictamente al polígono de interés del usuario mediante el protocolo acelerado `clipped://`.
2. **Capa Superior (Píxeles Bio-ópticos Clasificados)**:
   - Capa ràster con la clasificación temática generada por el backend (`classification.tif`).
   - Mapeada con la paleta de colores oficial:
     - Clase 1 (Agua Limpia): `#2196f3` (Azul Cian)
     - Clase 2 (Alta Turbidez): `#e8430f` (Naranja)
     - Clase 3 (Clorofila/Eutrofización): `#beff6b` (Verde Lima)
     - Clase 4 (Algas en Superficie): `#1b8a0a` (Verde Intenso)
     - Clase 5 (Anomalía Crítica): `#7a0000` (Rojo Oscuro)
     - Clase 0 (Fondo/Tierra): Totalmente transparente.
3. **Modos de Visualización (`PassViewMode`)**:
   - `Both` (Recomendado): Muestra la capa de clasificación temática sobre la capa RGB de fondo satelital con opacidad ajustable, permitiendo al usuario apreciar simultáneamente la textura del terreno/agua y la máscara de contaminación calculada.
   - `Water`: Muestra exclusivamente los píxeles de agua clasificados.
   - `RGB`: Muestra únicamente la imagen satelital en Color Real sin la máscara analítica.

[←Índice](#índice)

---

## 9 Próximos pasos

- Consultar la especificación formal del algoritmo en [001_especificacion_cientifica_calidad_agua.md](./001_especificacion_cientifica_calidad_agua.md).
- Revisar la resolución del caso de borde MGRS en [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md).
- Inspeccionar el motor ràster en [processor.rs](../../008_water_quality_api_rust/src/processor.rs).
- Inspeccionar el catálogo general en [README.md](./README.md).

[←Índice](#índice)
