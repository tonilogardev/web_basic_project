# Pasos para añadir una nueva aplicación a la arquitectura

## Index

1. [Crear el microservicio](#1-crear-el-microservicio)
2. [Configurar variables de entorno](#2-configurar-variables-de-entorno)
3. [Integrar en la arquitectura y homepage](#3-integrar-en-la-arquitectura-y-homepage)
4. [Despliegue a Producción (GitHub Secrets)](#4-despliegue-a-producción-github-secrets)
5. [Next steps](#5-next-steps)

---

## 1 Crear el microservicio

- **Crea** un nuevo directorio en la raíz del proyecto para la aplicación (ej: `010_antarctic_subsidence`).
- **Construye** el código fuente (ej: inicializando un proyecto de Vite).
- **Crea** un archivo `Dockerfile` en ese directorio. Es crítico capturar las variables de entorno como argumentos de construcción para que Vite las inyecte correctamente:
```dockerfile
ARG VITE_ANTARCTIC_SUBSIDENCE_URL
ENV VITE_ANTARCTIC_SUBSIDENCE_URL=$VITE_ANTARCTIC_SUBSIDENCE_URL
RUN npm run build
```

[←Index](#index)

## 2 Configurar variables de entorno

- **Edita** el archivo local [`.env.development`](../.env.development) para añadir la URL de desarrollo (ej: `ANTARCTIC_SUBSIDENCE_URL=http://localhost:5178/`).
- **Edita** el archivo local [`.env.production`](../.env.production) para añadir la URL definitiva de producción (ej: `ANTARCTIC_SUBSIDENCE_URL=https://antarctic.tonilogar.com/`).

[←Index](#index)

## 3 Integrar en la arquitectura y homepage

- **Edita** el archivo principal [`docker-compose.yml`](../docker-compose.yml).
- **Define** el nuevo contenedor bajo `services`.
- **Mapea** las variables de entorno de Docker Compose hacia los argumentos de construcción del Dockerfile:
```yaml
    build:
      context: ./010_antarctic_subsidence
      args:
        VITE_ANTARCTIC_SUBSIDENCE_URL: "${ANTARCTIC_SUBSIDENCE_URL}"
```
- **Añade** las etiquetas (`labels`) de enrutamiento dinámico para Traefik correspondientes al nuevo contenedor.
- **Edita** el archivo [`004_homepage/index.html`](../004_homepage/index.html) para incluir un nuevo botón hacia la aplicación usando la sintaxis de reemplazo de Vite: `<a href="%VITE_ANTARCTIC_SUBSIDENCE_URL%">`.

[←Index](#index)

## 4 Despliegue a Producción (GitHub Secrets)

- **Comprende** que el flujo CI/CD [production-deploy.yml](../.github/workflows/production-deploy.yml) reconstruye el `.env` del servidor copiando íntegramente el secreto de GitHub llamado `PROD_ENV_FILE`.
- **Copia** todo el texto de tu archivo local [`.env.production`](../.env.production).
- **Accede** a tu repositorio en GitHub > `Settings` > `Secrets and variables` > `Actions`.
- **Edita** el secreto `PROD_ENV_FILE` (pulsa el icono del lápiz).
- **Pega** el texto copiado (que ahora incluye la nueva variable `ANTARCTIC_SUBSIDENCE_URL`) y guarda.
- **Añade** (git add) y **comitea** los cambios de tu código.
- **Haz push** a la rama `main` o `main_dev_pro`. El despliegue automático se encargará de crear el `.env` fresco y compilar sin caché en el servidor.

[←Index](#index)

## 5 Next steps

- [004_production_variables_production_deploy.md](./004_production_variables_production_deploy.md)
- [README.md](../README.md)
