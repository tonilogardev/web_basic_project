# Edición y Clasificación Manual de Píxeles con GIMP (El "GIMP Bridge")

Este documento detalla la metodología técnica utilizada para permitir la edición visual de máscaras geoespaciales (Scene Classification - SCL) utilizando editores fotográficos tradicionales como GIMP o Adobe Photoshop, garantizando la preservación matemática de los datos (radiometría) y su georreferenciación.

## Índice
1. [El Problema Técnico (Disonancia Radiométrica)](#1-el-problema-técnico-disonancia-radiométrica)
2. [La Solución: Arquitectura Encode/Decode](#2-la-solución-arquitectura-encodedecode)
3. [Flujo de Trabajo (Paso a Paso)](#3-flujo-de-trabajo-paso-a-paso)
4. [Archivos y Scripts](#4-archivos-y-scripts)

---

## 1. El Problema Técnico (Disonancia Radiométrica)

Las máscaras SCL originales de la ESA y las predicciones de la red neuronal U-Net son **Rásters Categóricos** de una sola banda. Esto significa que los píxeles no contienen colores, sino valores matemáticos enteros (0, 1, 2, 3, 4) que representan clases lógicas (Basura, Suelo, Nube, Sombra, Nieve).

### 1.1 El problema del negro absoluto
Un editor fotográfico estándar como GIMP interpreta los archivos GeoTIFF de 8-bits en una escala lineal de grises (de `0` a `255`).
Un píxel con valor `4` (Nieve) tiene un brillo del **1.5%**. Para el ojo humano, este valor es indistinguible del `0` (Negro puro). Por lo tanto, al abrir un `.tif` matemático en GIMP, el usuario ve una imagen completamente negra, imposibilitando su edición.

### 1.2 El peligro de la destrucción radiométrica
Si el usuario intenta hacer visible la imagen utilizando herramientas de contraste, niveles o curvas en GIMP, los valores matemáticos originales se destruyen irreversiblemente (ej. un `4` se estira a `200` para verse gris claro). Si esta imagen se guarda y se usa para entrenar un modelo, el modelo colapsará porque no reconocerá el valor `200`. Además, GIMP suele descartar por defecto las cabeceras geográficas internas (CRS, Transform) al sobrescribir un TIF.

---

## 2. La Solución: Arquitectura Multicapa (Lienzo Único)

Para superar estas limitaciones sin forzar al analista a utilizar herramientas GIS complejas para tareas de pintura, se ha diseñado una arquitectura puente basada en un **TIFF Multicapa**.

1. **Fase de Empaquetado (Multicapa)**: El descargador automático intercepta las bandas ópticas y la máscara SCL matemática. Utilizando la librería Pillow, ensambla un único archivo `[ID]_SCL_GIMP.tif` que contiene 3 capas (páginas) apiladas a 20 metros de resolución:
   - **Capa Base**: Color Real.
   - **Capa Intermedia**: Falso Color (Nieve).
   - **Capa Superior**: Máscara SCL a color (Verde, Blanco, Gris, Cyan).
2. **Edición Ergonómica**: El analista abre un único archivo en GIMP, puede encender y apagar las capas de satélite subyacentes, y pinta exclusivamente sobre la capa superior. No dependemos de formatos propietarios (`.xcf`), manteniendo el estándar abierto GeoTIFF.
3. **Fase de Decodificación (Resiliencia Geográfica)**: Los editores fotográficos destruyen los metadatos geográficos (GeoTIFF tags). Por ello, el script `003_decode_gimp_edits.py` extrae únicamente la máscara pintada, mapea los colores de vuelta a los valores matemáticos (0-4), y **roba las coordenadas geográficas inalterables** del archivo `.vrt` original, inyectándolas por la fuerza en el resultado final (`[ID]_SCL_edited.tif`).

---

## 3. Flujo de Trabajo (Paso a Paso)

### Paso A: Generación Automática
No tienes que hacer nada. Cuando descargas nuevos gránulos, el sistema generará de forma automática archivos terminados en `_SCL_GIMP.tif` dentro de sus respectivas carpetas en `download/training/` o `download/test/`.
*Ejemplo:* `download/training/2025-02-13_T31TCH/2025-02-13_T31TCH_SCL_GIMP.tif`

### Paso B: Edición Fotográfica
1. Abre el archivo `_SCL_GIMP.tif` en GIMP. Te pedirá importar las páginas como capas. Acéptalo.
2. Juega con la opacidad de la capa superior (Máscara SCL) para ver el terreno real en la capa inferior.
3. Utiliza la herramienta de **Cuentagotas** para seleccionar el color oficial que deseas aplicar (ej: Cyan puro para Nieve).
4. Utiliza el **Lápiz** (sin difuminado de bordes) para corregir los píxeles erróneos **asegurándote de pintar única y exclusivamente en la capa superior**.
5. Selecciona `Archivo > Sobrescribir [ID]_SCL_GIMP.tif` (File > Overwrite). Si te pregunta si deseas guardar las capas o aplanar la imagen, elige la que prefieras. El decodificador Python es lo bastante inteligente para encontrar tu máscara en ambos escenarios.

### Paso C: Decodificación y Recuperación
Cierra GIMP. Abre tu terminal de Python y lanza el decodificador:

```bash
source venv/bin/activate
python scripts/003_decode_gimp_edits.py
```

Este script detectará automáticamente qué archivos han sido manipulados y generará las versiones definitivas `[ID]_SCL_edited.tif`. Estas imágenes matemáticas, con sus coordenadas perfectas restauradas, actuarán como la **Verdad Terreno** final para el entrenamiento o validación.

---

## 4. Archivos y Scripts Relevantes

- [`scripts/gimp_tools.py`](../scripts/gimp_tools.py): Librería base. Contiene las funciones matriciales `create_multilayer_gimp` y `decode_multilayer_to_classes`. Utiliza `Pillow` para la manipulación multipágina y `rasterio` para la georreferenciación.
- [`scripts/003_decode_gimp_edits.py`](../scripts/003_decode_gimp_edits.py): Herramienta que recorre las carpetas `training` y `test` buscando archivos editados e invocando la reconstrucción matemática.
