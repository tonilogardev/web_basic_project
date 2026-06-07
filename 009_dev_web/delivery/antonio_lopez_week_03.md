# Actividad 3: DataOps ETL y CQRS en DataSphere

**Alumno:** Antonio López
**Asignatura:** Desarrollo Web
**Fecha:** Junio 2026

## Introducción
En esta actividad, hemos ampliado la plataforma DataSphere para dar soporte a la ingesta automatizada de datos (ETL) y hemos aplicado el patrón de diseño **CQRS** (Command Query Responsibility Segregation) en el backend. 

Se ha diseñado e implementado un contenedor independiente (`010_etl_worker`) encargado de simular el proceso de extracción, transformación y carga mediante llamadas Service-to-Service protegidas por **API Keys**. En el backend, hemos separado estrictamente la lógica de escritura (comandos) de la de lectura (consultas) usando Prisma ORM, permitiendo así una arquitectura mucho más escalable y robusta preparada para alta concurrencia.

---

## Tarea 1: Diseño del Flujo ETL (Extract, Transform, Load)

Para la automatización de la recolección de datos, hemos desplegado un **Worker en un contenedor Docker independiente** que actúa como nuestro flujo de datos. En un entorno de producción real, este worker se conectaría a APIs meteorológicas o sísmicas. Para esta entrega, se ha cumplido el requisito de extraer la información base de unos ficheros crudos `.txt`.

*(INSERTA AQUÍ EL DIAGRAMA DE DRAW.IO. Recuerda incluir un bloque que indique que en la vida real es una API Meteorológica, pero que para el MVP usa ficheros locales de texto)*

---

## Tarea 2: Comando de Ingestión de Datos (Command - CQRS)

Para manejar la escritura (Load), hemos aplicado la "C" de CQRS. El script del ETL realiza el cálculo del `RiskScore` (Severity $\times$ Probability) y envía los datos transformados a un nuevo endpoint en el backend protegido.

En el backend, el archivo `IngestRiskDataCommand.ts` recibe esta información y, **mediante una transacción controlada de Prisma**, asegura la integridad de los datos en la base de datos PostgreSQL, insertando en las tablas `Asset`, `Hazard` y `AssetHazardExposure`.

### Código Relevante: `IngestRiskDataCommand.ts`
*(INSERTA AQUÍ UNA CAPTURA O PEGA EL CÓDIGO de `009_dev_web/backend/src/application/commands/IngestRiskDataCommand.ts`)*

### Pruebas de Ejecución del ETL (Logs)
El worker se ejecuta automáticamente a las 6:00 AM mediante la librería `node-cron`. Forzando su ejecución manual observamos cómo realiza el pipeline completo.

*(INSERTA AQUÍ LA CAPTURA DE LOS LOGS DEL TERMINAL. Para sacarla, ejecuta `docker exec -it dev_web_etl_worker npx ts-node src/index.ts run-now` y haz captura de los "Éxitos" impresos)*

---

## Tarea 3: Desarrollo de Consultas (Query - CQRS)

La lógica de lectura ha sido separada totalmente. Para responder a preguntas de negocio como *"¿Cuáles son los activos con mayor riesgo de exposición?"* hemos creado `GetHighRiskAssetsQuery.ts`. 

Esta query no utiliza lógica de dominio compleja, sino que **ataca directamente a la base de datos** pidiendo únicamente los campos necesarios y filtrando eficientemente mediante el motor de PostgreSQL aquellos activos con un valor de exposición superior a un límite crítico (ej: > 10.000.000).

### Código Relevante: `GetHighRiskAssetsQuery.ts`
*(INSERTA AQUÍ UNA CAPTURA O PEGA EL CÓDIGO de `009_dev_web/backend/src/application/queries/GetHighRiskAssetsQuery.ts`)*

### Prueba del Endpoint de Lectura
*(INSERTA AQUÍ UNA CAPTURA DE POSTMAN. Realiza un `GET` a `http://api.dev-web.localhost:8001/api/analysis/high-risk` y haz captura del JSON que te devuelve la respuesta con código 200 OK)*

---

## Tarea 4: Autenticación Servicio a Servicio (API Keys)

Al separar la plataforma en dos contenedores (Backend y ETL Worker), se hacía necesario proteger el endpoint de ingesta contra peticiones externas maliciosas, ya que este endpoint no usa tokens JWT de un usuario, sino comunicación "Machine to Machine" (M2M).

Hemos implementado un middleware específico en Express (`apiKeyAuth.ts`) que comprueba que la cabecera `x-api-key` contenga un token pre-compartido de forma segura a través de las variables de entorno de Docker Compose.

### Código Relevante: Middleware `apiKeyAuth.ts`
*(INSERTA AQUÍ UNA CAPTURA O PEGA EL CÓDIGO de `009_dev_web/backend/src/presentation/middlewares/apiKeyAuth.ts`)*

### Pruebas de Seguridad en Postman

1. **Intento sin API Key (Acceso Denegado)**
   *(INSERTA AQUÍ CAPTURA DE POSTMAN: Haz un `POST` a `http://api.dev-web.localhost:8001/api/etl/ingest` SIN la cabecera x-api-key. Captura el Error 401 Unauthorized o 403)*

2. **Ingesta Correcta con API Key**
   *(INSERTA AQUÍ CAPTURA DE POSTMAN: Repite el mismo `POST` pero añadiendo en los Headers la key `x-api-key` con el valor que pusimos en el .env, por defecto `super_secret_etl_key_2026`. Captura el estado 201 Created)*

---

## Conclusión

El diseño de una arquitectura orientada a microservicios con un orquestador Docker nos ha permitido aislar el trabajo pesado de transformación de datos (ETL) en un entorno seguro y cronometrado. Al aplicar **CQRS**, hemos garantizado que las ráfagas de lectura que harán los analistas para ver los activos en peligro no bloqueen la base de datos ni los modelos de escritura de la ingesta de datos. Finalmente, asegurar el perímetro M2M con **API Keys** asienta unas bases fundamentales de DataOps y Ciberseguridad en arquitecturas distribuidas.
