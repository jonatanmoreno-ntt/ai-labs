# Hallazgos

## web — Discovery

### Flujo observado; contrato no acordado

La ruta inicial redirige a `/login` y las rutas de login y dashboard cargan sus
componentes en `web/src/app/app.routes.ts:3-11`. El login envía usuario,
contraseña y cliente a `http://localhost:8080/auth/login` en
`web/src/app/services/auth.service.ts:10-16`, con URL en
`web/src/environments/environment.ts:1-4`. Si la respuesta contiene token,
guarda token, usuario y preferencias mediante
`web/src/app/services/session.service.ts:49-53`, y navega al dashboard en
`web/src/app/login/login.component.ts:70-71`.

El dashboard lee token y usuario mediante
`web/src/app/services/session.service.ts:11-38`, redirige a login si no
encuentra token en `web/src/app/dashboard/dashboard.component.ts:47-52`
y solicita tareas a `http://localhost:8000/api/tasks?owner=...`, incluyendo el
token en la cabecera Authorization, mediante
`web/src/app/services/tasks.service.ts:8-13`. El logout elimina token y
usuario mediante `web/src/app/services/session.service.ts:55-58` y navega a
login en `web/src/app/dashboard/dashboard.component.ts:79-82`; conserva las
preferencias.

`docs/ENDPOINTS.md` no existía al realizar este Discovery; por tanto, lo
anterior es comportamiento observado en el frontend, no un contrato acordado.
La autenticación y autorización de la API, así como la respuesta real del
backend de tareas, quedan pendientes de coordinación y prueba.

### Matriz de seguimiento

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-WEB-04 | web | Axios y Lodash tienen advisories aplicables según la auditoría del lockfile | Vulnerabilidad | `npm run audit:workshop` reportó vulnerabilidades altas en Axios `0.31.0` y Lodash `4.17.21`, entre otros hallazgos transitivos. La actualización no se completó: npm falló al resolver el árbol y las versiones permanecen instaladas. | `web/package.json:19-20`; resultado de `npm run audit:workshop` registrado en `PLAN.md` | alta | Pendiente |
| H-WEB-01 | web | El token de sesión se guarda en `localStorage` | Vulnerabilidad | El token sigue accesible a JavaScript del origen. La persistencia se centralizó, pero no se cambió el almacenamiento: una alternativa completa requiere coordinación de cookies `HttpOnly`, `Secure` y `SameSite` con backend, que está fuera de este cambio. | `web/src/app/services/session.service.ts:5,11-13,49-53`; consumo en `web/src/app/dashboard/dashboard.component.ts:47-52` | media | Pendiente |
| H-WEB-02 | web | Mensaje dinámico enlazado con `[innerHTML]` | Vulnerabilidad | Se resolvió el marcado dinámico de mensajes. El título y el detalle se renderizan por interpolación Angular, que los trata como texto, conservando el énfasis y el salto de línea. La plantilla se comprobó estructuralmente y el build pasó; no se ejecutó una prueba de DOM en navegador. | `web/src/app/login/login.component.html:38-42`; `web/src/app/login/login.component.spec.ts:135-144` | media | Resuelto — interpolación Angular para título y detalle |
| H-WEB-03 | web | Componentes acoplados a HTTP, URLs, sesión y navegación | Refactor | Se separaron autenticación HTTP, consulta de tareas y persistencia en servicios; las URLs se centralizaron en configuración. Los componentes conservan la navegación y presentación, sin cambiar rutas, cuerpo, timeout, query, cabeceras ni claves de sesión. | `web/src/app/services/auth.service.ts:9-18`; `web/src/app/services/tasks.service.ts:7-14`; `web/src/app/services/session.service.ts:10-59`; `web/src/environments/environment.ts:1-4` | media | Resuelto — servicios para HTTP y sesión; URLs centralizadas |
| H-WEB-05 | web | Tipado amplio y validación anidada en el flujo de login y dashboard | Refactor | Se reemplazó `any` por tipos de request, respuesta, sesión y tarea; login usa retornos anticipados y los errores externos se leen como `unknown`. Se conservaron los mensajes, el flujo y el orden de tareas observado. | `web/src/app/models.ts:1-42`; `web/src/app/login/login.component.ts:25-82`; `web/src/app/dashboard/dashboard.component.ts:28-83`; `web/src/app/utils/legacy-format.ts:1-9` | baja | Resuelto — tipos explícitos y validaciones con retorno anticipado |
| H-WEB-06 | web | Las pruebas localizadas cubrían solo una utilidad | Refactor | Se añadieron pruebas de caracterización para login, preferencias, persistencia, consulta de tareas, errores, filtros, etiquetas, logout y plantilla; Vitest reportó 22 pruebas aprobadas y 90,72% de cobertura global. | `web/src/app/login/login.component.spec.ts:19-144`; `web/src/app/dashboard/dashboard.component.spec.ts:20-123`; `web/src/app/services/session.service.spec.ts:6-73`; `web/src/app/services/request-error.spec.ts:4-29` | baja | Resuelto — pruebas de componentes y servicios; cobertura verificada |

## api — Discovery

### Flujo observado; contrato de API no acordado

`docs/ENDPOINTS.md` registra contratos observados por el frontend, incluido su
consumo de `GET /api/tasks`; no define un contrato acordado para todas las rutas
de la API. El comportamiento de abajo se deriva de `api/app/main.py` y queda
como observación, no como aprobación contractual.

