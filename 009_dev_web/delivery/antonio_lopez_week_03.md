# Actividad 3: DataOps ETL y CQRS en DataSphere

**Alumno:** Antonio López
**Asignatura:** Desarrollo Web

## Introducción
En esta actividad, se ha simulado la ingesta automatizada de datos (ETL) y se ha aplicado el patrón de diseño **CQRS** en el backend. 

Se ha diseñado e implementado un contenedor independiente (`010_etl_worker`) encargado de simular el proceso de extracción, transformación y carga mediante llamadas Service-to-Service protegidas por **API Keys**. En el backend, se ha separado estrictamente la lógica de escritura (comandos) de la de lectura (consultas).

---

## Tarea 1: Diseño del Flujo ETL (Extract, Transform, Load)

Para la automatización de la recolección de datos, se ha desplegado un **Worker programado con Cron en un contenedor Docker independiente** (`010_etl_worker`). En un entorno de producción real, este worker se conectaría a APIs meteorológicas o sísmicas (ej. OpenWeather). En este caso simulamos el proceso ETL leyendo dos ficheros `.txt`.

### Fase 1: Extract (Datos Ficticios)
Se han generado los siguientes archivos en la ruta `010_etl_worker/data/`:

**`assets.txt`** (Activos Físicos)
```text
1,Sede Central,40.4168,-3.7038,ES-MD,50000000
2,Almacen Norte,41.3851,2.1734,ES-CT,20000000
3,Data Center Sur,37.3891,-5.9845,ES-AN,80000000
4,Oficina Valencia,39.4699,-0.3763,ES-VC,15000000
```

**`conditions.txt`** (Condiciones por peligro)
```text
1,1,Tornado,3,2
2,1,Earthquake,4,1
3,2,Rainstorm,2,4
4,3,Hurricane,5,3
5,4,Volcano,1,1
```

### Fase 2: Transform
Una vez leídos los archivos en memoria, el Worker aplica el ETL:
1. Filtra y **descarta** cualquier peligro con una severidad inferior a 3.
2. Calcula el **RiskScore** multiplicando `SeverityLevel * ProbabilityScore`.
3. Se añade dinámicamente la fecha y hora de ejecución al nombre del activo (ej: `"Sede Central - 2026-06-07 19:15"`).

Todo este proceso está orquestado mediante un trabajo programado (Cron Job) que se ejecuta **cada 15 minutos entre las 19:00 y las 19:59** de forma autónoma.

![ETL](./etl_001.png)

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
