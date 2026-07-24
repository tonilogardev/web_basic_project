# Inferencia "Serverless" y Procesamiento Efímero (Cloud-Native)

## 1. El Desafío del Almacenamiento Local
Durante la fase de **Entrenamiento y Validación** del modelo (Data Engineering), fue estrictamente necesario descargar y almacenar de forma persistente docenas de gránulos de Sentinel-2 (L1C y L2A) en nuestro disco duro local. Esto se debe a que una red neuronal, durante su entrenamiento (backpropagation), necesita iterar sobre las mismas imágenes (épocas) miles de veces. Descargar una imagen desde la nube en cada iteración habría colapsado el ancho de banda y multiplicado los tiempos de entrenamiento por mil.

Sin embargo, en la fase de **Producción/Inferencia**, el paradigma cambia radicalmente. El modelo ya está entrenado (`baseline_model.pth`). Solo necesita ver cada imagen nueva **una sola vez** para emitir su predicción (máscara de clases). 

Descargar y guardar localmente todas las imágenes de Cataluña de un mes completo (aprox. 90 gránulos, que suponen cerca de 100 GB) simplemente para inferir una máscara de 3 MB, resulta una aproximación anticuada e insostenible a nivel de costes y hardware.

## 2. La Solución: Procesamiento Efímero (Serverless)
Para transicionar hacia una arquitectura Cloud-Native, hemos implementado el script `cloud_model_catalonia.py`. Este script opera bajo el concepto de **Procesamiento Efímero**, emulando el comportamiento de las funciones Serverless (como AWS Lambda) en nuestra estación de trabajo.

El flujo de vida de los datos es estrictamente transaccional:

1. **Búsqueda Dinámica API**: El usuario introduce por consola un rango de fechas (ej. `2026-06-01` a `2026-06-30`). El script se conecta al API de OData de Copernicus Data Space Ecosystem (CDSE) y descubre dinámicamente qué gránulos cubren la extensión de Cataluña en esos días.
2. **Entorno Desechable**: Para cada gránulo encontrado, el script abre un directorio temporal (`/tmp`) directamente gestionado por la memoria del sistema operativo.
3. **Descarga y Extracción Quirúrgica**: Utilizando el sistema de tokens JWT (con autorrefresco), el script descarga el empaquetado `.zip` al entorno temporal y extrae *únicamente* las 6 bandas necesarias (`B02, B03, B04, B08, B11, SCL`).
4. **Inferencia en Paralelo**: Las bandas se cargan en la RAM/VRAM en tensores y la red U-Net realiza la inferencia mediante ventanas deslizantes (parches de 512x512).
5. **Persistencia Mínima**: Las predicciones resultantes (`_SCL_UNET.tif` y la versión visual `_SCL_UNET_GIMP.tif`) se guardan en el disco duro definitivo (`visualizations/SCL_UNET_catalonia/`).
6. **Destrucción Total**: Finalizada la predicción, el directorio temporal completo (con sus pesadas bandas de entrada y ZIPs) es destruido de la memoria.

## 3. Beneficios Arquitectónicos
* **Escalabilidad Infinita**: Dado que la huella de almacenamiento se mantiene en ~0 GB para las entradas, el límite de gránulos procesables solo depende del tiempo de ejecución, no del disco duro.
* **Costes 0**: Prepara el código para ser desplegado en el futuro en contenedores efímeros de la nube, sin necesidad de aprovisionar y pagar por costosos volúmenes de almacenamiento (EBS).
* **Usabilidad Interactiva**: La CLI (Command Line Interface) cuenta con validaciones estrictas de cronología (evitando fechas previas al lanzamiento de Sentinel-2) y un sistema de importaciones diferidas que garantiza que la consola arranque y responda instantáneamente al operador humano.
