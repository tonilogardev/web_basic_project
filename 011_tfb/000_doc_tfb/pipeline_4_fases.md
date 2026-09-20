# Pipeline Metodológico del Proyecto (4 Fases)

Este documento ilustra el diagrama de flujo metodológico de nuestro motor de inferencia de nieve y nubes, desde la adquisición de datos satelitales hasta la validación visual y estadística. 

Este diagrama está diseñado para incluirse en la documentación formal para ayudar a los evaluadores a comprender la arquitectura global de un solo vistazo.

## Diagrama de Flujo (Metodología)

```mermaid
graph TD
    %% Estilos
    classDef phase fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#000,font-weight:bold;
    classDef step fill:#e1f5fe,stroke:#0288d1,stroke-width:1px,color:#000;
    classDef output fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px,color:#000;

    %% FASE 1: ADQUISICIÓN
    subgraph FASE1 [FASE 1: Adquisición de Datos Sentinel-2]
        A[API Copernicus Hub] -->|Descarga Gránulos L2A| B(Bandas Ópticas B02, B03, B04)
        A -->|Descarga Gránulos L2A| C(Banda SWIR B11)
        A -->|Descarga Gránulos L2A| D(Máscara SCL Original)
    end
    class FASE1 phase;
    class A,B,C,D step;

    %% FASE 2: CURACIÓN Y GROUND TRUTH
    subgraph FASE2 [FASE 2: Curación de la Verdad Terreno]
        B --> E[Mapeo de Clases 12 -> 6]
        D --> E
        E -->|Corrección Visual de Errores| F(Edición Multicapa en GIMP)
        F --> G[Generación Ground Truth Definitiva]
    end
    class FASE2 phase;
    class E,F,G step;

    %% FASE 3: ENTRENAMIENTO U-NET
    subgraph FASE3 [FASE 3: Entrenamiento Arquitectura U-Net]
        C --> H{Cálculo del NDSI}
        B --> H
        H -->|Inyección de Índice Físico| I[Dataset de Entrenamiento]
        G -->|Máscaras Objetivo| I
        I --> J((Entrenamiento Red Convolucional U-Net))
    end
    class FASE3 phase;
    class H,I step;
    class J output;

    %% FASE 4: EVALUACIÓN Y VALIDACIÓN
    subgraph FASE4 [FASE 4: Evaluación Estadística y Multicapa]
        J --> K[Inferencia en Test Set]
        K --> L(Generación TIF Multicapa GIMP)
        K --> M(Cálculo Matriz de Confusión e IoU)
        L --> N[Auditoría Visual de Nieve vs Nubes]
        M --> O[Métricas Finales 84.6% IoU Nieve]
    end
    class FASE4 phase;
    class K,L,M step;
    class N,O output;

```

## Descripción de las Fases

1. **FASE 1 - Adquisición de Datos Sentinel-2:** Extraemos la información en crudo del satélite, separando la información puramente óptica (RGB) de la infrarroja (SWIR B11) que será clave posteriormente, además de capturar la clasificación base de la ESA (SCL).
2. **FASE 2 - Curación de la Verdad Terreno:** Es el trabajo manual de *Data Science*. Transformamos las 11 clases caóticas de Sentinel en 5 macro-clases lógicas (Nieve, Nube, Sombra, Agua, Tierra) y solucionamos los errores del algoritmo nativo mediante edición fotográfica (GIMP).
3. **FASE 3 - Entrenamiento Arquitectura U-Net:** La inteligencia artificial entra en juego. No solo le pasamos imágenes RGB, sino que le inyectamos matemáticamente el **NDSI (Normalized Difference Snow Index)** para que el modelo "aprenda" físicamente a diferenciar nieve de nubes blancas.
4. **FASE 4 - Evaluación Estadística y Multicapa:** Comprobación del éxito. El modelo predice escenarios desconocidos y evaluamos matemáticamente su rendimiento (IoU), además de generar paquetes visuales (4 capas) para revisión de los expertos.