`create_app()` elige la base SQLite mediante `WORKSHOP_DB_PATH` (por defecto
`./data/workshop.db`) y la carpeta de cargas mediante `WORKSHOP_UPLOAD_DIR`
(por defecto `./uploads`), crea la tabla `tasks` y siembra tres filas cuando
está vacía. Mantiene una conexión SQLite compartida en el cierre de la
aplicación. Evidencia: `api/app/main.py:31-49,137-141`.

`legacy_identity` elimina el esquema de autorización, decodifica el contenido
Base64 y espera cuatro segmentos separados por `|`: usuario, rol, expiración y
secreto. Comprueba que el secreto coincida con una constante del código y que
la expiración no haya pasado; no valida firma criptográfica, emisor ni
audiencia. Evidencia: `api/app/main.py:16-28`.

Rutas observadas:

| Ruta | Comportamiento observado |
|---|---|
| `GET /api/tasks` | Acepta `owner` opcional, pero actualmente deriva el propietario de la identidad; devuelve las tareas ordenadas por `id`. `api/app/main.py:70-79` |
| `POST /api/tasks` | Recibe un objeto JSON sin modelo Pydantic declarado, toma sus campos y devuelve la fila insertada con estado HTTP 201; el `owner` viene de la identidad. `api/app/main.py:82-97` |
| `GET /api/summary` | Acepta `owner` opcional, pero actualmente deriva el propietario de la identidad y calcula total, cantidades por estado y tareas abiertas de prioridad alta. `api/app/main.py:100-117` |
| `POST /api/requirements` | Recibe un archivo y lo almacena con nombre, extensión y tamaño validados; mantiene la respuesta 201 para cargas válidas. `api/app/main.py:120-128`; validación y escritura en `api/app/file_storage.py:20-52` |
| `GET /api/backend-health` | Consulta la URL `AUTH_HEALTH_URL` (o el valor local predeterminado) y devuelve estado y cuerpo; ante excepción devuelve estado `0` y el texto de la excepción. `api/app/main.py:130-137` |

En la versión inicial, las consultas SQLite se construían por concatenación y
el `owner` del cliente podía elegir datos ajenos o el propietario de una tarea
creada; `H-API-02` y `H-API-03` registran la corrección. La carga inicial no
validaba nombre, extensión ni tamaño; `H-API-04` registra la política y
corrección acordadas. No se ejecutaron pruebas ni se verificó el estado de
advisories durante este Discovery.

### Matriz de seguimiento

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-API-01 | api | Token Base64 con secreto embebido y sin firma, emisor ni audiencia | Vulnerabilidad | El contenido es decodificable y la validación depende de un secreto incluido en el código; sin firma verificable ni claims de emisor/audiencia, la identidad y los claims no tienen garantías criptográficas. | `api/app/main.py:16-28` | alta | Aprobado |
| H-API-02 | api | `owner` controlable por el cliente permite consultar datos de otra identidad | Vulnerabilidad | Se resolvió derivando el propietario del `username` entregado por la dependencia de identidad en listado, resumen e inserción, e ignorando los valores de `owner` enviados por el cliente. La garantía criptográfica del token sigue pendiente en H-API-01. | `api/app/main.py:71-72,87-92,100-101` | alta | Resuelto — owner derivado de la identidad extraída |
| H-API-03 | api | Consultas SQLite construidas por concatenación | Vulnerabilidad | Se parametrizaron las consultas de listado, resumen, inserción y selección de la fila creada; la prueba confirma que comillas se conservan como datos. | `api/app/main.py:72-75,89-96,103-106`; `api/tests/test_api.py:65-80` | alta | Resuelto — consultas SQLite parametrizadas |
| H-API-04 | api | El nombre de archivo recibido se usa directamente y no se limitan extensión ni tamaño | Vulnerabilidad | Se valida el nombre y la extensión, se leen como máximo 11 bytes para imponer un límite de 10 y se rechazan colisiones sin sobrescribir. | `api/app/file_storage.py:20-52`; `api/app/main.py:120-127`; `api/tests/test_api.py:96-187` | alta | Resuelto — nombre, extensión, tamaño y colisiones validados |
| H-API-05 | api | Versiones de `urllib3` y `python-multipart` fijadas en las versiones objetivo de revisión SCA | Sugerencia | PyPI/OSV confirmó advisories aplicables a los pins; se actualizaron a `urllib3 2.8.0` y `python-multipart 0.0.33`, sin advisories reportados para esas versiones en PyPI, y `pip check` no detectó incompatibilidades. | `api/requirements.txt:4-5`; registro SCA en `PLAN.md` | media | Resuelto — versiones corregidas verificadas con PyPI/OSV |
| H-API-06 | api | Rutas, persistencia, reglas y serialización concentradas en un módulo | Refactor | La creación de aplicación, inicialización SQLite, SQL, lógica de resumen, manejo de carga y conversión de filas conviven en `main.py`; dificulta probar y cambiar cada responsabilidad sin efectos colaterales. | `api/app/main.py:31-141` | baja | Aprobado |
| H-API-07 | api | Tipado crudo, excepciones amplias, anidamiento y lógica repetida | Refactor | Los handlers usan `dict[str, Any]`, hay capturas de `Exception` y condicionales anidados; el mapeo de filas y la construcción de consultas no se abstraen, lo que aumenta errores de validación y mantenimiento. | `api/app/main.py:8,20-28,58-68,70-79,100-117,130-137` | baja | Aprobado |