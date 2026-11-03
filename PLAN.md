# Plan

## web

### Aprobación humana registrada

- Aprobador indicado en el plan: Yefri
- Fecha: 2026-10-26
- IDs aprobados: H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-06


### Alcance y contratos observados

Se seleccionaron los seis hallazgos que estaban `Pendiente` en
`HALLAZGOS.md` (`H-WEB-01` a `H-WEB-06`): abarcan el flujo de sesión y
seguridad, responsabilidades, tipado, dependencias y pruebas, y no hay
hallazgos web seleccionados por el usuario de forma más acotada.

No existe `docs/ENDPOINTS.md`. Se preservará el comportamiento observado:

- Login: `POST http://localhost:8080/auth/login`, cuerpo con `username`,
  `password` y `client: 'angular-workshop'`, timeout de 5000 ms; si hay token,
  guarda token, usuario y preferencias y navega a `/dashboard`.
  Evidencia actual: `web/src/app/services/auth.service.ts:10-16`,
  `web/src/environments/environment.ts:1-4`,
  `web/src/app/services/session.service.ts:49-53` y
  `web/src/app/login/login.component.ts:44-71`. La prueba comprueba URL,
  cuerpo, timeout, persistencia y navegación en
  `web/src/app/login/login.component.spec.ts:76-103`.
- Dashboard: lee token y usuario; sin token navega a `/login`; con token hace
  `GET http://localhost:8000/api/tasks?owner=...` con cabecera Bearer, oculta
  tareas archivadas y conserva el tratamiento actual de etiquetas, orden y
  errores. Evidencia actual:
  `web/src/app/services/tasks.service.ts:8-13`,
  `web/src/app/dashboard/dashboard.component.ts:47-76` y
  `web/src/app/utils/legacy-format.ts:3-9`.
- Logout: elimina token y usuario, conserva preferencias y navega a `/login`.
  Evidencia actual: `web/src/app/services/session.service.ts:55-58` y
  `web/src/app/dashboard/dashboard.component.ts:79-82`.

Las pruebas de caracterización se escribieron y ejecutaron antes de modificar
el código de producción correspondiente. Ningún contrato HTTP se cambió.
Meta: al menos 85% de cobertura del código modificado; el porcentaje se midió
y registró.

### H-WEB-01 — Token de sesión en `localStorage`

- **Hallazgo:** `H-WEB-01` en `HALLAZGOS.md`, estado `Pendiente`.
- **Problema:** el token es accesible a JavaScript del origen. Sustituir
  `localStorage` por `sessionStorage` no elimina esa exposición; mantener el
  token solo en memoria cambiaría el comportamiento observado al recargar la
  aplicación.
- **Cambio propuesto:** no cambiar el almacenamiento dentro del alcance web
  actual. La alternativa recomendada requiere coordinación con el backend para
  acordar cookies `HttpOnly`, `Secure` y `SameSite` y un flujo compatible de
  autenticación, solicitudes y cierre de sesión. Hasta tener ese acuerdo, queda
  pendiente y se conserva el flujo existente; no se presenta una alternativa
  de frontend como solución completa.
- **Archivos web a tocar si se aprueba la coordinación:** `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts` y pruebas del flujo. El
  backend y los contratos no forman parte de este cambio.
- **Caracterización previa:** añadir pruebas del login exitoso que comprueben
  persistencia del token/usuario/preferencias y navegación; recarga con sesión
  persistida; carga de tareas con Bearer; logout que elimina token/usuario,
  conserva preferencias y navega a login. La prueba de recarga documentará
  explícitamente el comportamiento que se perdería con almacenamiento en
  memoria. No implementar hasta acordar el contrato de cookie.

### H-WEB-02 — Mensaje dinámico enlazado con `[innerHTML]`

- **Hallazgo:** `H-WEB-02` en `HALLAZGOS.md`; inicialmente `Pendiente`,
  actualmente `Resuelto`.
- **Problema:** mensajes construidos con entrada del usuario y texto de error
  del backend se interpretan como HTML. La sanitización de Angular reduce el
  riesgo, pero el contenido no necesita marcado dinámico.
- **Cambio propuesto:** representar el mensaje como texto (título y detalle
  tipados) y renderizarlo con interpolación Angular. Mantener el énfasis y el
  salto de línea mediante elementos HTML estáticos y conservar los textos y
  condiciones observados, sin introducir una sanitización manual ni duplicar
  mensajes.
