# Edición y Clasificación Manual de Píxeles con GIMP (El "GIMP Bridge")

Este documento detalla la metodología técnica utilizada para permitir la edición visual de máscaras geoespaciales (Scene Classification - SCL) utilizando editores fotográficos tradicionales como GIMP o Adobe Photoshop, garantizando la preservación matemática de los datos (radiometría) y su georreferenciación.

## Índice
1. [El Problema Técnico (Disonancia Radiométrica)](#1-el-problema-técnico-disonancia-radiométrica)
2. [La Solución: Arquitectura Encode/Decode](#2-la-solución-arquitectura-encodedecode)
3. [Flujo de Trabajo (Paso a Paso)](#3-flujo-de-trabajo-paso-a-paso)
4. [Archivos y Scripts](#4-archivos-y-scripts)

---

## 1. El Problema Técnico (Disonancia Radiométrica)

Las máscaras SCL originales de la ESA y las predicciones de la red neuronal U-Net son **Rásters Categóricos** de una sola banda. Esto significa que los píxeles no contienen información de color, sino valores matemáticos enteros (0, 1, 2, 3, 4) que representan clases lógicas (No Data, Suelo, Nube, Sombra, Nieve).

### 1.1 La limitación radiométrica del negro absoluto
Un editor fotográfico estándar como GIMP interpreta los archivos GeoTIFF de 8-bits en una escala lineal de grises (de `0` a `255`).
Un píxel con valor `4` (Nieve) tiene un brillo del **1.5%**. Para el ojo humano, este valor es indistinguible del `0` (Negro puro). Por lo tanto, al abrir un `.tif` matemático en GIMP, el usuario ve una imagen completamente negra, imposibilitando su edición.

### 1.2 El riesgo de destrucción radiométrica
Si se intenta visualizar la imagen utilizando herramientas de contraste, niveles o curvas en GIMP, los valores matemáticos originales se destruyen irreversiblemente (por ejemplo, un `4` se extrapola a `200` para ser percibido como gris claro). Si esta imagen alterada se emplea para entrenar un modelo, el proceso de convergencia colapsaría al no reconocer el valor `200`. Además, el software de edición gráfica tiende a descartar por defecto las cabeceras geográficas internas (CRS, Transform) al sobrescribir un TIF.

---

## 2. La Solución: Arquitectura Multicapa (Lienzo Único)


1. **Fase de Empaquetado (Multicapa)**: Utilizando la librería Pillow, ensambla un único archivo `[ID]_SCL_GIMP.tif` que contiene 3 capas (páginas) apiladas a 20 metros de resolución:
   - **Capa Base**: Color Real.
   - **Capa Intermedia**: Falso Color (Nieve).
   - **Capa Superior**: Máscara SCL a color (Verde, Blanco, Gris, Cyan).
2. **Edición Ergonómica**: El analista opera sobre un único archivo en GIMP, con capacidad para alternar la visibilidad de las capas de satélite subyacentes, procediendo a clasificar exclusivamente sobre la capa superior. Se prescinde del formato (`.xcf`), manteniendo el estándar abierto GeoTIFF.
3. **Fase de Decodificación**: Debido a que los editores fotográficos truncan los metadatos geográficos (GeoTIFF tags), el script `003_decode_gimp_edits.py` extrae únicamente la máscara editada, mapea los colores de vuelta a los valores matemáticos (0-4), y extrae las coordenadas geográficas inalterables del archivo `.vrt` original, restituyéndolas de forma automatizada en el archivo final (`[ID]_SCL_edited.tif`).

---

## 3. Flujo de Trabajo Metodológico

### Paso A: Generación Automática
El proceso de empaquetado es completamente automatizado. Tras la descarga de nuevas escenas satelitales, el sistema informático genera de forma autónoma los archivos finalizados en `_SCL_GIMP.tif` ubicados en los directorios correspondientes (`download/training/` o `download/test/`).
*Ejemplo:* `download/training/2025-02-13_T31TCH/2025-02-13_T31TCH_SCL_GIMP.tif`

### Paso B: Clasificación Visual y Edición
1. El archivo `_SCL_GIMP.tif` se inicializa en el entorno GIMP, importando las páginas radiométricas como capas independientes.
2. Se modula la opacidad de la capa superior (Máscara SCL) para superponerla visualmente con el terreno real en la capa inferior.
3. Se emplea la herramienta de selección paramétrica de color (Cuentagotas) para asegurar el uso exacto del valor RGB asignado a la clase a corregir (ej. Cyan puro para Nieve).
4. Mediante la herramienta de trazo duro (lápiz, sin difuminado ni anti-aliasing), se corrigen los píxeles erróneamente inferidos, garantizando que la modificación recaiga exclusivamente en la capa matricial superior.
5. Se efectúa la sobrescritura del archivo original (`[ID]_SCL_GIMP.tif`). El algoritmo de decodificación en Python posee la robustez necesaria para procesar la extracción matricial independientemente de si el archivo fue almacenado con capas preservadas o aplanadas.

### Paso C: Decodificación y Recuperación de la Verdad Terreno
Finalizado el proceso de auditoría visual, se procede a ejecutar el decodificador mediante el entorno virtual de Python:

```bash
source venv/bin/activate
python scripts/003_decode_gimp_edits.py
```

Este procedimiento escanea el sistema de archivos detectando las alteraciones manuales e invocando la reconstrucción geométrica y matemática. Estas imágenes consolidadas (`[ID]_SCL_edited.tif`), con sus sistemas de coordenadas perfectamente restaurados, conforman la **Verdad Terreno** (*Ground Truth*) definitiva, base fundamental tanto para la fase de entrenamiento como para la fase de validación cruzada.

---

## 4. Archivos y Scripts Relevantes

- [`scripts/gimp_tools.py`](../scripts/gimp_tools.py): Librería base. Contiene las funciones matriciales `create_multilayer_gimp` y `decode_multilayer_to_classes`. Utiliza `Pillow` para la manipulación multipágina y `rasterio` para la georreferenciación.
- [`scripts/003_decode_gimp_edits.py`](../scripts/003_decode_gimp_edits.py): Herramienta que recorre las carpetas `training` y `test` buscando archivos editados e invocando la reconstrucción matemática.
