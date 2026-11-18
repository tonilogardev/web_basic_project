🌐 **Idioma / Language:** [English](./001_water_quality_scientific_specification.md) · [Català](./001_especificacio_cientifica_qualitat_aigua_catalan.md) · **[Español (Activo)](#)**

---

# Especificación Científica: Algoritmo de Detección de Calidad de Agua y Contaminación (Sentinel-2)

## Índice

1. [Resumen Ejecutivo y Base Científica](#1-resumen-ejecutivo-y-base-científica)
2. [Bandas Espectrales de Sentinel-2 MSI](#2-bandas-espectrales-de-sentinel-2-msi)
3. [Algoritmo de Delineación de Masas de Agua](#3-algoritmo-de-delineación-de-masas-de-agua)
4. [Filtrado Atmosférico y Máscara de Nubes (SCL)](#4-filtrado-atmosférico-y-máscara-de-nubes-scl)
5. [Índices Bio-ópticos de Contaminación y Calidad del Agua](#5-índices-bio-ópticos-de-contaminación-y-calidad-del-agua)
6. [Calibración Adaptativa Dinámica (Percentiles)](#6-calibración-adaptativa-dinámica-percentiles)
7. [Jerarquía de Clasificación y Matriz Espectral](#7-jerarquía-de-clasificación-y-matriz-espectral)
8. [Referencias Científicas Arbitradas](#8-referencias-científicas-arbitradas)
9. [Próximos pasos](#9-próximos-pasos)

---

## 1 Resumen Ejecutivo y Base Científica

- ***Objetivo Técnico***: Evaluar el estado de calidad de masas de agua continentales y costeras a resolución de 10 metros mediante teledetección óptica pasiva multispectral.
- ***Fundamento Bio-óptico***:
    - El agua limpia pura absorbe fuertemente la radiación en el infrarrojo cercano (NIR) y de onda corta (SWIR), mientras refleja en el espectro visible (azul y verde).
    - La presencia de fitoplancton (clorofila-a), sólidos inorgánicos en suspensión (sedimentos) o biomasa flotante altera drásticamente la curva de reflectancia espectral en longitudes de onda específicas.
- ***Rigor y Validez***:
    - El algoritmo implementa formulaciones validadas por la comunidad científica internacional (McFeeters, Xu, Hu, Mishra, Lacaux), combinadas con calibración adaptativa por percentiles para garantizar robustez ante variaciones estacionales de ángulo cenital solar y corrección atmosférica.
- ***Referencias de Archivos***:
    - Proceso principal de cálculo ràster: [processor.rs](../../008_water_quality_api_rust/src/processor.rs)
    - Modelo de datos y codificación de clases: [water.model.ts](../src/lib/models/water.model.ts)

[←Índice](#índice)

---

## 2 Bandas Espectrales de Sentinel-2 MSI

El satélite Sentinel-2 (Agencia Espacial Europea, programa Copernicus) transporta el sensor MultiSpectral Instrument (MSI). El algoritmo opera sobre productos **Nivel-2A (L2A)** corregidos atmosféricamente a reflectancia de superficie de fondo de atmósfera (BOA, Bottom-of-Atmosphere):

| Banda | Nombre del Canal | Longitud de Onda Central ($\lambda$) | Ancho de Banda ($\Delta\lambda$) | Resolución Nativa | Función en el Algoritmo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B02** | Azul (Blue) | $490\text{ nm}$ | $66\text{ nm}$ | $10\text{ m}$ | Reflectancia base y visualización RGB |
| **B03** | Verde (Green) | $560\text{ nm}$ | $36\text{ nm}$ | $10\text{ m}$ | Pico de reflectancia del agua y cociente NDWI |
| **B04** | Rojo (Red) | $665\text{ nm}$ | $31\text{ nm}$ | $10\text{ m}$ | Absorción de clorofila y pico de turbidez (NDTI) |
| **B05** | RedEdge 1 | $705\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ (remuestreado a $10\text{ m}$) | Reflectancia celular de fitoplancton (NDCI) |
| **B06** | RedEdge 2 | $740\text{ nm}$ | $15\text{ nm}$ | $20\text{ m}$ (remuestreado a $10\text{ m}$) | Control de transición espectral borde rojo |
| **B08** | Infrarrojo Cercano (NIR) | $842\text{ nm}$ | $115\text{ nm}$ | $10\text{ m}$ | Absorción de agua / detección de floraciones (FAI) |
| **B8A** | NIR Estrecho | $865\text{ nm}$ | $21\text{ nm}$ | $20\text{ m}$ (remuestreado a $10\text{ m}$) | Control de absorción atmosférica de vapor |
| **B11** | Infrarrojo Onda Corta (SWIR) | $1610\text{ nm}$ | $91\text{ nm}$ | $20\text{ m}$ (remuestreado a $10\text{ m}$) | Separación agua/tierra y línea base de FAI |
| **SCL** | Scene Classification Layer | Clasificación temática | Categorías 0-11 | $20\text{ m}$ (remuestreado a $10\text{ m}$) | Máscara de nubes, sombras, nieve y agua |

[←Índice](#índice)

---

## 3 Algoritmo de Delineación de Masas de Agua

Para aislar con exactitud el agua y descartar tierra emergida, arena y áreas ribereñas, el algoritmo utiliza un discriminador dual espectral y temático:

### 3.1 Conversión Radiométrica BOA
Los valores digitales se transforman en reflectancias adimensionales en escala $0.0 - 1.0$:
$$\rho_\lambda = \frac{\text{DN}_\lambda}{10000.0}$$

### 3.2 Índice NDWI (McFeeters, 1996)
Explota la alta reflectancia del agua en el canal verde y su absorción total en el infrarrojo cercano:
$$\text{NDWI} = \frac{\rho_{B03} - \rho_{B08}}{\rho_{B03} + \rho_{B08}}$$

### 3.3 Índice MNDWI (Xu, 2006)
Sustituye NIR por SWIR-1 para eliminar falsos positivos producidos por zonas urbanas, infraestructuras y suelos desnudos:
$$\text{MNDWI} = \frac{\rho_{B03} - \rho_{B11}}{\rho_{B03} + \rho_{B11}}$$

### 3.4 Condición de Validación Híbrida
Un píxel se valida como superficie acuática si cumple la condición espectral de reflectancia positiva o si está catalogado como agua por la clasificación de escena oficial de Copernicus:
$$\text{is\_water} = (\text{p\_scl} == 6) \lor \Big(\big(\text{NDWI} > 0.02 \lor \text{MNDWI} > 0.05\big) \land \text{p\_scl} \notin \{4, 5\}\Big)$$
Donde la clase SCL 4 representa vegetación terrestre densa y la clase SCL 5 representa suelo no vegetado.

[←Índice](#índice)

---

## 4 Filtrado Atmosférico y Máscara de Nubes (SCL)

El producto Sentinel-2 L2A incorpora una capa de clasificación espectral generada por el algoritmo de transferencia radiativa **Sen2Cor** de la ESA.

### 4.1 Categorías SCL y Regla de Exclusión
El algoritmo enmascara rigurosamente todos los píxeles contaminados por cobertura nubosa, sombras proyectadas o elementos reflectores de alta interferencia:

$$\text{cloud\_mask} = \text{p\_scl} \in \{3, 8, 9, 10, 11\}$$

- **Clase 3**: Sombras de nubes proyectadas sobre agua o tierra.
- **Clase 8**: Nubes de probabilidad media.
- **Clase 9**: Nubes de probabilidad alta (opacas).
- **Clase 10**: Cirros finos y velos de alta atmósfera.
- **Clase 11**: Nieve o hielo en superficie.

Píxeles validados para análisis espectral bio-óptico:
$$\text{valid\_water} = \text{is\_water} \land \neg \text{cloud\_mask}$$

[←Índice](#índice)

---

## 5 Índices Bio-ópticos de Contaminación y Calidad del Agua

Sobre los píxeles que cumplen `valid_water == true`, se calculan cuatro variables físicas independientes:

### 5.1 FAI: Índice de Algues Flotantes (Floating Algae Index, Hu 2009)
Diseñado específicamente para mitigar los efectos del destello solar (sun-glint) y aerosoles atmosféricos. Mide la reflectancia residual en NIR respecto a una línea base recta trazada entre el Rojo y el SWIR-1:

$$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{\lambda_{B08} - \lambda_{B04}}{\lambda_{B11} - \lambda_{B04}}$$
$$\text{NIR}' = \rho_{B04} + (\rho_{B11} - \rho_{B04}) \cdot \frac{832.8 - 664.6}{1613.7 - 664.6}$$
$$\text{FAI} = \rho_{B08} - \text{NIR}'$$

- **Interpretación**: Valores altos positivos señalan presencia de biomasa flotante acumulada en superficie (espumas de cianobacterias, macroalgas o lenteja de agua).

### 5.2 NDCI: Índice de Clorofila por Diferencia Normalizada (Mishra & Mishra 2012)
Diseñado para estimar concentración de clorofila-a en aguas túrbidas productivas (continentales y de estuario). Aprovecha la absorción de pigmentos fotosintéticos en el rojo ($665\text{ nm}$) y el pico de dispersión celular en el borde rojo ($705\text{ nm}$):

$$\text{NDCI} = \frac{\rho_{B05} - \rho_{B04}}{\rho_{B05} + \rho_{B04}}$$

- **Interpretación**: Correlaciona directamente con la biomasa fitoplanctónica subsuperficial y el estado de eutrofización del cuerpo de agua.

### 5.3 NDTI: Índice de Turbidez por Diferencia Normalizada (Lacaux et al. 2007)
Aprovecha que los sedimentos minerales inorgánicos en suspensión incrementan drásticamente la reflectancia en la banda roja respecto a la verde:

$$\text{NDTI} = \frac{\rho_{B04} - \rho_{B03}}{\rho_{B04} + \rho_{B03}}$$

- **Interpretación**: Cuantifica la concentración de material particulado en suspensión (SPM) y sedimentos arrastrados por descargas fluviales.

### 5.4 Exceso de Rojo Espectral ($\Delta\text{Red}$)
Mide la divergencia cromática anómala donde el canal rojo supera significativamente al canal verde sin corresponderse con una signatura algal:

$$\Delta\text{Red} = \rho_{B04} - \rho_{B03}$$

- **Interpretación**: Detecta efluentes químicos, vertidos mineros con óxidos de hierro, o descargas industriales de coloración atípica.

[←Índice](#índice)

---

## 6 Calibración Adaptativa Dinámica (Percentiles)

- ***Principio Científico***: En teledetección acuática, los valores absolutos de reflectancia varían según la latitud, la hora del día y la época del año. El uso de umbrales estáticos fijos provoca falsas alarmas en verano o desensibilización en invierno.
- ***Estrategia Dinámica del Algoritmo***:
    - Se extrae la distribución estadística de los índices calculados **exclusivamente sobre los píxeles de agua válidos del área de interés**.
    - Se calculan percentiles estadísticos robustos que aíslan los valores extremos:
        - $\text{thr\_algae} = \text{Percentil}_{95}(\text{FAI})$: Identifica el $5\%$ superior con proliferación más severa de biomasa superficial.
        - $\text{thr\_chl} = \text{Percentil}_{85}(\text{NDCI})$: Aísla el $15\%$ superior con mayor concentración de clorofila.
        - $\text{thr\_turb} = \text{Percentil}_{85}(\text{NDTI})$: Aísla el $15\%$ superior con mayor carga sedimentaria.
        - $\text{thr\_red} = \text{Percentil}_{85}(\Delta\text{Red})$: Aísla las signaturas con exceso anómalo de reflectancia roja.

[←Índice](#índice)

---

## 7 Jerarquía de Clasificación y Matriz Espectral

Cada píxel del producto resultante se clasifica en una de las 6 categorías exclusivas según el siguiente árbol de decisión bio-óptico:

| Código | Categoría | Color | Signatura Espectral Determinante | Significado Ambiental / Físico |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Fondo / Tierra / Nube** | Transparente | `valid_water == false` | Suelo, cobertura vegetal, nubes o sombras. |
| **5** | **Anomalía Crítica** | Rojo Oscuro (`#7a0000`) | $\text{NDTI} > \text{thr\_turb} \land \Delta\text{Red} > \text{thr\_red} \land \text{NDCI} < \text{thr\_chl}$ | Turbidez con fuerte exceso de rojo sin clorofila. Sugiere vertido químico, escorrentía mineral o lixiviado industrial. |
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

- Consultar la arquitectura del backend en [processor.rs](../../008_water_quality_api_rust/src/processor.rs).
- Consultar el informe técnico del caso Roses en [002_informe_tecnico_caso_roses_multigranulo.md](./002_informe_tecnico_caso_roses_multigranulo.md).

[←Índice](#índice)
