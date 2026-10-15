
## 1. Portada tiempo(0:00 - 0:30)
*(Página 1 ppt)*
"Buenos días al tribunal. Mi nombre es Antonio López y voy a presentar mi Trabajo Final de Grado titulado 'Desarrollo de un entorno GIS modular con Deep Learning y Web GIS', tutorizado por Favela Natalie Quintero Chona."

## 2. El Objetivo del Proyecto tiempo(0:30 - 1:30)
*(Página 2 ppt)*
"El objetivo de este proyecto es desarrollar un entorno geoespacial (GIS) base modular replicable. 
Un proyecto de principio a fin desde la idea hasta la muestra de los resultados todo con herramientas opensource.
El proyecto se divide en cuatro modulos.
La descarga de los datos.
El ETL y la creación de la verdad terreno.
El entrenamiento del modelo de deep learning.
y la creación y muestra de los resultados en una aplicación web."

## 3. Fase 1 Descarga tiempo(1:30 - 3:00)
*(Página 3 ppt)*
"Comenzando con la Fase 1, la adquisición de datos. 
Para el trabajo de la obtención de datos he utilizado las imagenes sentinel 2 de la constelación de satelites Copernicus.
Mediante la API de O-Data de la agencia espacial europea se descargan las imágenes que cubren el territorio de Cataluña en distintas fechas y zonas. 
De las 13 bandas espectrales de sentinel 2 L1C, solo se bajan las 6 bandas necesarias para entrenar al modelo: Bandas visibles (B2=azul, B3=verde, B4=rojo", el Infrarrojo Cercano (B8) que permite distinguir formas y los bordes de esta manera distingue las masas de vegetación, agua, costas, etc.. y las dos bandas de Infrarrojo de Onda Corta o SWIR (B11 y B12), para distinguir la nieve de las nubes.
Y se calculo el indice NDSI con las bandas B3=verde y B11=SWIR esto permite al modelo identificar la nieve.
Y bajamos el fichero de clasificación SCL creado por sen2cor que editaremos manualmente y lo usaremos como aprendizaje supervisado.

## 4. Fase 2: ETL y Truth Terrain tiempo(3:00 - 6:00)
*(Página 4 ppt)*
"Aqui entramos en la fase ETL donde manualmente crearemos una clasificación del terreno para usar aprendizaje supervisado en el entrenamiento de nuestro modelo.
Utilizaremos la clasificación fichero 'SCL' que bajamos de sentinel 2 y creada por el algoritmo sen2cor. Esta clasificación tiene 12 clases, y nosotros la colapsamos a 6 clases: No data, nube, nieve, agua, sombra, suelo.

Trasformamos el fichero SCL a un formato RGB para poder editarlo comodamente con herramientas de edición de imagen raster, usaremos el software opensource GIMP.
Creamos un fichero con las capas necesarias ara identificar visualmente el terreno.
Ejemplo:
2025-01-01_T31TDG_SCL_GIMP.tif
capa con el fichero SCL que editaremos
capa con el falso color nieve, bandas 11, 8, 4 (SWIR, NIR, Rojo)
capa con el RGB
Despues de la clasificación manual extraemos el fichero con la verdad del terreno en un formato adecuado para entrenar al modelo"

## 5. Fase 3: Modelo de Inteligencia Artificial tiempo(6:00 - 9:00)
*(Página 5 ppt)*

"Para la creación del modelo utilicé una red neuronal convolucional U-Net. 
Entrene al modelo desde cero porque me era mas sencillo que editar modelos ya entrenados.
Tener que usar modelos ya entrenados suponia tener que editar los canales de entrada y salida y reentrenar al modelo con mis datos.
Al disponer de mucha cantidad de imagenes para entrenarlo no era necesario utilizar modelos preentrenados. 

Se entreno al modelo con un tensores de 7 canales (las 6 bandas fisicas mas el indice NDSI) y los ficheros de la 'Verdad Terreno', aplicando una técnica de aprendizaje supervisado donde el modelo comparaba sus predicciones con la realidad para corregir sus errores.

El modelo realiza un fichero con la clasificación de las imagenes con las 6 clases mas ficheros de ayuda para la visualización de los resultados.

La comparación de la fase de test con los ficheros de la verdad del terreno fue buena como se puede ver en la matriz de confusión.

Evalué el modelo utilizando la métrica IoU (Intersection over Union), que analiza el acierto de cada clase de forma independiente. Como se ve en la Matriz de Confusión, el acierto en la clasificación de los pixeles es muy alto menos en la clase de sombras al confundir sombras topograficas con sombras de nubes."

## 6. Fase 4: Despliegue, explicación y demostración Web GIS tiempo(9:00 - 11:30)
*(Página 6 ppt)*
"Para poder mostrar los resultados del modelo entrenado cree una herramientas web para mostrarlos de forma interactiva.
Se creo con imagenes docker el framework svelte y la libreria cartografica de maplibre y se utilizo el formato mptiles para servir los resultados del modelo sin necesidad de crear un servidor cartografico web. 

La herramienta nos permite seleccionar unas cuantas imagenes RGB con sus mascaras de nubes e inetractuar manualmente con las trasparencias de las imagenes y mascaras.

## 7. enlaces qr a repositorio, aplicación web y pagina del la realización de TFB tiempo(11:30 - 12:00)
*(Página 7 ppt)*
"En esta diapositiva, tienen a su disposición los códigos QR del proyecto. Siguiendo la filosofía Open Source, el proyecto es completamente transparente y reproducible: pueden acceder al código fuente en GitHub, probar la aplicación Web GIS en vivo, y visitar la web de documentación donde detallo toda la evolución técnica de este trabajo."

## 8. Discusión Crítica (Limitaciones) y Conclusiones tiempo(12:00 - 15:00)
*(Página 8 ppt)*
"Para finalizar, y dejando esta última diapositiva en pantalla, quiero hacer una reflexión crítica y mirar hacia el futuro del proyecto. 

Como ya he comentado, la falta del Modelo Digital de Elevación (DEM) y el inmenso cuello de botella que supone crear la Verdad Terreno a mano son mis principales limitaciones actuales (ya que confunde las sombras topográficas con nubes). Por ello, mis futuras líneas de investigación atacan directamente estos frentes: voy a inyectar la altimetría de Cataluña, reescribiré el servidor backend en Rust para ganar velocidad de procesamiento, y exploraré modelos multimodales como PaliGemma o modelos preentrenados como CloudSen12 para automatizar la corrección de píxeles mediante IA.

Todo este esfuerzo lo he diseñado bajo una filosofía 100% Open Source, garantizando la replicabilidad científica y alineando mi trabajo con la Agenda 2030, la innovación tecnológica y la acción por el clima.

En conclusión, este Trabajo Final de Grado ha demostrado empíricamente que es viable construir un 'pipeline' geoespacial base desde cero. Y lo más gratificante no es solo que funcione, sino que es totalmente extrapolable a otros proyectos. De hecho, actualmente ya estoy aplicando esta misma arquitectura para procesar las imágenes del satélite MENUT de la Agencia Espacial Catalana.

Muchas gracias por su atención. Quedo a disposición del tribunal para responder a sus preguntas."