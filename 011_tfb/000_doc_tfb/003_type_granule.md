# Lista de la Compra del Dataset (Guía de Selección de Gránulos)

Este documento sirve como guía estricta para realizar la búsqueda manual de las imágenes Sentinel-2 en herramientas como Copernicus Browser. El objetivo es conseguir los 40 gránulos perfectos que contengan los "casos difíciles" para entrenar la U-Net.

## Índice
- [0. Filosofía de Selección: El Peligro del Suelo Dominante](#0-filosofía-de-selección-el-peligro-del-suelo-dominante)
- [1. Conjunto de Entrenamiento (30 Gránulos)](#1-conjunto-de-entrenamiento-30-gránulos)
  - [Caso A: El "Jefe Final" - Mezcla de Nieve y Nube (Pirineos)](#caso-a-el-jefe-final---mezcla-de-nieve-y-nube-pirineos)
  - [Caso B: Niebla de Invalle y Nubes Convectivas (Llanura)](#caso-b-niebla-de-invalle-y-nubes-convectivas-llanura-central)
  - [Caso C: Falsos Positivos Urbanos y Marinos (Costa Central)](#caso-c-falsos-positivos-urbanos-y-marinos-costa-central)
  - [Caso D: Extremos Agrícolas y Zonas Inundadas (Sur)](#caso-d-extremos-agrícolas-y-zonas-inundadas-sur)
- [2. Conjunto de Test Oculto (10 Gránulos)](#2-conjunto-de-test-oculto-10-gránulos)

---

## 0. Filosofía de Selección: El Peligro del Suelo Dominante
Antes de desglosar los gránulos a buscar, es fundamental justificar por qué **no** se requiere descargar decenas de gránulos 100% despejados (sin nubes) para enseñar a la red lo que es el "suelo normal". Esta decisión se fundamenta en dos pilares del *Deep Learning*:

1. **Aprendizaje por Parches (Dos por el precio de uno):** La U-Net no procesa el gránulo completo de 100x100 km, sino recortes (*tiles*) de 512x512 píxeles. Un gránulo con un 30% de nubes dispersas nos regalará automáticamente cientos de recortes 100% despejados. Los días parcialmente nublados ya contienen el fondo limpio que necesitamos.
2. **Prevención del *Class Imbalance* (Desequilibrio de Clases):** Si introducimos en el dataset un volumen masivo de cielos 100% despejados, el 90% de los píxeles totales de entrenamiento serían "suelo". La red neuronal caería en la trampa de volverse "vaga", aprendiendo que predecir siempre "Despejado" le otorga un 90% de precisión matemática global, sin esforzarse en detectar las nubes. Para obligarla a aprender patrones complejos, debemos sobreexponerla a los "casos difíciles" (nubes y nieve).

*Excepción Estratégica:* Las únicas excepciones (donde buscaremos explícitamente gránulos 100% despejados) serán escenarios de *Hard Negatives* (Falsos Positivos Duros), como montañas repletas de nieve pura (Caso A) y grandes ciudades con techos industriales brillantes (Caso C), para obligar a la red a no confundir esas superficies terrestres blancas con formaciones nubosas.

## 1. Conjunto de Entrenamiento (30 Gránulos)

### Caso A: El "Jefe Final" - Mezcla de Nieve y Nube (Pirineos)
Es vital enseñarle a la red (con la banda SWIR) la diferencia cuando ambas cosas se solapan.
*   **Cantidad:** 8 Gránulos
*   **Gránulos recomendados:** `T31TCH` (Val d'Aran/Aigüestortes), `T31TDH` (Cerdanya/Ripollès).
*   **Meses:** Enero, Febrero, Marzo.
*   **Qué debes buscar:** 
    *   3 gránulos con los valles totalmente nevados y un día 100% soleado (para enseñar "Nieve Pura").
    *   5 gránulos donde haya nieve en el suelo PERO también haya nubes bajas cruzando los valles o cimas tapadas (para forzar a la red a discriminar el blanco-nieve del blanco-nube contiguos).

### Caso B: Niebla de Invalle y Nubes Convectivas (Llanura Central)
La niebla a ras de suelo se parece mucho a la nube alta, pero el DEM ayuda a discriminarla. Los cirros son el reto de verano.
*   **Cantidad:** 8 Gránulos
*   **Gránulos recomendados:** `T31TCG` (Plana de Lleida Norte), `T31TDG` (Cataluña Central / Berguedà).
*   **Meses:**
    *   Diciembre/Enero: Buscar la famosa "Boira" (Niebla espesa) instalada en la llanura de Lleida mientras las montañas alrededor están despejadas.
    *   Junio/Julio: Buscar días de verano con *Cirros* (nubes altas y estriadas muy finas) y nubes de evolución tipo "algodón" esparcidas. Cero nieve.

### Caso C: Falsos Positivos Urbanos y Marinos (Costa Central)
Las ciudades tienen naves industriales blancas gigantes que brillan como nubes. El mar es tan oscuro que una nube pequeña resalta muchísimo.
*   **Cantidad:** 8 Gránulos
*   **Gránulos recomendados:** `T31TDF` (Área Metropolitana de Barcelona).
*   **Meses:** Indiferente (mezclar Verano e Invierno).
*   **Qué debes buscar:**
    *   4 gránulos parcialmente nublados donde las nubes floten sobre el mar oscuro y sobre la ciudad.
    *   2 gránulos 100% despejados sobre la ciudad (para enseñarle explícitamente a la red que un techo brillante NO es una nube).
    *   2 gránulos con neblina de contaminación marina o "bruma" costera.

### Caso D: Extremos Agrícolas y Zonas Inundadas (Sur)
Queremos confundir a la red con campos que parecen espejos de agua o campos de tierra muy clara.
*   **Cantidad:** 6 Gránulos
*   **Gránulos recomendados:** `T31TCE` (Delta del Ebro), `T31TCF` (Llanuras de secano).
*   **Meses:**
    *   Mayo/Junio: Buscar el Delta del Ebro cuando los arrozales están inundados (actúan como espejos gigantes). 
    *   Agosto: Llanuras secas y pálidas. Buscar algún día con nubes medias cruzando.

---

## 2. Conjunto de Test Oculto (10 Gránulos)
Este es el examen final de la red. Debe ser un popurrí brutal. **Recuerda: estos gránulos NUNCA deben mezclarse con los 30 de arriba**.

*   **Invierno (5 Gránulos):**
    *   2 × `T31TCH` o `T31TDH` (Febrero): Nieve a tope + nubes parciales.
    *   2 × `T31TCG` (Enero): Niebla espesa en la llanura.
    *   1 × `T31TDF` (Diciembre): Sol bajo creando sombras largas en edificios y montañas costeras.
*   **Verano/Transición (5 Gránulos):**
    *   2 × `T31TDG` (Abril/Mayo): Cimas con un poco de nieve derritiéndose y nubes de primavera.
    *   2 × `T31TDF` (Agosto): Nubes de tormenta de verano sobre el mar y la ciudad.
    *   1 × `T31TCE` (Julio): Delta del Ebro despejado parcialmente.
