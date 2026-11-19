# Catálogo de Documentación Técnica y Científica: tonilogar Aqua

## Índice

1. [Especificaciones Científicas y Metodología](#1-especificaciones-científicas-y-metodología)
2. [Manuales Técnicos de Procesamiento y Clasificación](#2-manuales-técnicos-de-procesamiento-y-clasificación)
3. [Comparativa de Arquitectura: Sentinel-2 vs Menut](#3-comparativa-de-arquitectura-sentinel-2-vs-menut)
4. [Informes de Ingeniería y Resolución de Incidencias](#4-informes-de-ingeniería-y-resolución-de-incidencias)
5. [Próximos pasos](#5-próximos-pasos)

---

## 1 Especificaciones Científicas y Metodología

Documentación científica formal sobre los sensores ópticos multiespectrales, formulación matemática de los índices bio-ópticos (NDWI, MNDWI, FAI, NDCI, NDTI, $\Delta\text{Red}$), filtrado atmosférico, calibración adaptativa por percentiles y referencias bibliográficas arbitradas:

- [001_especificacion_cientifica_calidad_agua.md](./001_especificacion_cientifica_calidad_agua.md): Especificación científica formal multi-sensor (Sentinel-2 MSI y Menut VNIR).

[←Índice](#índice)

---

## 2 Manuales Técnicos de Procesamiento y Clasificación

Guías detalladas para el equipo de desarrollo sobre el flujo de datos satelitales, enmascaramiento de nubes y renderizado:

- [003_procesamiento_satelital_nubes_mascaras_clasificacion.md](./003_procesamiento_satelital_nubes_mascaras_clasificacion.md): Manual paso a paso de la ingesta ràster vía GDAL `/vsicurl/` (HTTP 206), detección física de nubes frente a máscara Sen2Cor SCL, cálculo paralelo de índices con Rayon, matriz de decisión de 6 clases (0 a 5) y protocolo `clipped://` de renderizado GPU en MapLibre.
- Modelo de clases y tipado en frontend: [water.model.ts](../src/lib/models/water.model.ts).
- Motor de cálculo ràster en Rust: [processor.rs](../../008_water_quality_api_rust/src/processor.rs).
- Servicio cliente STAC para Menut (ICGC): [MenutStacService.ts](../src/lib/services/MenutStacService.ts).
- Gestor de capas MapLibre y protocolo de recorte: [MapLayerController.ts](../src/lib/controllers/MapLayerController.ts).

[←Índice](#índice)

---

## 3 Comparativa de Arquitectura: Sentinel-2 vs Menut

| Característica | Sentinel-2 L2A (Copernicus) | Menut L2A (ICGC NewSpace) |
| :--- | :--- | :--- |
| **GSD (Resolución Espacial)** | $10\text{ m}$ (Visible/NIR) / $20\text{ m}$ (RedEdge/SWIR) | $4.75\text{ m}$ (VNIR submétrico) |
| **Estructura Ràster** | Multi-archivo COG (1 `.tif` por banda) | Monolítico COG (1 `.tif` con 7 canales) |
| **Detección de Nubes** | Capa precalculada SCL (clases 3, 8, 9, 10, 11) | Test óptico físico: Blancura + Densidad NIR + HOT |
| **Extracción de Agua** | NDWI + MNDWI (usando SWIR B11) + filtro SCL | NDWI (usando Verde y NIR) + umbral NIR $\rho < 0.25$ |
| **Índice de Algas (FAI)** | Contraste Rojo-SWIR con B11 ($1610\text{ nm}$) | Contraste espectral NIR - Rojo |
| **Índice de Clorofila (NDCI)** | B05 ($705\text{ nm}$) vs B04 ($665\text{ nm}$) | Banda 4 RE1 ($705\text{ nm}$) vs Banda 3 RED ($665\text{ nm}$) |
| **Catálogo STAC** | AWS Earth Search (`sentinel-2-l2a`) | ICGC STAC API (`menut-l2a`) |
| **Rango Temporal Operativo** | Diciembre de 2015 – Actualidad | Junio de 2023 – Marzo de 2026 |

[←Índice](#índice)

---

## 4 Informes de Ingeniería y Resolución de Incidencias

Historial de post-mortems técnicos y resolución de casos de borde en producción:

- [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md): Diagnóstico y resolución de la partición de cuadrículas MGRS en el Golfo de Roses (`31TDG` vs `31TEG`), revisión de la desconexión entre Sen2Cor SCL y NDWI, y habilitación del soporte multi-gránulo paralelo.

[←Índice](#índice)

---

## 5 Próximos pasos

- Consultar la especificación científica en [001_especificacion_cientifica_calidad_agua.md](./001_especificacion_cientifica_calidad_agua.md).
- Revisar el manual técnico de nubes y clasificación en [003_procesamiento_satelital_nubes_mascaras_clasificacion.md](./003_procesamiento_satelital_nubes_mascaras_clasificacion.md).
- Inspeccionar el informe del caso Roses en [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md).

[←Índice](#índice)
