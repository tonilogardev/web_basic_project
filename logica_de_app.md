# Documentación Técnica: Arquitectura y Pipeline CI/CD

## 1. Filosofía y Principios
* **Simplicidad:** "Less is more". El sistema debe ser mantenible y evitar sobreingeniería.
* **Consistencia:** Uso obligatorio de **WSL (Windows Subsystem for Linux)** en desarrollo para garantizar la paridad con entornos de producción (Linux/macOS).

## 2. Gestión de Entorno (Docker)
El proyecto utiliza un único orquestador con inyección dinámica de variables.

* **Fichero:** `docker-compose.yml`
* **Configuraciones:**
    * - variables [.env.development](./.env.development): Entorno local, puertos de depuración y herramientas de desarrollo, terraform.
    * - variables [.env.production](./.env.production): Configuración optimizada para el servidor de producción (Hetzner).

## 3. Workflow de Desarrollo: `dev_run.sh`
Para agilizar el ciclo de vida en local, se utiliza un script de Bash que automatiza la limpieza y el despliegue.
- Ejecutar [dev_run.sh](./dev_run.sh).

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

2. El Repositorio Oficial (La fuente de la verdad)
Si de verdad necesitas acceso al 100% de los datos de Copernicus (todos los satélites, desde el día 1, en todos sus niveles de procesamiento), la única fuente oficial actual es el Copernicus Data Space Ecosystem (CDSE), impulsado por T-Systems y la ESA (sustituyó al antiguo SciHub).

Pros: Tienen absolutamente todo. S1, S2, S3, S5P. Tienen su propia API STAC y sus propios buckets S3.

Contras: Sus archivos nativos suelen venir en formato .SAFE (un zip gigante), no en COG individual por banda. Hacer renderizado al vuelo leyendo directamente del CDSE es mucho más duro y lento que hacerlo desde AWS, porque te obliga a procesar archivos que no están nativamente optimizados para streaming web.