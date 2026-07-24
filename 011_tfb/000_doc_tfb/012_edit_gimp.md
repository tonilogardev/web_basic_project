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

## 2. La Solución: Arquitectura Encode/Decode

Para superar estas limitaciones sin forzar al analista a utilizar herramientas GIS complejas para tareas de pintura, se ha diseñado una arquitectura puente basada en la inyección temporal de color.

1. **Fase de Codificación (Encode)**: Los scripts principales que implementan la librería puente ([`gimp_tools.py`](../scripts/gimp_tools.py)) interceptan la máscara matemática generada (ya sea la descarga de Sen2Cor o la predicción de U-Net) y la transforman en un **GeoTIFF RGB de 3 bandas a todo color** (`[ID]_GIMP.tif`). A cada valor se le asigna su color real según la leyenda oficial del proyecto (Verde, Blanco, Gris, Cyan).
2. **Fase de Backup Geoespacial**: Durante la conversión, GDAL inyecta archivos separados (`.tfw` o `.xml`) que sobreviven aunque GIMP sobrescriba el archivo principal y destruya sus cabeceras geográficas originales.
3. **Fase de Decodificación (Decode)**: Una vez editada la imagen a color por el operador, el script ejecutable ([`003_decode_gimp_edits.py`](../scripts/003_decode_gimp_edits.py)) lee cada píxel RGB, calcula su distancia euclidiana hacia la paleta oficial de colores, y re-asigna el valor categórico puro (0-4), reconstruyendo el TIF matemático de una banda con su georreferencia original (`[ID]_SCL_edited.tif`).

---

## 3. Flujo de Trabajo (Paso a Paso)

### Paso A: Generación Automática
No tienes que hacer nada. Cuando descargas nuevos gránulos ([`002_download_test.py`](../scripts/002_download_test.py)) o ejecutas la inferencia de IA ([`006_predict.py`](../scripts/006_predict.py)), el sistema generará de forma automática archivos terminados en `_GIMP.tif`.
*Ejemplo:* `visualizations/SCL_UNET/TE_01_SCL_UNET_GIMP.tif`

### Paso B: Edición Fotográfica
1. Abre el archivo `_GIMP.tif` en GIMP.
2. Abre también las imágenes ópticas de referencia (`ColorReal.tif` o `FalsoColor_Nieve.tif`) como capas subyacentes para comprobar la realidad física del terreno.
3. Utiliza la herramienta de **Cuentagotas** para seleccionar el color oficial que deseas aplicar (ej: Cyan puro para Nieve).
4. Utiliza el **Lápiz** (sin antialiasing / difuminado de bordes) para corregir los píxeles erróneos sobre la capa `_GIMP.tif`.
5. Selecciona `Archivo > Sobrescribir [ID]_GIMP.tif` (File > Overwrite).

### Paso C: Decodificación y Recuperación
Cierra GIMP. Abre tu terminal de Python y lanza el decodificador:

```bash
source venv/bin/activate
python scripts/003_decode_gimp_edits.py
```

Este script detectará qué archivos han sido manipulados y generará las versiones definitivas `[ID]_SCL_edited.tif`. Estas imágenes matemáticas perfectas actuarán como la **Edición y Clasificación Manual de Píxeles** final.

---

## 4. Archivos y Scripts

- [`scripts/gimp_tools.py`](../scripts/gimp_tools.py): Es la librería base. Contiene las funciones matriciales `encode_to_rgb` y `decode_to_classes`. Utiliza `rasterio` y `numpy` para operaciones matriciales ultrarrápidas de inyección de color.
- [`scripts/003_decode_gimp_edits.py`](../scripts/003_decode_gimp_edits.py): Herramienta de usuario por línea de comandos para invocar el proceso de decodificación masiva.
