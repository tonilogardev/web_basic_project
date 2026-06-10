# Arquitectura del Proyecto DataSphere (009_dev_web)

Este documento describe la arquitectura global y los componentes del proyecto desarrollado para la asignatura de Desarrollo Web. El objetivo es proporcionar una visión clara de las piezas que conforman la solución, cómo interactúan entre sí y las tecnologías utilizadas.

## Resumen de la Arquitectura

El proyecto es una aplicación web full-stack diseñada bajo una **arquitectura orientada a microservicios/contenedores**. Está dividida en varios módulos independientes que se comunican entre sí para simular un ecosistema moderno de análisis de riesgos (DataSphere).

La arquitectura general está compuesta por:
1. **Frontend**: Interfaz de usuario interactiva.
2. **Backend (API REST)**: Servidor central que gestiona la lógica de negocio y el acceso a la base de datos.
3. **Base de Datos**: Sistema gestor de base de datos relacional.
4. **ETL Worker**: Servicio en segundo plano para la ingesta automatizada de datos.

## Componentes del Proyecto

A continuación, se detalla cada uno de los directorios principales dentro de `009_dev_web`:

### 1. `backend/` (Servidor API REST)
Es el núcleo lógico de la aplicación.
- **Tecnologías**: Node.js, Express, TypeScript.
- **ORM**: Prisma para interactuar con la base de datos de forma segura y tipada.
- **Patrón Arquitectónico**: Se ha aplicado el patrón **CQRS** (Command Query Responsibility Segregation).
  - **Commands**: Encargados de las escrituras en la base de datos (ej. `IngestRiskDataCommand` que guarda los datos del ETL de forma transaccional).
  - **Queries**: Optimizadas para lecturas analíticas complejas (ej. `GetHighRiskAssetsQuery`, `GetTotalValueExposedByHazardQuery`).
- **Seguridad**:
  - Rutas de usuario protegidas mediante **JWT** (JSON Web Tokens).
  - Endpoint del ETL protegido mediante **API Keys** (`x-api-key`) para comunicación máquina a máquina (M2M).

### 2. `010_etl_worker/` (Servicio de Ingesta de Datos)
Es un contenedor independiente que se ejecuta en segundo plano (Worker).
- **Tecnologías**: Node.js, TypeScript, `node-cron`.
- **Misión**: Simular el proceso Extract, Transform, Load (ETL).
  - **Extract**: Lee datos de sistemas externos (simulados mediante archivos locales de activos y peligros).
  - **Transform**: Limpia los datos, descarta peligros menores y calcula el `RiskScore` (Severidad * Probabilidad).
  - **Load**: Envía los resultados finales al `backend` utilizando peticiones HTTP seguras con API Keys.

### 3. `frontend/` (Interfaz de Usuario)
La cara visible de la aplicación para los analistas.
- **Tecnologías**: Svelte, Vite, TypeScript.
- **Misión**: Consumir la API del backend para pintar los datos de manera amigable e interactiva.
- Incluye vistas como cuadros de mando (dashboards) y, como desarrollo actual, mapas geolocalizados para explorar los activos y sus riesgos asociados.
- Se configura a través de **variables de entorno** (`.env`) para abstraer las URLs de la API según el entorno de despliegue.

### 4. `db/` (Base de Datos)
- **Tecnologías**: PostgreSQL.
- Contiene scripts iniciales (ej. `init.sql`) para preparar la estructura de la base de datos y los esquemas cuando los contenedores se levantan por primera vez.

### 5. `data/` y `delivery/`
- **`data/`**: Contiene ficheros crudos o documentos teóricos de referencia para el proyecto y las asignaturas.
- **`delivery/`**: Directorio donde se guardan los entregables (archivos Markdown, PDFs, capturas de pantalla de Postman, etc.) para la corrección por parte del profesorado.

---

## Flujo de Datos Típico (Ejemplo ETL)

1. El **ETL Worker** se despierta según su configuración CRON.
2. Lee los archivos de texto que simulan APIs meteorológicas y sísmicas.
3. Transforma los datos y calcula el nivel de riesgo.
4. Envía un `POST` al endpoint `/api/etl/ingest` del **Backend**, incluyendo su `x-api-key`.
5. El middleware del **Backend** verifica la API Key.
6. El controlador invoca al comando CQRS, el cual utiliza **Prisma** para iniciar una transacción y persistir el activo y su exposición en la base de datos **PostgreSQL**.
7. Posteriormente, un usuario analista accede al **Frontend**.
8. El frontend hace una petición `GET` protegida con JWT a `/api/analysis/high-risk`.
9. El **Backend** invoca la consulta (Query) CQRS, obtiene los datos directamente y los devuelve.
10. El **Frontend** renderiza un mapa o listado con los activos en peligro.
