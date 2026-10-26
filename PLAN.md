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
