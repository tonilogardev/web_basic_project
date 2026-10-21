# SPEC: Unificación del Backend Geoespacial en Rust (Reemplazo de Titiler + Proxy STAC)

## 1. Contexto y Objetivo Arquitectónico ("Less is More")
Actualmente el repositorio tiene la lógica dividida:
1. `008_water_quality_api_rust/`: Microservicio en Rust (Axum + Tokio + GDAL) que calcula índices de calidad del agua leyendo COGs de Sentinel-2 vía `/vsicurl/` y consultando STAC.
2. `005_sentinel_viewer/`: Visor en Svelte 5 + TypeScript + MapLibre GL JS que consulta la API STAC directamente desde el navegador (`src/lib/stacApi.ts`) y depende de un servicio externo de **Titiler (Python)** (`src/lib/titilerApi.ts`) para renderizar teselas XYZ (`/{z}/{x}/{y}.png`) con combinaciones de bandas e índices espectrales.

**Objetivo:** Ampliar `008_water_quality_api_rust` para que actúe como **único backend geoespacial de alto rendimiento**, asumiendo el servidor de teselas dinámicas XYZ y el proxy/caché de búsquedas STAC. Esto eliminará por completo la dependencia de Titiler (Python) en `005_sentinel_viewer`.

---

## 2. Fase 1: Auditoría y Optimización de `008_water_quality_api_rust`
Antes de añadir nuevos endpoints, revisa y aplica las siguientes mejoras en el código Rust existente:

1. **Configuración global de GDAL para Cloud Optimized GeoTIFFs (COG):**
   - Asegurar al inicio de `src/main.rs` la configuración óptima de variables de entorno de GDAL (`gdal::config::set_config_option`):
     - `GDAL_DISABLE_READDIR_ON_OPEN = "EMPTY_DIR"` (evita peticiones HTTP extra al abrir COGs).
     - `CPL_VSIL_CURL_ALLOWED_EXTENSIONS = ".tif,.tiff"`
     - `GDAL_HTTP_MERGE_CONSECUTIVE_RANGES = "YES"`
     - `GDAL_HTTP_MULTIPLEX = "YES"`
     - `VSI_CACHE = "TRUE"` y `VSI_CACHE_SIZE = "50000000"` (50 MB de caché por handle).
2. **Ejecución no bloqueante (Tokio Blocking Pool):**
   - Las llamadas a `gdal` (C/C++ FFI síncrono) **nunca** deben ejecutarse directamente en el hilo asíncrono de los handlers de Axum.
   - Asegurar que toda lectura de `Dataset::open` y `RasterBand::read_as` dentro de `src/processor.rs` se ejecute dentro de `tokio::task::spawn_blocking`.
3. **Gestión de errores limpia:**
   - Evitar `.unwrap()` en rutas críticas de red o lectura GDAL; devolver respuestas HTTP estructuradas (`StatusCode`, JSON de error) cuando una escena o banda falle.

---

## 3. Fase 2: Nuevo Servidor de Teselas XYZ en Rust (`/api/tiles/{z}/{x}/{y}.png`)
Implementar un módulo `src/tiler.rs` y exponerlo en `src/main.rs` para reemplazar a Titiler.

### Requisitos del Endpoint:
- **Ruta:** `GET /api/tiles/:z/:x/:y` (soportar `.png` en el parámetro `:y` o como extensión).
- **Query Params soportados:**
  - `b1`, `b2`, `b3`: URLs de los COGs (ej. para composiciones RGB como `B04, B03, B02` o Falso Color `B08, B04, B03`).
  - `preset` (opcional): `"true_color"`, `"false_color"`, `"ndvi"`, `"ndwi"`.
  - `rescale` (opcional): Rango de reescalado lineal para Sentinel-2 L2A (por defecto `0,3000` para reflectancias RGB, o `-1,1` para índices normalizados).
  - `colormap` (opcional): Aplicación de rampa de color en memoria para índices de 1 banda (`ndvi`, `ndwi`).

