# GitHub Container Registry (GHCR) y CI/CD Zero-Downtime

## Index

1. [Arquitectura de Imágenes con GHCR](#1-arquitectura-de-imágenes-con-ghcr)
2. [Patrón de Coexistencia en docker-compose.yml](#2-patrón-de-coexistencia-en-docker-composeyml)
3. [Pipeline de CI/CD en GitHub Actions](#3-pipeline-de-cicd-en-github-actions)
4. [Permisos y Seguridad del Token](#4-permisos-y-seguridad-del-token)
5. [Ventajas y Zero Downtime en Producción](#5-ventajas-y-zero-downtime-en-producción)
6. [Next steps](#6-next-steps)

---

## 1 Arquitectura de Imágenes con GHCR

- **Comprende** que el servidor de producción (Hetzner VPS) no debe gastar CPU ni memoria RAM compilando código fuente ni resolviendo dependencias de Node.js / Vite / TypeScript.
- **Delega** la compilación de imágenes en los runners gratuitos de GitHub Actions.
- **Publica** automáticamente las imágenes precompiladas en el registro oficial **GitHub Container Registry (`ghcr.io`)** bajo la organización o usuario del proyecto:
  - `ghcr.io/tonilogardev/homepage:latest`
  - `ghcr.io/tonilogardev/tfb-viewer:latest`
  - `ghcr.io/tonilogardev/sentinel-viewer:latest`
  - `ghcr.io/tonilogardev/cassini-hackathons:latest`
  - `ghcr.io/tonilogardev/water-quality-api:latest`
  - `ghcr.io/tonilogardev/dev-web-frontend:latest`
  - `ghcr.io/tonilogardev/dev-web-backend:latest`
  - `ghcr.io/tonilogardev/dev-web-etl-worker:latest`

[←Index](#index)

## 2 Patrón de Coexistencia en docker-compose.yml

- **Aplica** el principio de "Menos es Más": un único archivo [`docker-compose.yml`](../docker-compose.yml) gobierna tanto el desarrollo local como la producción.
- **Define** simultáneamente las directivas `image:` y `build:` para cada servicio propio:

```yaml
  homepage:
    container_name: homepage
    image: ghcr.io/tonilogardev/homepage:latest
    build:
      context: ./004_homepage
      dockerfile: Dockerfile
      args:
        VITE_BASE_URL: "${VITE_BASE_URL}"
```

- **Comportamiento en Local:**
  - Al ejecutar `./dev_run.sh` o `docker compose up --build -d`, Docker compila el código fuente local desde `build:` y le asigna la etiqueta de la imagen.
- **Comportamiento en Producción:**
  - En el VPS Hetzner se ejecuta `docker compose pull` y luego `docker compose up -d`. Docker descarga directamente los binarios optimizados de `ghcr.io` sin necesidad de compilar nada en el servidor.

[←Index](#index)

## 3 Pipeline de CI/CD en GitHub Actions

- **Consulta** el flujo de trabajo en [`.github/workflows/production-deploy.yml`](../.github/workflows/production-deploy.yml).
- **El flujo se divide en dos fases secuenciales:**

### Fase 1: `build-and-push` (En la nube de GitHub)
1. Descarga el código fuente con `actions/checkout@v4`.
2. Inicializa Docker Buildx con `docker/setup-buildx-action@v3`.
3. Inicia sesión en `ghcr.io` usando el secreto nativo `${{ secrets.GITHUB_TOKEN }}` con permisos `packages: write`.
4. Vuelca las variables del secreto `${{ secrets.PROD_ENV_FILE }}` en `.env` para alimentar los argumentos de construcción (`args`).
5. Compila y publica todas las imágenes:
   ```bash
   docker compose build
   docker compose push
   ```

### Fase 2: `deploy` (En el VPS de Hetzner)
1. Requiere que la fase `build-and-push` haya terminado con éxito (`needs: build-and-push`).
2. Sincroniza la orquestación hacia `/opt/gis_platform` mediante SCP, excluyendo datos masivos (`visualizations`), carpetas de documentación y `.git`.
3. Se conecta por SSH al VPS y ejecuta el despliegue en caliente:
   ```bash
   cd /opt/gis_platform
   echo "${{ secrets.PROD_ENV_FILE }}" > .env
   mkdir -p letsencrypt && touch letsencrypt/acme.json && chmod 600 letsencrypt/acme.json
   docker compose pull
   docker compose up -d --remove-orphans
   docker image prune -f
   ```

[←Index](#index)

## 4 Permisos y Seguridad del Token

- **Requisito del Personal Access Token (PAT):**
  - Si empujas cambios que modifiquen archivos dentro del directorio `.github/workflows/`, tu token de GitHub debe tener explícitamente habilitado el scope:
    - ☑️ **`workflow`** *(Update GitHub Action workflows)*
  - Si el token carece de este permiso, Git rechazará el push con:
    `refusing to allow a Personal Access Token to create or update workflow ... without 'workflow' scope`.
- **Configuración:**
  - Gestiona tus tokens en: [https://github.com/settings/tokens](https://github.com/settings/tokens).
  - Configura el origen remoto en tu terminal local:
    ```bash
    git remote set-url origin https://<TU_TOKEN>@github.com/tonilogardev/web_basic_project.git
    ```

[←Index](#index)

## 5 Ventajas y Zero Downtime en Producción

1. **Zero Downtime (Sin caídas de servicio):**
   - Se eliminó el comando `docker compose down`.
   - Traefik sigue enrutando peticiones a los contenedores existentes mientras Docker descarga las nuevas imágenes en segundo plano. Cuando la nueva imagen está lista, Docker sustituye el contenedor en milisegundos.
2. **Protección de Recursos en Hetzner:**
   - La CPU del VPS se mantiene al mínimo (< 5%) y no se satura la memoria RAM con compilaciones pesadas de TypeScript o Vite.
   - Se erradican definitivamente los fallos por Out-Of-Memory (OOM).
3. **Rollbacks Inmediatos:**
   - Para regresar a una versión anterior, basta con cambiar el tag de la imagen en Compose y hacer `pull`, sin requerir recompilaciones.

[←Index](#index)

## 6 Next steps

- [004_production_variables_production_deploy.md](./004_production_variables_production_deploy.md)
- [009_steps_to_add_new_app.md](./009_steps_to_add_new_app.md)
- [README.md](../README.md)