- **Archivos a tocar:** `web/src/app/login/login.component.ts`,
  `web/src/app/login/login.component.html` y una prueba nueva
  `web/src/app/login/login.component.spec.ts`.
- **Caracterización previa:** cubrir validación de usuario/contraseña vacíos,
  respuesta sin token y error de backend; comprobar que se conservan título y
  detalle visibles. El runner actual de Vitest usa entorno `node`
  (`web/vitest.config.ts`) y no tiene instalado un entorno DOM; para no añadir
  dependencias, comprobar la plantilla por interpolación y ausencia de
  `[innerHTML]`, y validar que Angular la compila. Esto no equivale a una prueba
  de DOM en navegador y debe quedar como desviación/riesgo explícito.

### H-WEB-03 — HTTP, URL, sesión y navegación dentro de componentes

- **Hallazgo:** `H-WEB-03` en `HALLAZGOS.md`; inicialmente `Pendiente`,
  actualmente `Resuelto`.
- **Problema:** login y dashboard mezclan presentación, transporte y sesión;
  el acceso directo a URL y `localStorage` dispersa responsabilidades.
- **Cambio propuesto:** extraer autenticación/transporte y persistencia a
  servicios web pequeños con responsabilidades separadas; mantener la
  navegación en los componentes, que coordinan la presentación. Centralizar
  las URLs en configuración web si se extraen de los componentes. No cambiar
  endpoints, cuerpo, timeout, query, cabeceras ni claves actuales de sesión.
  No añadir dependencias.
- **Archivos a tocar:** `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`; servicios nuevos bajo
  `web/src/app/`; pruebas nuevas de servicios y componentes bajo
  `web/src/app/`; configuración web de URLs solo si hace falta introducirla.
- **Caracterización previa:** con Axios y navegación simulados, probar
  `POST` con URL, cuerpo y timeout actuales; escritura de las tres claves al
  login válido; `GET` con query y cabecera Bearer; redirección sin token;
  logout, eliminación de token/usuario y conservación de preferencias. Cubrir
  respuesta sin token y error de red, verificando los mensajes visibles
  actuales. Mantener los filtros y orden de tareas actuales.

### H-WEB-04 — Evaluación pendiente de Axios y Lodash

- **Hallazgo:** `H-WEB-04` en `HALLAZGOS.md`, estado `Pendiente`.
- **Problema:** `web/package.json` fija Axios `0.31.0` y Lodash `4.17.21`;
  `npm run audit:workshop` reportó advisories altos para ambas dependencias,
  además de vulnerabilidades transitivas.
- **Cambio propuesto:** primero evaluar el lockfile con el comando existente
  `npm run audit:workshop` y revisar avisos, versiones afectadas y mitigaciones.
  No actualizar, eliminar ni añadir dependencias sin evidencia y sin coordinar
  el impacto externo. Si se confirma un problema, preferir una versión corregida
  compatible o una utilidad nativa para el uso puntual de `lodash/merge`;
  preservar el merge de preferencias y el contrato HTTP.
- **Archivos a tocar si la evidencia exige corrección:** `web/package.json`,
  `web/package-lock.json` y, solo si se elimina Lodash,
  `web/src/app/login/login.component.ts` más sus pruebas.
- **Caracterización previa:** añadir antes de tocar las dependencias una prueba
  de carga/merge de preferencias (valores por defecto y valores guardados) y
  verificar que el login sigue enviando la misma solicitud. Ejecutar
  `npm test` y `npm run build` antes y después; registrar por separado el
  resultado de `npm run audit:workshop`. La caracterización se añadió y ejecutó,
  pero no se actualizaron dependencias: npm falló al resolver el árbol con
  `Cannot read properties of null (reading 'children')`. El lockfile ya tenía
  cambios previos y no se reconstruyó ni se forzó la instalación.

### H-WEB-05 — Tipado amplio y validación anidada

- **Hallazgo:** `H-WEB-05` en `HALLAZGOS.md`; inicialmente `Pendiente`,
  actualmente `Resuelto`.
- **Problema:** `any` en estados, solicitudes/respuestas y tareas evita que
  TypeScript detecte incompatibilidades; validaciones anidadas dificultan leer
  el flujo de login.
