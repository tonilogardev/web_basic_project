

## 1. Portada tiempo(0:00 - 0:30)
*(Página 1 ppt)*
"Buenos días al tribunal. Mi nombre es Antonio López y voy a presentar mi Trabajo Final de Grado titulado 'Desarrollo de un entorno GIS modular con Deep Learning y Web GIS', tutorizado por Favela Natalie Quintero Chona."


## 2. El Objetivo del Proyecto tiempo(0:30 - 2:30)
*(Página 2 ppt)*
"El objetivo es construir un 'pipeline' base, modular y escalable, capaz de usarlo como base para trabajar con proyectos GIS entrenando u modelo de machine Learning y mostrando los resultados en la web de forma interactiva para el usuario. Para demostrar que esta arquitectura funciona, he construido un caso de uso práctico y completo: He utilizado Sentinel-2 para entrenar una red neuronal U-Net para detectar nubes de imagenes sentinel_2, y he servido esos resultados en una aplicación web."

## 3. Metodología: Arquitectura del Pipeline tiempo(2:30 - 3:30)
*(Página 2 ppt)*
"Como ven en este esquema, el proyecto que he desarrollado se sostiene sobre cuatro grandes pilares técnicos que fluyen de forma secuencial:
1. La descarga y el procesamiento automatizado de datos satelitales vía API.
2. La creación manual de una verdad terreno mediante herramientas de edición de imagen (ETL).
3. El entrenamiento, test y validación de mi modelo de Deep Learning U-Net.
4. Y finalmente, un entorno Web GIS para desplegar los mapas."

## 4. Fase 1 Descarga y Proceso tiempo(3:30 - 4:30)
*(Página 3 ppt)*
"Descargué las bandas ópticas L1C mediante la API OData de Copernicus, para el entrenamiento del modelo. En concreto, bajé las bandas 2, 3, 4 y 11 que necesitaba para entrenar al modelo, y utilicé la clasificación SCL creada por el software sen2cor a partir de las imágenes con corrección atmosférica L2A, colapsando las clases de 12 a 6 clases."

## 5. Fase 2: Truth Terrain tiempo(4:30 - 5:30)
*(Página 4 ppt)*
"Desarrollé una mecánica ETL para poder editar y clasificar los archivos raster SCL con el software de edición de imagen "GIMP" para la creación de la verdad terreno. Una vez realizada esa verdad del terreno, pasé los datos a un formato apto para el entrenamiento del modelo de deep learning.
En el documento se puede ver la decisión de colapsar las 12 clases de la ESA a 6 clases para el entrenamiento de mi modelo."

## 6. Fase 3: Modelo de Inteligencia Artificial tiempo(5:30 - 8:30)
*(Página 5 ppt)*
"Con los datos limpios, pasé a la fase de Inteligencia Artificial. Decidí programar y entrenar una red neuronal U-Net desde cero usando PyTorch al disponer de una cantidad de datos enorme y de esta forma no modificar modelos preentrenados. Preparé los datos cortando las imágenes para poder trabajar y no colapsar la memoria de las tarjetas gráficas mediante 'Tiling'.
Entrené el modelo, lo testeé y realicé las métricas necesarias para validar el modelo comparándolo con la verdad terreno y los ficheros SCL originales de la ESA. Como pueden ver en la matriz de confusión, los resultados validan el modelo: hemos alcanzado un 95% de precisión en la clasificación del suelo y casi un 85% de IoU en la nieve, sin embargo, siendo rigurosos con los datos, la matriz también revela que la precisión cae significativamente al separar las sombras topográficas de las sombras de nubes. Esto se debe a una decisión técnica consciente: prescindimos del Modelo Digital de Elevaciones (DEM) para priorizar la computación espectral, por lo que, sin datos de altimetría, el modelo carece de la geometría tridimensional necesaria para distinguir si una sombra la proyecta una montaña o una nube."


## 7. Fase 4: Despliegue Web GIS tiempo(8:30 - 10:00)
*(Página 6 ppt)*
"La cuarta fase consiste en llevar los resultados al navegador del usuario final. Para ello, convertí las inferencias obtenidas con el modelo a un formato cartográfico web PMTiles. Esto permite que una aplicación web, desarrollada con contenedores Docker, Svelte y MapLibre, trabaje sin necesidad de montar servidores de mapas tradicionales y sea más fácil de gestionar."

## 8. Código y aplicación web de trabajo tiempo(10:00 - 12:00)
*(Página 7 ppt)*
"En la documentación muestro los enlaces QR al repositorio GitHub del proyecto, a la aplicación web con los resultados del proyecto y al desarrollo cronológico del trabajo de fin de bachelor. He de resaltar que la aplicación no está preparada todavía para teléfonos. Funciona, pero tengo que pensar bien cómo el usuario puede estar cómodo trabajando en móviles."


## 9. Discusión Crítica (Limitaciones) tiempo(12:00 - 15:00)
*(Página 8 ppt)*
"Discusión Crítica (Limitaciones):
Falta del Modelo Digital de Elevación (DEM): causa confusión en sombras topográficas.
Cuello de botella humano: crear la Verdad Terreno a mano no es escalable.

Futuras Líneas de Investigación:
Inyección de altimetría (DEM de Cataluña).
Servidor reescrito en Rust para procesamiento rápido y bajo demanda.
IA Multimodal (PaliGemma) para corregir píxeles de forma automática.
Usar modelos preentrenados como CloudSen12.

Viabilidad y Sostenibilidad
Filosofía 100% Open Source y replicabilidad científica.
Alineación directa con Agenda 2030 (ODS: Industria, Innovación y Acción por el Clima).
Códigos UNESCO (Aprendizaje Automático y Cloud Computing).

Conclusión
El pipeline base del proyecto es replicable y utilizable en otros proyectos.
Lo estoy aplicando en el satélite MENUT de la Agencia Espacial Catalana.
"


## 9. Conclusiones y Futuro tiempo(12:00 - 15:00)
*(Página 8 ppt)*
"Para finalizar, y dejando esta última diapositiva en pantalla, quiero hacer una reflexión crítica y mirar hacia el futuro del proyecto. 

Como ya hemos comentado, la falta del Modelo Digital de Elevación (DEM) y el inmenso cuello de botella que supone crear la Verdad Terreno a mano son nuestras principales limitaciones actuales. Por ello, mis futuras líneas de investigación atacan directamente estos frentes: vamos a inyectar la altimetría de Cataluña, reescribiremos el servidor backend en Rust para ganar velocidad de procesamiento, y exploraremos modelos como PaliGemma o CloudSen12 para automatizar la corrección de píxeles mediante IA.

Todo este esfuerzo se ha diseñado bajo una filosofía 100% Open Source, garantizando la replicabilidad científica y alineando nuestro trabajo con la Agenda 2030, la innovación tecnológica y la acción por el clima.

En conclusión, este Trabajo Final de Grado ha demostrado empíricamente que es viable construir un 'pipeline' geoespacial base desde cero. Y lo más gratificante no es solo que funcione, sino que es totalmente extrapolable a otros proyectos. De hecho, actualmente ya estoy aplicando esta misma arquitectura para procesar las imágenes del satélite MENUT de la Agencia Espacial Catalana.

Muchas gracias por su atención. Quedo a disposición del tribunal para responder a sus preguntas."