### Lógica de Procesamiento en `src/tiler.rs`:
1. **Cálculo de Bounding Box:** Convertir la coordenada de tesela `(z, x, y)` a su Bounding Box en Web Mercator (`EPSG:3857`).
2. **Lectura eficiente de ventana/overview con GDAL:**
   - Abrir los COGs requeridos con `/vsicurl/`.
   - Transformar el BBox de `EPSG:3857` al CRS nativo del dataset de Sentinel-2 (ej. `EPSG:32631` en Cataluña) para calcular la ventana de píxeles exacta (`window_offset`, `window_size`), o utilizar un `gdal::Warp` en memoria hacia una rejilla de `256x256` píxeles en `EPSG:3857`.
   - Leer directamente a un buffer de `256x256` para que GDAL seleccione automáticamente el *overview* (pirámide interna del COG) adecuado según el nivel de zoom `z`.
3. **Álgebra de Bandas en CPU y Codificación PNG:**
   - **Modo 3 Bandas (RGB / Falso Color):** Aplicar reescalado lineal (`0..3000` -> `0..255` `u8`), corrección gamma ligera si procede y canal Alpha (`0` si es NoData, `255` si es válido).
   - **Modo Índice (`ndvi` / `ndwi`):** Calcular $(B_1 - B_2) / (B_1 + B_2)$ en `f32`, mapear el valor a una tabla de color RGBA de `256x256` y codificar a PNG en memoria usando el crate `image` o `png`.
   - Devolver el buffer binario con cabeceras `Content-Type: image/png` y `Cache-Control: public, max-age=3600`.

---

## 4. Fase 3: Endpoint Proxy y Caché STAC en Rust (`/api/stac/search`)
Ampliar `src/stac.rs` y exponer un endpoint en `src/main.rs` para centralizar las consultas a Earth Search / ESA STAC API.

- **Ruta:** `POST /api/stac/search` (o `GET` con parámetros de `bbox`, `datetime`, `max_cloud_cover`).
- **Funcionalidad:**
  - Mantener un `reqwest::Client` compartido en el estado de Axum (`Arc<AppState>`) con *connection pooling*.
  - Implementar una caché en memoria simple (usando `std::collections::HashMap` con `RwLock` o `dashmap`) indexada por los parámetros de búsqueda (`bbox + datetime + cloud_cover`) para devolver resultados instantáneos en consultas repetidas.
  - Filtrar el payload de respuesta para devolver al frontend únicamente los metadatos esenciales de cada escena y las URLs HTTPS listas de los assets (`B02`, `B03`, `B04`, `B08`, `B11`, `SCL`, `visual`).

---

## 5. Fase 4: Integración en Frontend (`005_sentinel_viewer`)
Actualizar el visor en Svelte/TypeScript manteniendo intacta la interfaz de usuario y la experiencia en MapLibre:

1. **`005_sentinel_viewer/src/lib/titilerApi.ts`:**
   - Refactorizar la generación de URLs de teselas para que apunten al nuevo endpoint del backend en Rust (`/api/tiles/{z}/{x}/{y}.png?...`) en lugar de la instancia de Titiler.
   - Mantener una variable de entorno (`VITE_RUST_API_URL`) con fallback local para desarrollo.
2. **`005_sentinel_viewer/src/lib/stacApi.ts`:**
   - Enrutar las búsquedas de escenas a través de `/api/stac/search` del backend en Rust.

---

## 6. Plan de Ejecución Paso a Paso (Instrucciones para el Agente)
Por favor, ejecuta este plan de forma incremental y modular:
1. **Paso 1:** Analiza `008_water_quality_api_rust/Cargo.toml`, `src/main.rs`, `src/processor.rs` y `src/stac.rs`, así como `005_sentinel_viewer/src/lib/titilerApi.ts` y `stacApi.ts`.
2. **Paso 2:** Aplica las mejoras de la **Fase 1** y construye los endpoints de la **Fase 2** (`src/tiler.rs`) y **Fase 3** (`src/stac.rs`) en `008_water_quality_api_rust`. Verifica que compila limpiamente con `cargo check` / `cargo build`.
3. **Paso 3:** Actualiza `005_sentinel_viewer/src/lib/titilerApi.ts` y `stacApi.ts` (**Fase 4**).
4. **Paso 4:** Actualiza la documentación correspondiente en `001_documentation/` reflejando la nueva arquitectura unificada en Rust.
