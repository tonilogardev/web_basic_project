# Variables de Producción y GitHub Secrets

## Index

1. [El Problema de .env.production](#1-el-problema-de-envproduction)
2. [Configurar GitHub Secrets](#2-configurar-github-secrets)
3. [Automatización en GitHub Actions](#3-automatización-en-github-actions)
4. [Next steps](#4-next-steps)

---

## 1 El Problema de .env.production

- **Entiende** que los archivos con secretos como [`.env.production`](../.env.production) están ignorados en Git por seguridad.
- **Evita** copiar `.env.production` manualmente al servidor.
- **Inyecta** el contenido del archivo de forma automática durante el despliegue usando GitHub Secrets.

[←Index](#index)

## 2 Configurar GitHub Secrets

- **Copia** todo el texto multilínea de tu archivo local [`.env.production`](../.env.production).
- **Accede** a tu repositorio en GitHub > `Settings` > `Secrets and variables` > `Actions`.
- **Pulsa** el botón "New repository secret".
- **Rellena** los campos:
  - *Name*: `PROD_ENV_FILE`
  - *Secret*: (Pega el texto copiado).
- ***Visuals***:
    ![GitHub Secrets Config](./img/github_secrets_config.png)

[←Index](#index)

## 3 Automatización en GitHub Actions

- **Edita** el flujo de trabajo de despliegue [production-deploy.yml](../.github/workflows/production-deploy.yml).
- **Sustituye** las asignaciones manuales en el paso de despliegue SSH por una única inyección desde el secreto:
```yaml
            # Cargar el entorno desde GitHub Secrets
            echo "${{ secrets.PROD_ENV_FILE }}" > .env
```
- **Haz push** a la rama `main` o `main_dev_pro` para ejecutar el Action. El servidor leerá las nuevas variables automáticamente al reiniciar Docker.

[←Index](#index)

## 4 Next steps

- [README.md](../README.md)