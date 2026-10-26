# Contratos HTTP consumidos por web

Esta sección documenta el contrato observado en el cliente Angular de `web/`.
Los ejemplos de credenciales y tokens son ficticios y solo ilustran el formato.
El cliente tipa las respuestas, pero esos tipos no validan automáticamente el
JSON recibido en runtime.

## `POST /auth/login`

### 1. Quién lo llama

`LoginComponent.login()` delega la petición a `AuthService.login()`.
La URL base actual es `http://localhost:8080`, configurada en
`web/src/environments/environment.ts`. Evidencia: `web/src/app/login/login.component.ts:44-80`,
`web/src/app/services/auth.service.ts:9-17`.

### 2. Qué envía

No establece headers personalizados. Envía el objeto de login como cuerpo JSON
mediante Axios. El servicio establece un timeout de 5000 ms. Antes de hacer la
petición, el componente evita el envío si usuario o contraseña están vacíos o
solo contienen espacios.

| Parte | Campo | Tipo | Requerido por el cliente |
|---|---|---|---|
| Body | `username` | string | Sí |
| Body | `password` | string | Sí |
| Body | `client` | string | Sí; valor enviado: `angular-workshop` |
| Header | — | — | No se configura un header manualmente |

Ejemplo:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "Workshop123!",
  "client": "angular-workshop"
}
```

La URL, el objeto enviado y el timeout están cubiertos por
`web/src/app/login/login.component.spec.ts:77-104`; el modelo está en
`web/src/app/models.ts:1-5`, y el timeout y llamada en
`web/src/app/services/auth.service.ts:6-17`.

### 3. Qué espera recibir en éxito

Axios considera exitosa una respuesta HTTP 2xx por defecto; el cliente no
comprueba un código de estado concreto. Espera un objeto con `token` y `user`.
El token debe existir para que el componente persista la sesión y navegue al
dashboard. El tipo declara `token` opcional, `user` requerido y, dentro de
`user`, `username` requerido y `displayName` y `role` opcionales.

| Campo | Tipo | Uso |
|---|---|---|
| `token` | string (opcional en el tipo; necesario para continuar el flujo) | Se guarda como token de sesión |
| `user` | objeto | Datos del usuario autenticado |
| `user.username` | string | Se guarda y se usa para consultar tareas |
| `user.displayName` | string opcional | Se conserva para mostrar el nombre |
| `user.role` | string opcional | Se conserva en los datos del usuario |

Ejemplo de forma aceptada por el test de cliente (el token es ficticio):

```json
{
  "token": "test-token",
  "user": {
    "username": "student",
    "displayName": "Workshop Student"
  }
}
```

Con un token presente, el componente guarda token y usuario y navega a
`/dashboard`. Si falta el token, muestra `El backend respondió sin token.` y
no navega. Evidencia: `web/src/app/models.ts:7-15`,
`web/src/app/login/login.component.ts:59-71`,
`web/src/app/login/login.component.spec.ts:77-117`.

### 4. Cómo reacciona ante errores

| Situación observada | Reacción del cliente |
|---|---|
| Usuario vacío o en blanco | No llama al endpoint; muestra `Ingrese un usuario.` |
| Contraseña vacía o en blanco | No llama al endpoint; muestra `Ingrese una contraseña.` |
| Respuesta HTTP no exitosa con `response.data.message` no vacío | Muestra el título `No se pudo autenticar a <usuario>.` y el detalle recibido |
| Timeout (5000 ms), error de red u otro error sin detalle de respuesta | Muestra el título anterior y el `message` del error de Axios si existe; si no, `Error desconocido` |
| Respuesta exitosa sin token | Muestra `El backend respondió sin token.`; no guarda sesión ni navega |
| Respuesta exitosa con JSON inesperado distinto del caso sin token | No hay validación runtime general de la respuesta; el tipo TypeScript por sí solo no la valida. La consecuencia exacta depende de la forma recibida |

El bloque `catch` conserva el error en consola con `console.error`. El detalle
de error del backend se muestra directamente en la UI. Evidencia:
`web/src/app/login/login.component.ts:47-79`,
`web/src/app/services/request-error.ts:10-25`.

El código no identifica un estado 401 de manera especial; cualquier rechazo
de la petición sigue el tratamiento general anterior. Las pruebas de error
cubren un rechazo que incluye `message`, no todas las respuestas HTTP ni un
timeout real: `web/src/app/login/login.component.spec.ts:120-135`.

### 5. Notas de seguridad

- El password se envía en el cuerpo de la petición; el ejemplo usa las
  credenciales ficticias documentadas para el laboratorio local.
- La sesión se guarda mediante `SessionService`, que utiliza `localStorage`
  para token y usuario. No es una cookie `HttpOnly`; sigue existiendo el riesgo
  de exposición del token ante ejecución de JavaScript no confiable.
  Evidencia: `web/src/app/services/session.service.ts:5-13,43-52`.
- Los mensajes dinámicos de login se muestran con interpolación Angular, no con
  `[innerHTML]`: `web/src/app/login/login.component.html:37-42`.
- El detalle devuelto por el backend se muestra como texto, pero el cliente no
  lo filtra para evitar revelar detalles internos.

## `GET /api/tasks`

### 1. Quién lo llama

`DashboardComponent.ngOnInit()` obtiene token y usuario de `SessionService` y
delega la petición a `TasksService.getTasks()`. La URL base actual es
`http://localhost:8000`, configurada en `web/src/environments/environment.ts`.
Evidencia: `web/src/app/dashboard/dashboard.component.ts:47-56`,
`web/src/app/services/tasks.service.ts:7-14`.

