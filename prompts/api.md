## auth

1. Analiza el flujo completo antes de cambiar autenticación.
2. Conserva el contrato de POST /auth/login.
3. Crea pruebas de caracterización antes de refactorizar persistencia o token.
4. No silencies CodeQL, Dependency Review ni JaCoCo.
5. No agregues secretos reales; usa variables de entorno y datos de prueba aislados.
6. Separa API, servicio, repositorio y seguridad en cambios revisables.
7. Meta de cobertura del código modificado: 85% o superior.
   Distingue cobertura global y del cambio; declara el método y sus límites.