- **Cambio propuesto:** definir tipos para la solicitud/respuesta de login,
  usuario y tarea; usar `unknown` con guardas para errores externos; extraer
  validaciones a guard clauses y reutilizar tipos/formateo, sin cambiar
  mensajes, rutas ni datos enviados/recibidos. Mantener una responsabilidad por
  componente y evitar valores mágicos.
- **Archivos a tocar:** `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`,
  `web/src/app/utils/legacy-format.ts` y tipos nuevos bajo
  `web/src/app/` solo si no encajan con claridad en los archivos existentes;
  pruebas asociadas en `web/src/app/`.
- **Caracterización previa:** añadir casos para campos vacíos, login exitoso,
  respuesta sin token, error HTTP/red y estados de carga; dashboard con tareas
  archivadas y visibles, prioridades/etiquetas, respuesta vacía y error.
  Afirmar URLs, cuerpo, cabeceras, almacenamiento, orden y mensajes actuales.
  Ejecutar `npm test` y `npm run build` antes de iniciar el refactor y después.

### H-WEB-06 — Cobertura localizada solo en una utilidad

- **Hallazgo:** `H-WEB-06` en `HALLAZGOS.md`; inicialmente `Pendiente`,
  actualmente `Resuelto`.
- **Problema:** la única prueba localizada caracteriza `formatTaskLabel`;
  login, sesión, carga de tareas, errores y logout no tienen pruebas
  localizadas. No se ha medido cobertura.
- **Cambio propuesto:** ampliar pruebas de unidad de los comportamientos de
  login, dashboard y servicios, usando el runner existente y dobles de prueba;
  no introducir una dependencia nueva salvo que la prueba DOM de `H-WEB-02`
  requiera una propuesta justificada. Separar casos por comportamiento y evitar
  duplicar escenarios ya cubiertos por `H-WEB-02`, `H-WEB-03` y `H-WEB-05`.
- **Archivos a tocar:** nuevas especificaciones `web/src/app/login/login.component.spec.ts`,
  `web/src/app/dashboard/dashboard.component.spec.ts` y las de servicios
  nuevos si se aprueba `H-WEB-03`; `web/vitest.config.ts` solo si una necesidad
  demostrada y aprobada exige ajustar el entorno.
- **Caracterización previa:** antes de refactorizar, crear pruebas de login
  válido/inválido, validación de campos, token ausente, tareas exitosas/vacías,
  error de carga y logout. Ejecutar `npm test` desde `web/` y
  `npm run test:coverage`; registrar resultados reales y cobertura del código
  modificado. Las pruebas actuales del plan son propuestas, no resultados.

### Secuencia y dependencias

1. Caracterizar el flujo compartido de login/sesión/tareas/logout para
   `H-WEB-03`, `H-WEB-05` y `H-WEB-06`, antes de tocar producción.
2. Resolver la viabilidad de prueba DOM para `H-WEB-02`; luego cambiar a
   interpolación y verificar que los mensajes se muestran como texto.
3. Extraer servicios y añadir tipos en cambios revisables, sin modificar el
   comportamiento capturado.
4. Ejecutar y registrar tests, build y cobertura del código modificado.
5. Mantener `H-WEB-01` pendiente hasta coordinación de cookies con el backend.
   No alterar el contrato HTTP en este plan.
6. Mantener `H-WEB-04` pendiente hasta actualizar y volver a auditar las
   dependencias con una resolución de npm que no fuerce versiones incompatibles.

### Registro de ejecución — web

La aprobación humana consignada arriba cubre estos IDs, pero no sustituye la
coordinación pendiente con backend para `H-WEB-01` ni resuelve el bloqueo de
dependencias en `H-WEB-04`.

