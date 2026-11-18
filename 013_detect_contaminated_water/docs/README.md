# Catálogo de Documentación Técnica y Científica: tonilogar Aqua

## Índice

1. [Especificaciones y Documentos](#1-especificaciones-y-documentos)
2. [Próximos pasos](#2-próximos-pasos)

---

## 1 Especificaciones y Documentos

### Documentación Científica y Algorítmica (Para Dirección y Validación)
Documentos científicos formales sobre el sensor Sentinel-2 MSI, bandas utilizadas, formulación matemática de los índices bio-ópticos (NDWI, MNDWI, FAI, NDCI, NDTI, $\Delta\text{Red}$), calibración por percentiles dinámicos y referencias científicas arbitradas. **Exentos de referencias a bugs o incidencias locales**, listos para presentación a clientes o dirección con barra de navegación por idioma:
- 🇬🇧 [English: 001_water_quality_scientific_specification.md](./001_water_quality_scientific_specification.md)
- 🏴 [Català: 001_especificacio_cientifica_qualitat_aigua_catalan.md](./001_especificacio_cientifica_qualitat_aigua_catalan.md)
- 🇪🇸 [Español: 001_especificacion_cientifica_calidad_agua.md](./001_especificacion_cientifica_calidad_agua.md)

### Informes de Ingeniería y Resolución de Incidencias (Post-Mortem Interno)
- [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md): Diagnóstico exhaustivo del caso del Golfo de Roses, análisis de división de cuadrícula MGRS (`31TDG` vs `31TEG`), revisión de la máscara Sen2Cor SCL y solución multi-gránulo paralela en producción.

### Histórico de Trabajo / Borradores
- [001_water_quality_algorithm_and_scl_masking_catalan.md](./001_water_quality_algorithm_and_scl_masking_catalan.md): Versió històrica amb el cas de Roses inclòs (Català).
- [001_water_quality_algorithm_and_scl_masking.md](./001_water_quality_algorithm_and_scl_masking.md): Historical technical draft with Roses incident (English).

[←Índice](#índice)

---

## 2 Próximos pasos

- Consultar [001_especificacion_cientifica_calidad_agua.md](./001_especificacion_cientifica_calidad_agua.md) para la presentación de rigor metodológico a dirección.
- Consultar [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md) para detalles de arquitectura de ingeniería ràster y multi-gránulo.

[←Índice](#índice)
