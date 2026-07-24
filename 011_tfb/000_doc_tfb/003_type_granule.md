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

## 0. Filosofía de Selección: La Regla de Oro (Suelo vs Nube)

Antes de buscar gránulos, debes interiorizar una regla de oro fundamental para el *Deep Learning*: **La inmensa mayoría de tus gránulos deben tener entre un 30% y un 70% de nubosidad, mezclando siempre nubes y suelo visible.**

¿Por qué es esto obligatorio?
1. **Fronteras y Sombras:** Si descargas un gránulo 100% nublado, la red no aprende cómo se proyectan las sombras de las nubes sobre el suelo, ni cómo es el borde exacto de una nube (transición de blanco a terreno).
2. **Dos por el precio de uno:** Como la U-Net recorta la imagen en trozos de 512x512, un gránulo con un 40% de nubes dispersas te regala cientos de recortes que son 100% nube, cientos que son 100% suelo despejado, y cientos que contienen el borde crítico entre ambos.
3. **El Peligro del Suelo Dominante:** Si bajas muchos gránulos 100% despejados, el 90% de tus píxeles de entrenamiento serán "suelo". La red se volverá "vaga", prediciendo siempre "Suelo" para ganar precisión matemática fácil, ignorando las nubes pequeñas.

**La Única Excepción (Hard Negatives):**
Solo buscarás gránulos 100% despejados cuando quieras enseñarle a la red un "Falso Positivo Duro". Por ejemplo: un día 100% soleado sobre el Pirineo nevado (para que aprenda que el blanco de la nieve NO es nube), o un día 100% soleado sobre Barcelona (para que aprenda que los techos industriales brillantes NO son nubes).

## 1. Conjunto de Entrenamiento (30 Gránulos)