| IDs | comando/acción desde `web/` | resultado real |
|---|---|---|
| H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-05, H-WEB-06 | Caracterización previa: `npm test` | Primer intento falló al cargar JIT Angular por falta de `@angular/compiler` en los specs; tras importar el compilador, pasó: 3 archivos, 12 pruebas. |
| H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-05, H-WEB-06 | Caracterización previa: `npm run build` | Pasó; advirtió dependencias CommonJS de Axios y Lodash. |
| H-WEB-01, H-WEB-03, H-WEB-05, H-WEB-06 | Caracterización previa: `npm run test:coverage` | Pasó con 12 pruebas; cobertura global 80,54% antes de cambios de producción. |
| H-WEB-04 | `npm run audit:workshop` | Falló el gate: 25 vulnerabilidades reportadas (10 moderadas, 9 altas, 6 críticas); el informe incluye Axios `<=0.33.0` y Lodash `<=4.17.23` como vulnerables. La solución automática `--force` propone versiones de Angular fuera de los rangos fijados. |
| H-WEB-04 | `npm view axios version`; `npm view lodash version` | El registro respondió Axios `1.20.0` y Lodash `4.18.1`. |
| H-WEB-04 | `npm install axios@1.20.0 lodash@4.18.1 --save-exact` | Falló con error interno de npm `Cannot read properties of null (reading 'children')`. No se modificaron `web/package.json` ni `web/package-lock.json` por esta acción. |
| H-WEB-04 | `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --save-exact axios@1.20.0 lodash@4.18.1` | También falló con `Cannot read properties of null (reading 'children')`; se verificó que los manifiestos siguen sin cambios. |
| H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-05, H-WEB-06 | Primer `npm test`, `npm run test:coverage` y `npm run build` después de producción | Fallaron por una declaración duplicada de `logout`; corregida antes de continuar. Una iteración adicional de pruebas detectó que Lodash mutaba el objeto de preferencias por defecto; se corrigió usando un objeto destino nuevo. |
| H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-05, H-WEB-06 | Final: `npm test` | Pasó: 6 archivos, 22 pruebas. |
| H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-05, H-WEB-06 | Final: `npm run test:coverage` | Pasó: 22 pruebas; 90,72% de cobertura global y 100% de líneas en los archivos de producción modificados. |
| H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-05, H-WEB-06 | Final: `npm run build` | Pasó; permanecen advertencias CommonJS de Axios y Lodash. |

**Desviación/riesgos:** no se hizo prueba DOM en navegador para H-WEB-02; Vitest
está configurado en Node y no se añadió dependencia. Se usaron aserciones de
estructura de plantilla y build Angular. `H-WEB-01` sigue usando `localStorage`
hasta coordinar cookies con backend. `H-WEB-04` sigue pendiente, los paquetes
no se actualizaron y el audit continúa fallando.

## api

### Aprobación humana registrada

- Aprobador indicado en el plan: Yefri
- Fecha: 2026-10-26
- IDs aprobados: H-API-01, H-API-02, H-API-03, H-API-04, H-API-05

### Alcance seleccionado y contrato observado

Este plan cubre `H-API-01`, `H-API-02`, `H-API-03`, `H-API-04` y `H-API-05`,
aprobados por Yefri el 2026-10-26. La fila de carga de archivos quedó
identificada explícitamente como `H-API-04` en `HALLAZGOS.md`.

`docs/ENDPOINTS.md` describe el contrato observado por el frontend para
`GET /api/tasks`, no un contrato acordado para todas las rutas de API. Se
preservan endpoints, métodos, estados de éxito y formatos de respuesta para
operaciones válidas observados en `api/app/main.py:70-128`. La autorización
estricta por identidad cambia intencionalmente el alcance de datos accesibles
mediante `owner`; la carga ahora rechaza nombre/extensión inválidos, exceso de
tamaño y colisiones con 400/413/409.
Antes de reemplazar el token Base64 hace falta coordinar con el emisor externo
los claims, algoritmo y claves; no se aceptará un formato nuevo no compatible
silenciosamente. No hay aprobación registrada para la coordinación externa.

La caracterización de `H-API-02`, `H-API-03` y `H-API-04` se ejecutó antes de
sus cambios de producción. `H-API-01` sigue bloqueado hasta acordar el formato
con el emisor del token; los parámetros de carga de `H-API-04` sí quedaron
acordados en esta sesión. `H-API-05` se resolvió tras revisar PyPI/OSV y repetir
la suite después de actualizar sus pins. La cobertura final fue 95% total,
93% en `api/app/main.py` y 100% en `api/app/file_storage.py`, superior a la
meta de 85%.

### H-API-01 — Token Base64 con secreto embebido

- **Hallazgo y estado:** `H-API-01` en `HALLAZGOS.md`, `Aprobado`.
- **Problema:** `legacy_identity` decodifica segmentos Base64 y compara un
  secreto fijo, pero no verifica firma, emisor ni audiencia
  (`api/app/main.py:16-28`).
