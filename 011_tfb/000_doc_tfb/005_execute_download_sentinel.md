# Flujo de Ejecución: Descarga Sentinel-2

## Índice

1. [Prerrequisitos](#1-prerrequisitos)
2. [Configuración de Datasets CSV](#2-configuración-de-datasets-csv)
3. [Despliegue del Entorno Virtual](#3-despliegue-del-entorno-virtual)
4. [Ejecución de las Rutinas de Descarga](#4-ejecución-de-las-rutinas-de-descarga)

---

## 1 Prerrequisitos

- **Apertura o creación** del archivo de configuración de variables de entorno [../scripts/.env](../scripts/.env).
- **Asignación** de las credenciales de autenticación correspondientes al Copernicus Data Space Ecosystem (CDSE):
  ```env
  CDSE_USERNAME="usuario@ejemplo.com"
  CDSE_PASSWORD="contraseña_segura"
  ```

[←Índice](#índice)

## 2 Configuración de Datasets CSV

- **Apertura** de los archivos de registro de cuadrículas:
  - [training_granules_sentinel_browser..csv](../scripts/training_granules_sentinel_browser..csv)
  - [test_granules_sentinel_browser.csv](../scripts/test_granules_sentinel_browser.csv)
- **Selección e identificación** de gránulos estratégicos mediante la interfaz [Copernicus Browser](https://browser.dataspace.copernicus.eu/).
- **Sustitución** del campo `YYYY-MM-DD` por la ventana temporal (fecha) efectiva de la captura.

[←Índice](#índice)

## 3 Despliegue del Entorno Virtual

- **Apertura** de la interfaz de línea de comandos (CLI) en el directorio [../scripts](../scripts).
- **Creación** del entorno virtual de Python:
  ```bash
  python3 -m venv venv
  ```
- **Activación** del entorno de ejecución:
  ```bash
  source venv/bin/activate
  ```
- **Instalación** de las dependencias documentadas en [requirements.txt](../scripts/requirements.txt):
  ```bash
  pip install -r requirements.txt
  ```

[←Índice](#índice)

### 4 Ejecución de las Rutinas de Descarga

Desde el entorno virtual activo, se procederá a ejecutar el módulo de procesamiento asociado al bloque de datos objetivo:

Para iniciar la ingesta del **Conjunto de Entrenamiento**:
```bash
python scripts/001_download_training.py
```

Para iniciar la ingesta del **Conjunto de Test**:
```bash
python scripts/002_download_test.py
```

El algoritmo central se encuentra implementado en el submódulo [`sentinel_downloader.py`](../scripts/sentinel_downloader.py), el cual procesa las listas CSV y orquesta **cinco tareas simultáneas de preprocesamiento:**

1.  **Descarga Cruda:** Obtención paramétrica de los datos físicos L1C (Bandas Físicas) a resoluciones espaciales de 10m y 20m.
2.  **Conversión SCL:** Ingesta de la máscara SCL original (Nivel L2A) y su colapso dimensional mediante reclasificación de 12 clases iniciales a las **6 Clases Maestras** de predicción (incorporando la segmentación del agua), almacenándose como `[ID]_SCL.tif`.
3.  **Rasterización Visual:** Generación analítica de Vistas Virtuales (VRT) y rasters físicos limitados a **20 metros de resolución espacial**. Se ensamblan específicamente composiciones espectrales de **Color Real** y **Falso Color Infrarrojo (Nieve)**.
4.  **Codificación "GIMP Bridge":** Ensamblaje automatizado de las vistas visuales previas junto a la máscara SCL matemática en un tensor apilado (archivo TIFF multicapa: `[ID]_SCL_GIMP.tif`). Esta estructura de 3 niveles conforma un marco compatible para sistemas de edición manual avanzada. A la conclusión del empaquetado, el sistema ejecuta rutinas de depuración (eliminación de rasters temporales) para optimizar los recursos de almacenamiento físico.
5.  **Extracción de Metadatos Visuales:** Generación de una matriz PNG reducida a 1024x1024 píxeles (`[ID]_preview.png`) sobre espectro Color Real, orientada a rutinas de auditoría e inspección rápida.

Al finalizar la secuencia, los paquetes consolidados (`.jp2`, `.vrt` y compilaciones TIFF) quedan depositados en `../download/training` o `../download/test`.

- **Desactivación** del entorno a la conclusión de los procesos:
  ```bash
  deactivate
  ```

[←Índice](#índice)
