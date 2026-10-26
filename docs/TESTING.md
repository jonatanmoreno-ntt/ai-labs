# Pruebas de web

## Alcance y trazabilidad

Ejecuciones de `web`, relacionadas con **H-WEB-06** (pruebas del flujo de
frontend). Los tests usan Vitest y respuestas de Axios simuladas; no contactan
servicios HTTP reales.

## Matriz de casos

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login | Credenciales ficticias válidas y respuesta con token/usuario | Camino feliz | Envía `username`, `password` y `client`; persiste token y usuario y navega a `/dashboard` |
| Tareas | Token y usuario presentes; respuesta con tareas | Camino feliz | Envía la consulta de tareas, filtra `ARCHIVED`, ordena y detiene la carga |
| Login | Usuario vacío o contraseña vacía | Borde | No llama al backend y muestra el mensaje de validación correspondiente |
| Login | Respuesta exitosa sin token | Borde | Muestra `El backend respondió sin token.`; no guarda sesión ni navega |
| Login | Backend responde HTTP 503 con `message` | Error: autenticación no disponible | Muestra el error de autenticación y el detalle `Service unavailable`; finaliza el estado busy |
| Login | Axios rechaza con error de timeout | Error: timeout | Muestra el mensaje de timeout suministrado por Axios y finaliza el estado busy |
| Tareas | Falta token de sesión | Borde | No consulta tareas y navega a `/login` |
| Tareas | API responde HTTP 401 con `detail` (token inválido) | Error: token inválido | Muestra el detalle, termina la carga y, según el comportamiento actual documentado, no borra token ni redirige |
| Tareas | Axios rechaza con error de timeout | Error: timeout simulado | Muestra el mensaje del error y termina la carga; el servicio de tareas no configura un timeout propio |
| Tareas | API rechaza la petición con `detail` de indisponibilidad | Error | Muestra el detalle y termina la carga |

Los casos de camino feliz de login y tareas están en
`web/src/app/login/login.component.spec.ts` y
`web/src/app/dashboard/dashboard.component.spec.ts`. Los casos de borde de
login se prueban conjuntamente en `login.component.spec.ts`; la falta de token
se prueba en `dashboard.component.spec.ts`.

## Código de los tests añadidos

`web/src/app/login/login.component.spec.ts`:

```ts
it('shows an unavailable authentication service response', async () => {
  vi.mocked(axios.post).mockRejectedValue({
    response: { status: 503, data: { message: 'Service unavailable' } }
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const component = createComponent();
  component.username = 'student';
  component.password = 'Workshop123!';

  await component.login();

  expect(component.message?.title).toBe('No se pudo autenticar a student.');
  expect(component.message?.detail).toBe('Service unavailable');
  expect(component.busy).toBe(false);
});

it('shows the transport timeout message when login exceeds its configured timeout', async () => {
  vi.mocked(axios.post).mockRejectedValue({
    code: 'ECONNABORTED',
    message: 'timeout of 5000ms exceeded'
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const component = createComponent();
  component.username = 'student';
  component.password = 'Workshop123!';

  await component.login();

  expect(component.message?.detail).toBe('timeout of 5000ms exceeded');
  expect(component.busy).toBe(false);
});
```

`web/src/app/dashboard/dashboard.component.spec.ts`:

```ts
it('shows an invalid-token error without clearing the session or redirecting', async () => {
  storage.setItem('workshop_token', 'invalid-token');
  storage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
  vi.mocked(axios.get).mockRejectedValue({
    response: { status: 401, data: { detail: 'Invalid token' } }
  });
  const component = createComponent();

  await component.ngOnInit();

  expect(component.error).toBe('Invalid token');
  expect(component.loading).toBe(false);
  expect(storage.getItem('workshop_token')).toBe('invalid-token');
  expect(navigate).not.toHaveBeenCalled();
});

it('shows a transport timeout error when task retrieval is rejected', async () => {
  storage.setItem('workshop_token', 'test-token');
  storage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
  vi.mocked(axios.get).mockRejectedValue({
    code: 'ECONNABORTED',
    message: 'timeout of 10000ms exceeded'
  });
  const component = createComponent();

  await component.ngOnInit();

  expect(component.error).toBe('timeout of 10000ms exceeded');
  expect(component.loading).toBe(false);
});
```

## Ejecuciones realizadas

| componente | comando | directorio de ejecución | código de salida | resultado |
|---|---|---|---:|---|
| web | `npm test` | raíz del repositorio | -4058 | Falló: npm no encontró `package.json` en la raíz. No se considera una ejecución de suite válida |
| web | `npm test` | `web/` | 0 | 6 archivos y 26 pruebas aprobados |
| web | `npm run test:coverage` | `web/` | 0 | 6 archivos y 26 pruebas aprobados; cobertura V8 generada en `web/coverage/` |

No se ejecutó el build ni pruebas contra backends reales.

## Cobertura

Método: Vitest con proveedor V8, reporter `text`, `json-summary` y `html`, según
`web/vitest.config.ts`. Se reportan sentencias/líneas instrumentadas y ramas de
forma separada.

| alcance | sentencias/líneas cubiertas | cobertura | ramas cubiertas | cobertura de ramas |
|---|---:|---:|---:|---:|
| Código de producción del flujo login (`login.component.ts`) | 71/71 | 100% | 12/12 | 100% |
| Código de producción del flujo tareas (`dashboard.component.ts`) | 71/71 | 100% | 14/17 | 82,35% |
| Flujos login + tareas | 142/142 | 100% | 26/29 | 89,66% |
| Global de `web` | 274/302 | 90,72% | 80/87 | 91,95% |

No se modificó código fuente de producción en este paso; los cambios fueron
tests. El 100% de líneas/sentencias en los componentes objetivo es la cobertura
medida de esos flujos, no una afirmación de que el 100% de sus ramas esté
cubierto. La cobertura global incluye archivos como `main.ts` y
`app.component.ts`, que no están cubiertos por esta suite.

## Fallos, pendientes y pruebas propuestas

### Fallos

- La primera invocación `npm test` se ejecutó desde la raíz y terminó con código
  `-4058` porque allí no existe `package.json`. La repetición correcta desde
  `web/` pasó.

### Pendientes

- Los errores HTTP y timeout se simulan con rechazos de Axios; no se verificó
  que un servidor real responda 503/401, ni se esperó un timeout real de 5000 ms.
- `GET /api/tasks` no configura timeout propio. El caso de timeout de tareas
  solo verifica el manejo de un error de transporte rechazado.
- No se verificó el contrato real ni la autorización del backend; consultar
  tareas con `owner` y token válido/inválido contra el servicio queda pendiente
  de una integración local coordinada.
- El dashboard conserva el token y no redirige ante 401, conforme al
  comportamiento observado; decidir si debe cerrar sesión requiere acordar un
  cambio de contrato/UX antes de modificar el test.

### Pruebas propuestas

- Cuando los servicios locales estén disponibles, ejecutar el flujo completo
  con credenciales ficticias documentadas y verificar el login, la respuesta
  de tareas y el cierre de sesión real.
- Acordar el comportamiento esperado para 401/403 y, si se cambia, añadir una
  caracterización que verifique limpieza de sesión y navegación.
- Definir un timeout de tareas antes de probar su expiración real; actualmente
  no hay límite configurado en `TasksService`.