- **Cambio propuesto:** validar JWT verificando firma con algoritmos permitidos
  explícitamente y claims `iss`, `aud` y `exp`; obtener configuración de
  variables de entorno, sin secretos reales en código. Mantener el contrato
  HTTP de las rutas y entregar handlers la identidad `username`/`role` ya
  esperada. Acordar primero con el emisor externo formato, algoritmo y claves.
  Añadir dependencia JWT solo si no existe alternativa mantenida y aprobada;
  justificarla y fijar versión compatible.
- **Archivos previstos:** `api/app/main.py`, `api/tests/test_api.py`,
  `api/requirements.txt` si la revisión justifica dependencia, o un módulo
  nuevo de autenticación dentro de `api/app/` y sus pruebas unitarias.
- **Caracterización previa:** probar token válido e inválido, ausencia de
  token, 401 y respuestas exitosas actuales. Después del acuerdo, cubrir
  firma inválida, expiración e `iss`/`aud` incorrectos, y token válido con la
  forma de identidad compatible. Usar solo credenciales aisladas de prueba.
- **Pendiente:** hasta recibir detalles del emisor, no se puede validar
  compatibilidad ni retirar de forma segura el formato legacy.

### H-API-02 — Autorización controlada por `owner`

- **Hallazgo y estado:** `H-API-02` en `HALLAZGOS.md`, `Resuelto`.
- **Problema:** listado y resumen permiten seleccionar otro propietario por
  query y creación permite fijarlo en el cuerpo
  (versión de partida, `api/app/main.py:67-71,78-85,90-93`).
- **Cambio propuesto:** derivar el propietario siempre de
  `identity["username"]` que entrega la dependencia de identidad en listado,
  resumen e inserción. No agregar permisos administrativos implícitos por rol.
  Mantener rutas, status codes, campos y forma de respuesta; un `owner` del
  cliente no permitirá acceder a datos de otra identidad. La garantía
  criptográfica de esa identidad sigue dependiendo de H-API-01.
- **Archivos previstos:** `api/app/main.py` y `api/tests/test_api.py`.
- **Caracterización previa:** fijar respuestas, orden y agregados actuales
  para usuario propio, omisión de `owner` y creación. Luego probar con dos
  identidades ficticias que query/cuerpo de otro `owner` no exponga ni cree
  datos bajo identidad ajena; validar estructura y status codes del usuario
  legítimo.
- **Riesgo:** consumidores que seleccionaban otros propietarios perderán esa
  capacidad; si se requiere excepción por rol debe acordarse explícitamente.

### H-API-03 — Consultas SQLite concatenadas

- **Hallazgo y estado:** `H-API-03` en `HALLAZGOS.md`, `Resuelto`.
- **Problema:** filtros, inserciones y selección de la fila creada se forman
  concatenando strings SQL (versión de partida,
  `api/app/main.py:70-71,84-87,93`).
- **Cambio propuesto:** reemplazar valores interpolados por placeholders `?`
  y parámetros enlazados en consultas de tareas y resumen, incluida la
  selección por `lastrowid`. Preservar columnas, orden, reglas de negocio y
  respuesta; mantener SQL fuera de serialización y evitar lógica duplicada.
- **Archivos previstos:** `api/app/main.py`, `api/tests/test_api.py`; extraer
  a repositorio bajo `api/app/` solo si se coordina como incremento separado
  de arquitectura.
- **Caracterización previa:** probar listado, resumen y creación con valores
  ordinarios, orden/forma de salida y status 201. Cubrir texto con comillas
  como dato y que el identificador retornado corresponda a la fila creada.

### H-API-04 — Nombre y contenido de archivo sin límites

- **Hallazgo y estado:** `H-API-04` en `HALLAZGOS.md`, `Resuelto`.
- **Problema:** el código original usaba directamente el nombre recibido y
  leía el contenido completo sin límites (`api/app/main.py:107-112` en la
  versión de partida).
