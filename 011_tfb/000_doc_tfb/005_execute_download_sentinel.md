# Ejecución Descarga Sentinel-2

## Index

1. [Prerrequisitos](#1-prerrequisitos)
2. [Preparar Listados CSV](#2-preparar-listados-csv)
3. [Configurar Entorno Virtual](#3-configurar-entorno-virtual)
4. [Ejecutar Descarga](#4-ejecutar-descarga)

---

## 1 Prerrequisitos

- **Abre** o crea el archivo [../scripts/.env](../scripts/.env).
- **Añade** las credenciales de Copernicus Data Space Ecosystem (CDSE):
  ```env
  CDSE_USERNAME="tu_correo@ejemplo.com"
  CDSE_PASSWORD="tu_contraseña_secreta"
  ```

[←Index](#index)

## 2 Preparar Listados CSV

- **Abre** los listados de búsqueda:
  - [training_granules_sentinel_browser..csv](../scripts/training_granules_sentinel_browser..csv)
  - [test_granules_sentinel_browser.csv](../scripts/test_granules_sentinel_browser.csv)
- **Busca** los gránulos idóneos en el [Copernicus Browser](https://browser.dataspace.copernicus.eu/).
- **Sustituye** `YYYY-MM-DD` por la fecha real de la imagen.

[←Index](#index)

## 3 Configurar Entorno Virtual

- **Abre** la terminal en la carpeta [../scripts](../scripts).
- **Crea** el entorno virtual:
  ```bash
  python3 -m venv venv
  ```
- **Actívalo**:
  ```bash
  source venv/bin/activate
  ```
- **Instala** las dependencias definidas en [requirements.txt](../scripts/requirements.txt):
  ```bash
  pip install -r requirements.txt
  ```

[←Index](#index)

### Paso 4: Ejecutar la Descarga

Abrir terminal y lanzar el script correspondiente según la fase entrenamiento o test:

Para descargar el **Conjunto de Entrenamiento**:
```bash
python scripts/download_training.py
```

Para descargar el **Conjunto de Test**:
```bash
python scripts/download_test.py
```

Este script es un "todo en uno" (basado en la librería [`sentinel_downloader.py`](../scripts/sentinel_downloader.py)):
- *El script leerá los CSVs y realizará **cinco** acciones automáticas:*
  1. *Obtendrá el L1C (Bandas Físicas) a 10m y 20m.*
  2. *Descargará la máscara SCL (L2A), la colapsará físicamente de 12 a 5 Clases Maestras y la guardará como `[ID]_SCL_5classes.tif`.*
  3. *Generará archivos físicos GeoTIFF de alta resolución para **Color Real** (`[ID]_ColorReal.tif`) y **Falso Color Nieve** (`[ID]_FalsoColor_Nieve.tif`), garantizando una carga rápida y sin errores de interpolación en QGIS o visores web.*
  4. *Extraerá una versión de 8-bits reales RGB (`[ID]_GIMP.tif`) de la máscara matemática con sus coordenadas `.tfw` separadas para permitir su edición segura en editores fotográficos tradicionales (GIMP/Photoshop).*
  5. *Extraerá y procesará una miniatura `.png` de 1024x1024 píxeles de Color Real (`[ID]_thumbnail.png`) para facilitar la inspección visual rápida de los gránulos.*
- *Los resultados se guardarán limpios en `../download/training` y `../download/test`.*
- **Desactiva** el entorno al terminar:
  ```bash
  deactivate
  ```

[←Index](#index)
