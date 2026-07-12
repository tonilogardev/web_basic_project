# Ciclo de Vida del Modelo (MLOps y Lógica de Negocio)

Este documento define la estrategia metodológica de entrenamiento, validación y mejora continua del modelo de *Deep Learning* (U-Net). Describe el ciclo de vida completo de la Inteligencia Artificial, desde su creación inicial para el Trabajo de Fin de Grado hasta su mantenimiento en un entorno de producción real.

## Índice
- [1. Fase 1: Nacimiento y Validación (El TFB)](#1-fase-1-nacimiento-y-validación-el-tfb)
- [2. Fase 2: Puesta en Producción (Inferencia Automática)](#2-fase-2-puesta-en-producción-inferencia-automática)
- [3. Fase 3: Entrenamiento Continuo y "Human-in-the-Loop" (MLOps)](#3-fase-3-entrenamiento-continuo-y-human-in-the-loop-mlops)

---

## 1. Fase 1: Nacimiento y Validación (El TFB)
Esta fase constituye el núcleo académico del proyecto y se realiza una única vez para generar el **Modelo V1** fundacional.

*   **Entrenamiento Supervisado Inicial:** Se entrena la U-Net utilizando el conjunto de entrenamiento curado de **30 gránulos** descritos en la estrategia de datos. Durante este proceso (dividido en cientos de *Epochs*), la Función de Pérdida (*Loss Function*) evalúa matemáticamente el error entre la predicción de la red y la máscara real, ajustando los pesos internos mediante *Backpropagation*.
*   **Validación Ciega (Test):** Una vez la red ha convergido, se somete al examen final utilizando el **conjunto de Test oculto de 10 gránulos** (que la red jamás ha visto). 
*   **Métricas de Éxito:** Si las métricas (IoU, F1-Score) sobre el conjunto de test superan los umbrales de precisión esperados (y superan los resultados de algoritmos clásicos como Sen2Cor en casos complejos), se da por validada la arquitectura y nace oficialmente el Modelo V1.

## 2. Fase 2: Puesta en Producción (Inferencia Automática)
Una vez validado el Modelo V1, este abandona el entorno de entrenamiento y se integra en la aplicación Web (el visor GIS).
*   En esta fase, la red neuronal opera exclusivamente en modo "Inferencia" (solo predice, no aprende).
*   Cada vez que el satélite Sentinel-2 adquiere una nueva imagen sobre Cataluña, el sistema descarga los datos crudos L1C, los recorta en parches de 512x512 y se los pasa al Modelo V1.
*   El modelo genera instantáneamente la máscara de nubes/nieve, la cual se procesa y se muestra visualmente al usuario final en la interfaz web.

## 3. Fase 3: Entrenamiento Continuo y "Human-in-the-Loop" (MLOps)
Ningún modelo de IA es perfecto en el mundo real. La Fase 3 define cómo el modelo evolucionará a lo largo de los años sin necesidad de re-etiquetar miles de imágenes desde cero. Utilizaremos un enfoque de **Aprendizaje Activo (Active Learning)** mediante *Fine-Tuning* recurrente.

*   **Auditoría Humana:** El sistema funcionará en piloto automático en producción, pero ocasionalmente se observarán fallos en la aplicación web (ej. el modelo confunde una nueva cantera brillante o un secano extremo con una nube).
*   **Corrección Quirúrgica (Human-in-the-Loop):** Cuando se detecta un fallo sistemático, el experto humano **no** corrige todo un gránulo de 100x100 km. Únicamente extrae el recorte de 512x512 píxeles donde ha fallado la red y pinta manualmente la máscara correcta en ese recorte específico (generando un nuevo *Hard Negative*).
*   **Fine-Tuning Iterativo:** De forma periódica (ej. una vez al mes), se coge el Modelo V1 guardado y se re-entrena alimentándolo **solo** con el dataset original más las nuevas docenas de recortes corregidos.
*   **Evolución del Modelo:** La red no empieza de cero, sino que mantiene todo su conocimiento anterior y afina sus pesos para corregir esos casos específicos. De este re-entrenamiento rápido nace el **Modelo V2**, que se despliega automáticamente en producción. Este ciclo de mejora continua es infinito, haciendo que la Inteligencia Artificial sea cada día más robusta y adaptada a la dinámica del terreno catalán.