### Caso A: El "Jefe Final" - Mezcla de Nieve y Nube (Pirineos)
Es vital enseñarle a la red (con la banda SWIR) la diferencia cuando ambas cosas se solapan.
*   **Cantidad:** 8 Gránulos
*   **Gránulos recomendados:** `T31TCH` (Val d'Aran/Aigüestortes), `T31TDH` (Cerdanya/Ripollès).
*   **Meses:** Enero, Febrero, Marzo.
*   **Qué debes ver exactamente en pantalla:** 
    *   **2 Gránulos (Excepción 100% despejado):** Día soleado perfecto. Picos y valles totalmente blancos por la nieve. Ni una sola nube. Esto enseña a la IA la textura pura de la nieve.
    *   **6 Gránulos (El Caos - 50% nube / 50% nieve):** Tienes que ver nieve en las montañas, y justo encima o al lado, formaciones nubosas tapando partes nevadas y partes de bosque oscuro. Esto obliga a la red a encontrar la minúscula diferencia espectral entre la nube y la nieve que tiene debajo. Usa el filtro de nubes de Copernicus entre el 20% y el 60%.

### Caso B: Niebla de Invalle y Nubes Convectivas (Llanura Central)
La niebla a ras de suelo se parece mucho a la nube alta, pero el DEM ayuda a discriminarla. Los cirros son el reto de verano.
*   **Cantidad:** 8 Gránulos
*   **Gránulos recomendados:** `T31TCG` (Plana de Lleida Norte), `T31TDG` (Cataluña Central / Berguedà).
*   **Meses y Composición visual exacta:**
    *   **4 Gránulos de Invierno (Niebla):** Diciembre/Enero. Busca días muy anticiclónicos. En el mapa general de España no hay nubes, pero en Lleida hay una "mancha plana y blanca" (niebla). Debe verse la niebla tapando el valle, pero las montañas de los bordes del gránulo deben verse perfectamente despejadas.
    *   **4 Gránulos de Verano (Cirros/Cúmulos):** Junio/Julio. Busca cielos con un 30-50% de nubes. Deben ser nubes finas y estiradas (Cirros) o nubes de buen tiempo esparcidas como algodón, proyectando sombras muy definidas sobre los campos de cultivo secos. Cero nieve en toda la imagen.

### Caso C: Falsos Positivos Urbanos y Marinos (Costa Central)
Las ciudades tienen naves industriales blancas gigantes que brillan como nubes. El mar es tan oscuro que una nube pequeña resalta muchísimo.
*   **Cantidad:** 8 Gránulos
*   **Gránulos recomendados:** `T31TDF` (Área Metropolitana de Barcelona).
*   **Meses:** Indiferente (mezclar Verano e Invierno).
*   **Qué debes ver exactamente en pantalla:**
    *   **2 Gránulos (Excepción 100% despejado):** Ni una sola nube en la ciudad ni en el mar. Barcelona brillando a pleno sol. La IA aprenderá que el gris claro del asfalto y el blanco de los polígonos industriales no son nubes.
    *   **6 Gránulos (El Contraste - 30% nube / 70% visible):** Nubes esparcidas cruzando desde el interior hacia el mar. Mitad de la nube sobre la ciudad, mitad de la nube sobre el agua azul marino. Queremos que la red aprenda cómo se ve el borde de una nube cuando el fondo es muy oscuro (mar) frente a cuando el fondo es ruidoso (ciudad).

### Caso D: Extremos Agrícolas y Zonas Inundadas (Sur)
Queremos confundir a la red con campos que parecen espejos de agua o campos de tierra muy clara.
*   **Cantidad:** 6 Gránulos
*   **Gránulos recomendados:** `T31TCE` (Delta del Ebro), `T31TCF` (Llanuras de secano).
*   **Meses y Composición visual exacta:**
    *   **3 Gránulos (Arrozales inundados):** Mayo/Junio en el Delta del Ebro. Debes ver los campos totalmente marrones u oscuros (inundados, parecen espejos de agua). El cielo debe tener nubes cruzando (20-40% de nubosidad) para que el reflejo del agua confunda al algoritmo antiguo pero no a la IA.
    *   **3 Gránulos (Secano árido):** Agosto. Llanuras áridas, amarillas y pálidas. Busca que haya nubes grandes (50% de cobertura) para que la IA aprenda a distinguir una nube blanca de un campo amarillento quemado por el sol.

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

---

## 3. Filosofía de Evaluación: La "Edición y Clasificación Manual de Píxeles"

Existe una regla inquebrantable para evaluar matemáticamente al modelo al finalizar el proyecto: **Bajo ningún concepto se evaluará el rendimiento de la IA contra la máscara SCL original de Sen2Cor en el conjunto de Test.**

Dado que la literatura científica y empírica (e.g., *Baetens, Desjardins & Hagolle, 2019*) demuestra que los algoritmos tradicionales como Sen2Cor cometen errores graves de clasificación (falsos positivos) ante la presencia de nieve y agua, usar su archivo SCL original como "verdad absoluta" para puntuar a la red neuronal llevaría a una paradoja inaceptable: el script estadístico penalizaría a la IA precisamente cuando acierta corrigiendo un fallo de la ESA.

**El Flujo de Trabajo obligatorio para el Test Set será el siguiente:**
1. Descargaremos los gránulos de Test incluyendo sus máscaras SCL a través del script [`002_download_test.py`](../scripts/002_download_test.py).
2. Utilizaremos el SCL de Sen2Cor *únicamente* como plantilla o "borrador" inicial para ahorrar trabajo.
3. Se realizará una **edición y clasificación manual exhaustiva en QGIS**, revisando los píxeles conflictivos (apoyados en las vistas `ColorReal.vrt` y `FalsoColor_Nieve.vrt`) y repintando a mano los errores de clasificación (ej. nieve marcada como nube).
4. Ese archivo corregido a mano se exportará como la **"Edición y Clasificación Manual de Píxeles" (Verdad Terreno)**.
5. Las métricas científicas del proyecto (F1-Score, IoU, Accuracy) se calcularán enfrentando la predicción matemática de la U-Net *exclusivamente* contra esta Verdad Absoluta revisada por un humano.