- **Cambio realizado:** se añadió el servicio `api/app/file_storage.py` para
  validar nombres sin componentes de ruta, permitir `.txt` y `.md`, leer como
  máximo 11 bytes para imponer un límite de 10 y crear archivos de forma
  exclusiva. Una colisión devuelve 409 y no reemplaza el archivo. Nombres o
  extensiones inválidos devuelven 400; exceso de tamaño devuelve 413. La ruta
  conserva la respuesta de éxito y sus campos.
- **Política acordada en esta sesión (2026-11-02):** extensiones `.txt` y
  `.md`, máximo 10 bytes y rechazo de colisiones sin sobrescribir.
- **Archivos modificados:** `api/app/file_storage.py`, `api/app/main.py` y
  `api/tests/test_api.py`.
- **Caracterización previa:** antes de la política, `requirements.txt` con
  contenido de 24 bytes se aceptó con status 201 y bytes persistidos. Antes de
  implementar las restricciones, los nuevos casos detectaron que un nombre
  anidado devolvía 500, las extensiones no permitidas y el tamaño excesivo
  devolvían 201, y una colisión sobrescribía el archivo.

### H-API-05 — Revisión SCA de `urllib3` y `python-multipart`

- **Hallazgo y estado:** `H-API-05` en `HALLAZGOS.md`, `Resuelto`.
- **Problema:** las versiones coinciden con los paquetes indicados por
  `RETO.md`. PyPI/OSV reporta advisories aplicables a ambos pins.
- **Cambio propuesto:** consultar fuentes/scanner confiables, confirmar
  versiones resueltas, rangos afectados, severidad y mitigación. Si se
  confirma afectación, actualizar a versiones corregidas compatibles; si no,
  conservar los pins y registrar evidencia. No silenciar alertas ni relajar
  gates, y no añadir scanner como dependencia de ejecución.
- **Archivos previstos:** `api/requirements.txt` y cualquier lockfile existente
  dentro de `api/` que realmente se use; `api/tests/test_api.py` solo si la
  actualización altera comportamiento.
- **Caracterización previa:** ejecutar suite API e inventario SCA antes del
  cambio; repetir suite y consultar PyPI/OSV con las versiones candidatas. No
  se instaló un scanner como dependencia de ejecución.
- **Resolución:** la API JSON de PyPI para `urllib3 2.5.0` reportó advisories
  con CVE-2025-66418 y CVE-2025-66471 (fix 2.6.0), CVE-2026-21441 (2.6.3),
  CVE-2026-44431 (2.7.0), CVE-2026-97687 y CVE-2026-97689 (2.8.0).
  Para `python-multipart 0.0.21` reportó CVE-2026-24486 (0.0.22),
  CVE-2026-40347 (0.0.26), CVE-2026-42561 (0.0.27) y CVE-2026-53538,
  CVE-2026-53539 y CVE-2026-53540 (0.0.30/0.0.31). OSV confirmó rangos/fixes
  y severidades; las respuestas consultadas se vinculan en las fuentes abajo.
  Se actualizaron los pins a `urllib3==2.8.0` y
  `python-multipart==0.0.33`; ambas versiones reportaron cero advisories en
  PyPI y `pip check` no detectó incompatibilidades. OSV expuso vectores
  CVSS v3.1/v4.0 para los avisos; no se atribuye una puntuación numérica no
  devuelta por la consulta.

### Registro de ejecución — api

