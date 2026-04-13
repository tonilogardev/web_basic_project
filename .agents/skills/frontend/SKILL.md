---
name: frontend-developer
version: 1.0.0
description: Habilidades y reglas específicas para la programación del Frontend. Invocación al solicitar cambios en UI, adición de componentes visuales o reestructuracion del DOM/Vite.
---

# Goal
Diseñar, programar y optimizar interfaces de usuario (User Interfaces) bajo los estrictos estándares arquitectónicos del proyeto: Pureza, Velocidad y "Menos es Más". Las interfaces deben ser hermosas, funcionales y libres de deudas técnicas.

# Philosophy: Less is More (Menos es Más)
*   **Vanilla over Frameworks**: El estándar oficial del proyecto es **Vite + Vanilla TypeScript + Vanilla CSS**.
*   **Prohibido React/Angular/Vue**: A menos que exista una directiva explícita del Arquitecto Principal o del Usuario, está estrictamente prohibido inicializar frameworks pesados de frontend.
*   **Cero TailWindJS por defecto**: Usa CSS nativo. Si necesitas control total, confía en Flexbox, Grid y CSS Variables (Custom Properties).

# Design Aesthetics: El estándar "Premium"
*   **Wow Effect**: La UI no puede parecer un "MVP Básico". Debe lucir rica visualmente al primer impacto.
*   **Micro-animaciones**: Involucra sutiles `transform` o `opacity` en `hover/active` param que la interfaz se sienta "viva".
*   **Glassmorphism y Dark Modes**: Da prioridad a paletas de colores sobrias, modernas (HSL) y desenfoques (blur) sobre colores genéricos y aburridos.
*   **Tipografías del 2026**: Huye de las fuentes predeterminadas por el navegador. Usa Inter, Roboto, o Outfit desde el sistema o webfonts ligeras.

# Engineering Standards
1.  **Multi-Stage Docker**: El servidor frontend NUNCA corre `node` en producción. Tu código debe estar diseñado para compilarse en una etapa `builder` (ej: `npm run build`) y servirse estáticamente con `Nginx` o el servidor web análogo por el puerto 80.
2.  **Strict Type Safety**: Todo código lógico debe ser Vanilla TypeScript (`.ts`). Evita los `any` como a la plaga.
3.  **Modular CSS**: Evita inyectar todo en un solo `style.css` si el proyecto crece, pero no uses librerías externas si no es estrictamente necesario.
4.  **No Placeholders Textuales**: Si necesitas imágenes, invoca tu herramienta nativa de `generate_image` param crear demostraciones visuales reales (Mockups).

# Workflow & Execution
*   **Paso 1 (Piensa):** Antes de tocar el DOM, mentaliza la estructura semántica de HTML5 necesaria param el Layout.
*   **Paso 2 (Código Base):** Configura los *tokens* principales en CSS (`:root { --primary-color: ... }`).
*   **Paso 3 (Aislamiento):** Si escribes un script de lógica UI, asegúrate de que esté diferido (`type="module"`) param no bloquear el hilo de pintura.
*   **Paso 4 (Móvil Primero):** Asume que el usuario abrirá esto desde una pantalla pequeña. Usa Responsive Native Web Design (Medias Queries simples).
