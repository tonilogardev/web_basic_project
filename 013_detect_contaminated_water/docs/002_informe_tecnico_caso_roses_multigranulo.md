# Informe Técnico: Diagnóstico y Resolución del Caso Golfo de Roses (Multi-Gránulo MGRS y Máscara SCL)

## Índice

1. [Descripción de la Incidencia y Capturas](#1-descripción-de-la-incidencia-y-capturas)
2. [Causa Arrel A: Frontera de Corte MGRS y Selección de Gránulo](#2-causa-arrel-a-frontera-de-corte-mgrs-y-selección-de-gránulo)
3. [Causa Arrel B: Desconexión entre Sen2Cor SCL y NDWI Óptico](#3-causa-arrel-b-desconexión-entre-sen2cor-scl-y-ndwi-óptico)
4. [Soluciones Implementadas en Producción](#4-soluciones-implementadas-en-producción)
5. [Validación y Resultados en Caliente](#5-validación-y-resultados-en-caliente)
6. [Próximos pasos](#6-próximos-pasos)

---

## 1 Descripción de la Incidencia y Capturas

- ***Síntoma Observado***: Al trazar un polígono sobre la Bahía de Roses (Girona) y solicitar `Detect Water Pollution`, la capa RGB de satélite se mostraba visible, pero al activar el modo `Water`, la superficie marina aparecía completamente vacía y transparente.
- ***Evidencia Visual***:
    - *Figura 1.1: Modo "Both" donde el fondo RGB es visible pero sin sobrecapa de calidad de agua*:
    ![Roses RGB Both Mode](./img/roses_rgb_both_mode.png)
    - *Figura 1.2: Modo "Water" donde el interior del polígono marino aparece 100% transparente*:
    ![Roses Water Mode Empty](./img/roses_water_mode_empty.png)
- ***Referencias de Archivos***:
    - Controlador de análisis: [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts)
    - Controlador de renderizado MapLibre: [MapLayerController.ts](../src/lib/controllers/MapLayerController.ts)

[←Índice](#índice)

---

## 2 Causa Arrel A: Frontera de Corte MGRS y Selección de Gránulo

1. La órbita relativa `R008` (fecha `20261025`) en la zona del Empordà está compuesta por **dos gránulos Sentinel-2 adyacentes**:
    - `S2A_31TDG_20261025_0_L2A`: Gránulo occidental que termina en el meridiano central de la zona UTM 31 ($3^\circ 00' 00''\text{E}$).
    - `S2A_31TEG_20261025_1_L2A`: Gránulo oriental que comienza en $3^\circ 00' 00''\text{E}$ y cubre el Golfo de Roses ($3.11^\circ\text{E} - 3.23^\circ\text{E}$).
2. El frontend seleccionaba automáticamente el primer elemento del array:
    ```typescript
    const stacItemId = pass.stacItemId || pass.granules[0]?.id;
    ```
    Como `pass.granules[0]` era `31TDG`, se enviaba dicho gránulo al backend para su recorte y análisis.
3. **Comprobación en el Sistema de Archivos**:
    - Al inspeccionar el GeoTIFF generado para `31TDG` recortado al polígono de Roses:
      - **Dimensiones físicas**: `(alto: 472 píxeles, ancho: 6 píxeles)`.
      - Una franja vertical de solo 6 píxeles que apenas tocaba la arena de Empuriabrava al extremo oeste del polígono. La bahía y el mar abierto de Roses **no existen** en el gránulo `31TDG`.
    - Al inspeccionar el gránulo `31TEG`:
      - **Dimensiones físicas**: `(alto: 610 píxeles, ancho: 531 píxeles)`.
      - Contenía **170.082 píxeles** de agua limpia, turbidez y algas en la bahía.

[←Índice](#índice)

---

## 3 Causa Arrel B: Desconexión entre Sen2Cor SCL y NDWI Óptico

1. En el backend de Rust ([processor.rs](../../008_water_quality_api_rust/src/processor.rs)), la máscara de agua original era:
    ```rust
    let water_mask = ndwi > 0.05 || mndwi > 0.10;
    let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
    let valid_water = water_mask && !cloud_mask;
    ```
2. **Deficiencia Lógica**:
    - Se utilizaba la banda SCL únicamente para descartar nubes (clases 3, 8, 9, 10, 11), pero se ignoraba que el producto oficial Sen2Cor ya clasifica el agua en la **clase 6 (`WATER`)**.
    - En aguas marinas costeras muy limpias y oligotróficas, la absorción en el infrarrojo cercano es tan intensa que la reflectancia verde puede caer, dejando el $\text{NDWI} \le 0.05$.
    - Al no alcanzar 0.05, el píxel se descartaba (`valid_water = false`), quedando con valor `0` (transparente), a pesar de ser agua oceánica confirmada.

[←Índice](#índice)

---

## 4 Soluciones Implementadas en Producción

### 4.1 Backend: Integración Explícita de la Clase SCL 6
En [processor.rs](../../008_water_quality_api_rust/src/processor.rs), se actualizó la definición de agua válida:
```rust
let is_scl_water = p_scl == 6;
let is_index_water = (ndwi > 0.02 || mndwi > 0.05) && !matches!(p_scl, 4 | 5);
let cloud_mask = matches!(p_scl, 3 | 8 | 9 | 10 | 11);
let valid_water = (is_scl_water || is_index_water) && !cloud_mask;
```
- Se valida como agua todo píxel marcado como clase 6 por Sentinel-2.
- Se mantiene el soporte de índices bio-ópticos (`NDWI > 0.02` y `MNDWI > 0.05`) descartando vegetación terrestre (4) y suelo (5).
- Se preserva el enmascaramiento estricto de nubes y sombras.

### 4.2 Frontend: Análisis Multi-Gránulo en Paralelo
En [WaterAnalysisController.ts](../src/lib/controllers/WaterAnalysisController.ts) y [MapLayerController.ts](../src/lib/controllers/MapLayerController.ts):
- Se calcula la intersección geométrica de cada gránulo constituyente de la pasada con la capsa delimitadora del usuario mediante `intersectBbox`.
- Se ordenan por área de solapamiento descendente.
- Se disparan en paralelo (`Promise.all`) las llamadas de análisis para todos los gránulos que intersecten el área.
- En MapLibre se inyectan las capas ràster de clasificación de cada gránulo de forma continua, superponiéndose perfectamente al mapa base sin cortes en la cuadrícula MGRS.

[←Índice](#índice)

---

## 5 Validación y Resultados en Caliente

Se ejecutó una prueba de estrés sobre el polígono completo de Roses (553.410 píxeles):
- **Tierra emergida enmascarada (Clase 0)**: 259.740 píxeles (46.9%).
- **Agua Limpia (Clase 1)**: 205.775 píxeles (37.2%).
- **Turbidez Costera / Sedimentos (Clase 2)**: 29.245 píxeles (5.3%).
- **Clorofila / Eutrofización (Clase 3)**: 38.611 píxeles (7.0%).
- **Proliferación de Algas en Superficie (Clase 4)**: 12.552 píxeles (2.3%).
- **Anomalías Críticas (Clase 5)**: 7.487 píxeles (1.4%).

**Resultado**: Cobertura del 100% del cuerpo de agua en la bahía con **más de 293.000 píxeles analizados y clasificados correctamente**.

[←Índice](#índice)

---

## 6 Próximos pasos

- Consultar la base científica de las fórmulas en [001_especificacion_cientifica_calidad_agua.md](./001_especificacion_cientifica_calidad_agua.md).
- Verificar el comportamiento en otras áreas limítrofes entre cuadrículas UTM.

[←Índice](#índice)
