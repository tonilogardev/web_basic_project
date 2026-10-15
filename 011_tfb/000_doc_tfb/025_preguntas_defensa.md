# Preguntas y Respuestas para la Defensa del TFB

A continuación, se documentan las posibles preguntas que puede hacer el tribunal y las respuestas estructuradas para demostrar conocimientos técnicos y dominio del proyecto.

---

## 1. Sobre la elección de la métrica de validación (Yolanda Colom Torrens - Presidenta)

**Pregunta del tribunal:**
*"Has hecho bastante hincapié en que habéis utilizado la métrica IoU (Intersection over Union) para evaluar el acierto de la red, descartando la métrica global de precisión (Overall Accuracy). ¿Podrías justificarme por qué tomaste esta decisión? ¿Qué problema nos causaba usar simplemente el Overall Accuracy en tu caso de uso?"*

**Respuesta preparada:**
>"Decidí usar la métrica IoU porque la cantidad de píxeles entre las distintas clases está muy desbalanceada. Tenemos muchísimos más píxeles de 'suelo desnudo' que de 'nubes' o 'nieve'. 
>
>Si hubiéramos usado el Overall Accuracy, una red que clasificara todos los píxeles de la imagen como 'suelo desnudo' habría obtenido un porcentaje de acierto altísimo (quizás un 90%), enmascarando los errores, pero sería un modelo inútil. El IoU penaliza esto porque hace la validación clase por clase de forma independiente, asegurándonos de que realmente detectamos las clases minoritarias que nos interesan."

---

## 2. Sobre la limitación de las sombras y el uso del DEM (Llorenç Miquel i Solé - Secretario)

**Pregunta del tribunal:**
*"En las conclusiones mencionas que la falta de un Modelo Digital de Elevaciones (DEM) hace que el modelo confunda las sombras de las nubes con las sombras topográficas. Si tuvieras que integrar este DEM en tu arquitectura U-Net actual, ¿cómo lo harías técnicamente?"*

**Respuesta preparada:**
>"Es una cuestión que he estado investigando, y la conclusión inicial es que no dependería exclusivamente de la Inteligencia Artificial. Mi enfoque sería híbrido. 
>
>Primero, usaría el DEM (Modelo Digital de Elevaciones) junto con los metadatos de la imagen (fecha, hora y ángulo solar) para calcular programáticamente de forma analítica dónde caen las sombras topográficas reales. 
>
>Una vez generada esa máscara de sombras orográficas, evaluaría dos caminos: o bien inyectar esa máscara como un canal extra de entrada en la U-Net, o bien utilizarla como una 'zona prohibida' (post-procesado) para filtrar las predicciones del modelo. 
>
>De hecho, he comprobado que modelos globales de estado del arte como CloudSen12 también sufren este mismo problema, por lo que considero que es un reto que requiere combinar geometría solar clásica con Deep Learning, especialmente en zonas tan montañosas como Cataluña."

---

## 3. Sobre la arquitectura web y el uso de PMTiles (Feliu - Vocal)

**Pregunta del tribunal:**
*"Has mencionado que has utilizado el formato PMTiles para servir la cartografía al frontend sin necesidad de desplegar un servidor cartográfico complejo. ¿Qué ventaja real te ha aportado esto y cómo ves la escalabilidad de esta arquitectura para el futuro?"*

**Respuesta preparada:**
>"La aplicación web actual funciona como un MVP (Producto Mínimo Viable) para demostrar los resultados. Al trabajar con una muestra reducida de imágenes, el formato PMTiles me permitía servir las máscaras estáticas de forma rápida y sin la complejidad de mantener un servidor cartográfico.
>
>Sin embargo, la visión a futuro es escalar la plataforma para procesar imágenes de toda Cataluña. Para ello, la arquitectura debe evolucionar hacia un backend de alto rendimiento desarrollado en Rust, donde se alojará el modelo de Deep Learning. 
>
>La idea es que el usuario seleccione una fecha, el servidor extraiga solo las bandas necesarias utilizando el formato COG (Cloud Optimized GeoTIFF), y el modelo calcule las máscaras de nubes 'on the fly' (al vuelo). Esto soluciona el problema del almacenamiento, ya que no guardaríamos las máscaras estáticas generadas, sino que se calcularían bajo demanda. Esta aproximación, además, abre la puerta a un posible modelo de negocio, decidiendo si la plataforma será de visualización gratuita y la descarga de datos procesados será de pago."

---

## 4. Sobre la elección arquitectónica de la U-Net (Yolanda Colom Torrens - Presidenta)

**Pregunta del tribunal:**
*"Hoy en día existen muchísimas redes neuronales convolucionales (CNN) estándar muy potentes (como ResNet). ¿Por qué esas redes no nos servirían para tu proyecto y por qué la U-Net es exactamente la que necesitas para trabajar con tu Verdad Terreno?"*

**Respuesta preparada:**
>"La diferencia fundamental reside en el objetivo final de la red. Una red convolucional clásica (como ResNet) sirve para **Clasificación de Imágenes**: toma una imagen de entrada y nos devuelve una sola etiqueta matemática (por ejemplo, 'esta imagen tiene nubes'). 
>
>Sin embargo, mi proyecto no busca saber *si* hay nubes, sino saber **exactamente dónde están**. A esto se le llama **Segmentación Semántica**. La arquitectura U-Net es perfecta para esto porque, además de tener un codificador (encoder) que extrae las características reduciendo la imagen, tiene un decodificador (decoder) que la vuelve a ampliar a su tamaño original. 
>
>La magia técnica está, efectivamente, en sus 'Skip Connections' (conexiones de salto). Estas conexiones evitan que se pierda el contexto espacial al encoger la imagen, chivándole al decoder exactamente en qué fila y columna debe colocar cada píxel. Así conseguimos generar máscaras de segmentación exactas que coinciden con nuestra Verdad Terreno."
