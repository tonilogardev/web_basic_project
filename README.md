# basic_server
basic_server
## Index

1.  [Requirements](#1-requirements)
2.  [Goals](#2-goals)
3.  [Tech Stack](#3-tech-stack)

---

## 1 Requirements

-   **OS**: Linux (Tested on Linux Mint 22 / Ubuntu 24.04).
-   **Docker**: v24.0+ (Engine) & Docker Compose v2.0+.
-   **Node.js**: v20.0+ (LTS) & npm v10.0+.
-   **Git**: v2.0+.

[←Index](#index)

## 2 Goals

-   Use only [docker-compose.yml](./docker-compose.yml).
-   Configure behavior via [.env.development](./.env.development) and [.env.production](./.env.production).
-   Parameterize all variables.
-   Adhere to "Less is more".
-   Maintain only `main` and `main_dev_pro` branches.
-   Follow step-by-step documentation in `001_documentation/`.

[←Index](#index)

## 3 Tech Stack

-   **App**: Node.js (Express) & Vite (React/Vue).
-   **Containerization**: Docker & Docker Compose.
-   **Routing & SSL**: Traefik (Auto HTTPS).
-   **CI/CD**: Jenkins (Pipeline as Code).
-   **Infrastructure**: Terraform (Hetzner Cloud).

[←Index](#index)

## Next Steps

-   **Skills**: Proceed to [001_Hetzner_login_domain_tokens.md](./001_documentation/001_Hetzner_login_domain_tokens.md)


# Documentación Técnica: Arquitectura y Pipeline CI/CD

## 1. Filosofía y Principios
* **Simplicidad:** "Less is more". El sistema debe ser mantenible y evitar sobreingeniería.
* **Consistencia:** Uso obligatorio de **WSL (Windows Subsystem for Linux)** en desarrollo para garantizar la paridad con entornos de producción (Linux/macOS).

## 2. Gestión de Entorno (Docker)
El proyecto utiliza un único orquestador con inyección dinámica de variables.

* **Fichero:** `docker-compose.yml`
* **Configuraciones:**
    * `.env.development`: Entorno local, puertos de depuración y herramientas de desarrollo.
    * `.env.production`: Configuración optimizada para el servidor de producción (Hetzner).

## 3. Workflow de Desarrollo: `dev.run.sh`
Para agilizar el ciclo de vida en local, se utiliza un script de Bash que automatiza la limpieza y el despliegue.

**Acciones del script:**
1. Limpieza de archivos temporales de Docker y volúmenes huérfanos.
2. `docker-compose down`: Parada de servicios activos.
3. `docker-compose build`: Reconstrucción de imágenes.
4. `docker-compose up`: Lanzamiento en `localhost` usando variables de desarrollo.

## 4. Estrategia de Git (Branching)
Se definen dos ramas principales para separar el desarrollo de la estabilidad:

| Rama | Propósito | Acción |
| :--- | :--- | :--- |
| **`main-dev-pro`** | Desarrollo activo e integración. | Despliegue automático a entorno de pruebas. |
| **`main`** | Producción estable. | Solo recibe Merges/PRs verificados desde la rama dev. |

## 5. Pipeline Profesional (Jenkins)
El despliegue no se basa en el movimiento de archivos, sino en la **inmutabilidad de imágenes**.

1. **Trigger:** Push a GitHub.
2. **Build:** Jenkins construye la imagen Docker en el servidor de Hetzner.
3. **Registry:** Jenkins sube la imagen a **Docker Hub** con el tag correspondiente.
4. **Deploy:** Actualización automática del contenedor en producción tirando de la nueva imagen del registro.

## 6. Infraestructura de Servidor (Hetzner)
Componentes core gestionados por Docker en el nodo principal:

* **Traefik:** Reverse Proxy con gestión automática de certificados SSL.
* **Jenkins:** Motor de CI/CD para la automatización total.
* **Homepage:** Dashboard visual para monitorización de servicios.