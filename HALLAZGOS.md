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