### 2. Qué envía

Envía el nombre de usuario como query parameter `owner` y el token en el header
`Authorization` con esquema Bearer. No configura cuerpo ni timeout para esta
petición.

| Parte | Campo | Valor/formato |
|---|---|---|
| Query | `owner` | Nombre de usuario guardado en sesión |
| Header | `Authorization` | Esquema Bearer seguido del token de sesión |
| Body | — | No se envía |

Ejemplo con valores ficticios:

```http
GET http://localhost:8000/api/tasks?owner=student
Authorization: [esquema Bearer] [token ficticio test-token]
```

Evidencia de construcción de la URL y el header:
`web/src/app/services/tasks.service.ts:8-13`. La prueba usa los valores
`student` y `test-token`: `web/src/app/dashboard/dashboard.component.spec.ts:48-73`.
El cliente concatena `owner` directamente en la URL; no aplica codificación
explícita del parámetro.

### 3. Qué espera recibir en éxito

Axios considera exitosa una respuesta HTTP 2xx por defecto; el cliente no
comprueba un código específico. Espera que `response.data` sea un arreglo de
tareas. El modelo declara `status` requerido y los demás campos enumerados
opcionales.

| Campo | Tipo | Uso |
|---|---|---|
| `id` | number o string, opcional | Identificador disponible para la UI |
| `status` | string, requerido | Filtrado y etiqueta de estado |
| `priority` | string, opcional | Orden de visualización |
| `owner` | string, opcional | Propietario devuelto |
| `label` | string, opcional | Etiqueta de presentación; el dashboard la calcula |
| `title` | string, opcional | Título mostrado |
| `description` | string, opcional | Descripción mostrada |

Ejemplo de respuesta con la forma usada en el test:

```json
[
  { "id": 1, "status": "TODO", "priority": "LOW", "owner": "student" },
  { "id": 2, "status": "IN_PROGRESS", "priority": "HIGH", "owner": "student" }
]
```

El dashboard excluye tareas cuyo estado sea exactamente `ARCHIVED`, calcula
`label` para las tareas visibles y las ordena por prioridad. La prueba verifica
el ejemplo y el filtrado: `web/src/app/models.ts:30-38`,
`web/src/app/dashboard/dashboard.component.ts:56-69`,
`web/src/app/dashboard/dashboard.component.spec.ts:48-84`.

### 4. Cómo reacciona ante errores

| Situación observada | Reacción del cliente |
|---|---|
| No hay token en sesión | No llama al endpoint y navega a `/login` |
| Rechazo HTTP con `response.data.detail` no vacío | Detiene el indicador de carga y muestra ese detalle en el dashboard |
| Otro rechazo HTTP, error de red o error sin `detail` | Muestra el `message` del error si existe; si no, `No se pudo cargar el dashboard`; detiene la carga |
| Token inválido o vencido | No se distingue de otros rechazos: se muestra el error general según las reglas anteriores; no se borra la sesión ni se redirige automáticamente |
| Timeout | No hay timeout configurado por este servicio, por lo que el cliente no define un límite propio; los errores de transporte que se rechacen se procesan con la regla general |
| Respuesta exitosa con cuerpo que no sea un arreglo | No hay validación runtime del esquema. Al intentar filtrar un valor incompatible, el error se captura y se presenta mediante el tratamiento general |

El componente no hace retry. El logout es local: elimina token y usuario y
navega a `/login`; no se observa una llamada HTTP de cierre de sesión.
Evidencia: `web/src/app/dashboard/dashboard.component.ts:48-81`,
`web/src/app/services/request-error.ts:10-25`,
`web/src/app/services/session.service.ts:55-59`.
La prueba cubre error con `detail`, falta de token y logout, pero no simula una
respuesta real del servidor ni timeout: `web/src/app/dashboard/dashboard.component.spec.ts:36-118`.

### 5. Notas de seguridad

- El token se obtiene de `localStorage` mediante `SessionService` y se envía
  como Bearer. `localStorage` no ofrece protección `HttpOnly`.
  Evidencia: `web/src/app/services/session.service.ts:11-13,43-52` y
  `web/src/app/services/tasks.service.ts:8-13`.
- `owner` se envía en la query. Este cliente lo toma del usuario guardado en
  sesión; el parámetro del cliente no demuestra autorización del lado servidor.
- Los títulos y descripciones de tareas se renderizan con interpolación
  Angular, no con `[innerHTML]`: `web/src/app/dashboard/dashboard.component.html:17-21`.
- El detalle `detail` del backend se presenta directamente como texto en el
  dashboard; el cliente no lo filtra para evitar divulgar información interna.

## Preguntas abiertas

- ¿Qué estado HTTP de éxito y qué esquema exacto garantiza cada backend? El
  cliente acepta el rango 2xx de Axios y sus tipos no realizan validación
  runtime.
- ¿Qué formato contractual tiene el error del login además del campo
  `message`, y el de tareas además de `detail`?
- ¿Debe un 401/403 al consultar tareas borrar la sesión y redirigir a login?
  El comportamiento actual no lo hace.
- ¿Cuál debe ser el timeout operativo para consultar tareas?
- ¿Debe codificarse `owner` como query parameter, especialmente para nombres
  con caracteres reservados?
- ¿El backend garantiza siempre `user` y un arreglo de tareas con `status`
  válido?
