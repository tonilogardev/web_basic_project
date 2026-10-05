# Inferencia "Serverless" y Procesamiento Efímero (Cloud-Native)

## 1. El Desafío del Almacenamiento Local
Durante la fase de **Entrenamiento y Validación** del modelo (Data Engineering), fue estrictamente necesario el almacenamiento de forma persistente de docenas de gránulos de Sentinel-2 (L1C y L2A) en infraestructura de disco duro local. Esto se debe a que una red neuronal, durante su optimización (backpropagation), requiere iterar sobre las mismas matrices topológicas (épocas) de forma exhaustiva. La descarga iterativa desde la nube en cada iteración habría saturado el ancho de banda y degradado el rendimiento computacional drásticamente.

Sin embargo, en la fase de **Producción/Inferencia**, el paradigma arquitectónico muta. El modelo entrenado (`baseline_model.pth`) únicamente requiere ingerir la nueva matriz radiométrica **una sola vez** para emitir su inferencia. 

La descarga y persistencia local de todas las adquisiciones sobre Cataluña correspondientes a un mes completo (aprox. 90 gránulos equivalentes a 100 GB) con el único objetivo de inferir una máscara de 3 MB, resulta una aproximación anticuada e insostenible a nivel de eficiencia y escalabilidad.

## 2. La Solución: Procesamiento Efímero (Serverless)
Para consolidar la transición hacia una arquitectura Cloud-Native, se ha implementado el script `cloud_model_catalonia.py`. Dicho script opera bajo el paradigma de **Procesamiento Efímero**, emulando el ciclo de vida de arquitecturas Serverless (e.g. AWS Lambda) dentro de una estación de computación.

El flujo de vida de los datos es estrictamente transaccional:

1. **Búsqueda Dinámica API**: Se introduce mediante consola un rango de fechas de interés. El sistema establece comunicación con la API OData de Copernicus Data Space Ecosystem (CDSE) resolviendo dinámicamente las huellas de gránulos que cubren la geometría de Cataluña.
2. **Entorno Desechable**: Por cada escena detectada, se instancian directorios temporales (`/tmp`) alojados y gestionados directamente por la volatilidad de la memoria RAM del sistema operativo.
3. **Descarga y Extracción Quirúrgica**: Mediante el uso de esquemas JWT con autorrefresco, el protocolo descarga los contenedores `.zip` al entorno efímero y extrae *únicamente* los 6 tensores ópticos requeridos (`B02, B03, B04, B08, B11, SCL`).
4. **Inferencia en Paralelo**: Las matrices se transcodifican en memoria RAM/VRAM en tensores espaciales, aplicándose inferencia deslizante por ventanas (parches de 512x512) mediante la red U-Net.
5. **Persistencia Mínima**: Las matrices de clasificación resultantes (`_SCL_UNET.tif` y el visualizador `_SCL_UNET_GIMP.tif`) se almacenan en disco duro definitivo (`visualizations/SCL_UNET_catalonia/`).
6. **Destrucción Total**: Finalizada la predicción, el sistema de ficheros efímero es completamente truncado, liberando la memoria.

## 3. Beneficios Arquitectónicos
* **Escalabilidad Infinita**: Dado que la huella de almacenamiento se mantiene en ~0 GB para las entradas, el límite de gránulos procesables se vincula exclusivamente al tiempo de ejecución, abstraído del hardware de almacenamiento.
* **Reducción de Costes**: La arquitectura queda preparada para un despliegue en contenedores efímeros Cloud, sin requerir el aprovisionamiento de costosos volúmenes de almacenamiento (EBS).
* **Usabilidad Interactiva**: La CLI (Command Line Interface) incorpora validaciones estrictas y carga diferida (lazy-loading) garantizando que el punto de entrada (entrypoint) responda instantáneamente al despliegue.
