# Bandas de Entrenamiento para el Modelo (Tensor de 7 Canales)

Para entrenar la red neuronal (U-Net) no le pasamos simples fotografías a color (RGB de 3 canales). En su lugar, le entregamos un **tensor apilado de 7 capas (canales)**. Esta estructura se compone de 6 bandas físicas capturadas por el satélite Sentinel-2 y 1 índice matemático sintético.

A continuación se detalla qué es cada capa y para qué la utiliza el modelo:

## 1. El Espectro Visible (RGB)
*   **Canal 1: Banda 2 (Azul)**
*   **Canal 2: Banda 3 (Verde)**
*   **Canal 3: Banda 4 (Rojo)**
    *   **¿Para qué se usan?** Conforman la imagen real tal como la ven nuestros ojos. Le otorgan al modelo el contexto visual básico: formas de las montañas, texturas, colores naturales del suelo y las sombras orográficas (proyectadas por el relieve).

## 2. El Infrarrojo Cercano (NIR)
*   **Canal 4: Banda 8 (NIR)**
    *   **¿Para qué se usa?** Es extremadamente sensible a la vegetación y delimita muy bien los cuerpos de agua y las costas. Ayuda a la red a entender sobre qué tipo de superficie terrestre está trabajando y a perfilar mejor los bordes geográficos.

## 3. El Infrarrojo de Onda Corta (SWIR)
*   **Canal 5: Banda 11 (SWIR 1)**: Orientada principalmente a la detección de la **nieve** (absorbe esta radiación y se ve muy oscura/negra).
*   **Canal 6: Banda 12 (SWIR 2)**: Orientada principalmente a la detección de **nubes** (reflejan esta radiación y se ven muy brillantes).
    *   **¿Para qué se usan en conjunto?** Son **la clave absoluta del proyecto** para resolver la "paradoja visual" (nieve blanca vs. nube blanca). Al combinar cómo se apaga la nieve en la banda 11 y cómo brilla la nube en la banda 12, la red neuronal aprende a separar ambos elementos sin dudarlo.

## 4. El Índice Sintético (Capa Matemática)
*   **Canal 7: Índice NDSI (Normalized Difference Snow Index)**
    *   **¿Para qué se usa?** Es una capa artificial que calculamos nosotros cruzando la banda Verde (B3) y la SWIR (B11). Su fórmula matemática apaga el fondo y hace "brillar" únicamente los píxeles que contienen nieve. Al inyectar esto como una 7ª capa, forzamos matemáticamente a la red neuronal a que le preste atención prioritaria a la física de la nieve desde el primer segundo de entrenamiento.