| IDs | comando/acción desde `api/` | resultado real |
|---|---|---|
| H-API-01, H-API-02, H-API-03, H-API-04, H-API-05 | `python -m pytest --cov=app --cov-report=term-missing` con el intérprete global | Falló porque el intérprete global no tenía `pytest`; no es resultado válido de la suite. |
| H-API-01, H-API-02, H-API-03, H-API-04, H-API-05 | Caracterización previa: `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` | 7 pruebas aprobadas; cobertura de `app/main.py` 93% antes de cambios de producción. Incluyó contrato observado de listado, resumen, carga, token ausente/inválido y el acceso a otro `owner` que luego se corrigió. |
| H-API-02, H-API-03 | Corrección antes del cambio: `.venv\Scripts\python.exe -m pytest tests/test_api.py -k "owner_is_always or treats_quotes" -q` | Fallaron las 2 pruebas: `owner=trainer` devolvió datos de trainer y una tarea con apóstrofes produjo HTTP 500. |
| H-API-02, H-API-03, H-API-04 | Suite después del cambio de autorización/SQL: `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` | 8 pruebas aprobadas; cobertura de `app/main.py` 93%. La prueba de owner quedó ligada a student; la prueba con apóstrofes devolvió HTTP 201 y conservó los datos. |
| H-API-05 | PyPI JSON y OSV para versiones instaladas/candidatas; actualización de dependencias con `python -m pip install -r requirements.txt` | PyPI reportó 12 registros por paquete en las versiones vulnerables (duplicados entre identificadores GHSA/PYSEC); OSV confirmó 6 advisories únicos por paquete y sus fixes. Los pins actualizados `urllib3 2.8.0` y `python-multipart 0.0.33` reportan cero advisories PyPI. |
| H-API-05 | `.venv\Scripts\python.exe -m pip check` | Pasó: no se encontraron dependencias incompatibles. |
| H-API-04 | Antes de implementar límites: `.venv\Scripts\python.exe -m pytest tests/test_api.py -k "nested_upload_filename or unsupported_upload_extension or oversized_upload or existing_upload_without_overwriting or uploads_markdown_file" -q` | 4 pruebas correctivas fallaron como se esperaba y el caso de `.md` válido pasó: nombre anidado dio 500, extensión/tamaño no permitidos dieron 201 y la colisión sobrescribió el archivo. |
| H-API-04 | Tras implementar límites: `.venv\Scripts\python.exe -m pytest tests/test_api.py -k "upload" -q` | 6 pruebas de carga aprobadas, incluida carga válida y casos de rechazo. |
| H-API-01, H-API-02, H-API-03, H-API-04, H-API-05 | Suite final: `.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` | 15 pruebas aprobadas; cobertura total 95%, `app/main.py` 93% y `app/file_storage.py` 100% (el reporte omite los archivos completamente cubiertos). |

Fuentes consultadas el 2026-11-02: [PyPI urllib3 2.5.0](https://pypi.org/pypi/urllib3/2.5.0/json),
[PyPI python-multipart 0.0.21](https://pypi.org/pypi/python-multipart/0.0.21/json),
[PyPI urllib3 2.8.0](https://pypi.org/pypi/urllib3/2.8.0/json),
[PyPI python-multipart 0.0.33](https://pypi.org/pypi/python-multipart/0.0.33/json),
[OSV GHSA-gm62-xv2j-4w53](https://osv.dev/vulnerability/GHSA-gm62-xv2j-4w53),
[OSV GHSA-2xpw-w6gg-jr37](https://osv.dev/vulnerability/GHSA-2xpw-w6gg-jr37),
[OSV GHSA-38jv-5279-wg99](https://osv.dev/vulnerability/GHSA-38jv-5279-wg99),
[OSV GHSA-qccp-gfcp-xxvc](https://osv.dev/vulnerability/GHSA-qccp-gfcp-xxvc),
[OSV GHSA-8988-9cw3-xx77](https://osv.dev/vulnerability/GHSA-8988-9cw3-xx77),
[OSV GHSA-vxq7-64xx-v4gw](https://osv.dev/vulnerability/GHSA-vxq7-64xx-v4gw),
[OSV GHSA-wp53-j4wj-2cfg](https://osv.dev/vulnerability/GHSA-wp53-j4wj-2cfg),
[OSV GHSA-mj87-hwqh-73pj](https://osv.dev/vulnerability/GHSA-mj87-hwqh-73pj),
[OSV GHSA-pp6c-gr5w-3c5g](https://osv.dev/vulnerability/GHSA-pp6c-gr5w-3c5g),
[OSV GHSA-v9pg-7xvm-68hf](https://osv.dev/vulnerability/GHSA-v9pg-7xvm-68hf),
[OSV GHSA-5rvq-cxj2-64vf](https://osv.dev/vulnerability/GHSA-5rvq-cxj2-64vf),
[OSV GHSA-6jv3-5f52-599m](https://osv.dev/vulnerability/GHSA-6jv3-5f52-599m).

**Pendientes/desviaciones:** `H-API-01` no cambia de formato hasta recibir
claims, algoritmo y mecanismo de claves acordados con el emisor. No se crearon
ni editaron `docs/ENDPOINTS.md` ni `docs/TESTING.md`; corresponden al paso de
documentación posterior a revisión humana. No se implementaron `H-API-06` ni
`H-API-07`, fuera del alcance seleccionado.
*** End of File
