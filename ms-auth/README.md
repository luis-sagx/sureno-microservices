# MS01 — Usuarios, identidad y sesiones

El servicio usa `auth_db` en PostgreSQL. TypeORM aplica la migración inicial al arrancar (`migrationsRun: true`, `synchronize: false`). Para desarrollo, inicia la base desde la raíz del repositorio y exporta su contraseña al proceso de Nest:

```sh
docker compose up -d postgres
set -a
. ../.env.example
set +a
pnpm start:dev
```

Conexión por defecto desde el host: `localhost:5432`, base `auth_db`, usuario `auth_app`. Se puede cambiar con `AUTH_DB_HOST`, `AUTH_DB_PORT`, `AUTH_DB_NAME`, `AUTH_DB_USER` y `AUTH_DB_PASSWORD`. No uses `POSTGRES_ADMIN_USER` ni `POSTGRES_ADMIN_PASSWORD` como credenciales de la aplicación.

Define `AUTH_SESSION_SECRET` con al menos 32 caracteres aleatorios. La aplicación falla al iniciar si falta o es demasiado corto. `AUTH_COOKIE_SECURE=true` fuerza la marca `Secure` en desarrollo; en producción se añade automáticamente. La cookie de sesión se llama `sureno_session`, es `HttpOnly`, `SameSite=Lax` y `Path=/`. El navegador la envía automáticamente; el servicio nunca devuelve el token en el JSON.

## Registro individual

`POST /identity/individuals` recibe JSON con `cedula`, `nombres`, `apellidos`, `fecha_nacimiento` (`AAAA-MM-DD`), `telefono`, `username`, `password` y el campo opcional `email_contacto`. La cédula ecuatoriana debe pasar su dígito verificador; se rechaza a menores de 18 años y el username se normaliza a minúsculas. La contraseña requiere al menos 12 caracteres y se almacena con scrypt y una sal aleatoria.

Una respuesta creada (`201`) incluye `user_id`, `username`, `tipo_cliente: "B2C"`, `estado: "ACTIVE"` y `estado_verificacion: "PENDING"`. No devuelve la cédula ni el hash. Datos inválidos devuelven `400`; cédula o usuario duplicado devuelve `409`.

## Solicitud de cuenta comercial

`POST /identity/business-requests` recibe los mismos datos personales y agrega `ruc` (13 dígitos), `razon_social`, `direccion_negocio` y el opcional `nombre_comercial`. La cuenta y la verificación de identidad quedan pendientes de revisión manual. La respuesta `201` agrega `tipo_cliente: "B2B"` y `estado_solicitud: "PENDING"`; no habilita beneficios mayoristas.

## Tablas de MS01

Las migraciones crean `person`, `app_user`, `role`, `user_role`, `business_account` y `auth_session`, con claves únicas para cédula, username, RUC y persona asociada. Los roles iniciales son `CUSTOMER`, `CUSTOMER_B2B`, `ADMIN` y `DISPATCH`; el alta individual recibe `CUSTOMER`. Una cuenta comercial pendiente solo recibe `CUSTOMER_B2B` cuando un administrador la aprueba.

## Inicio y cierre de sesión

`POST /sessions` recibe `{ "username": "cliente", "password": "..." }`. Las credenciales inválidas devuelven el mismo `401` sin revelar si falló el usuario o la contraseña. La respuesta contiene `user_id`, `username`, `roles`, `estado_verificacion`, `estado_solicitud` (si aplica) y `session_expires_in_seconds`; no contiene la contraseña ni el token de sesión. La sesión firmada queda en la cookie `sureno_session`.

`GET /sessions/me` devuelve el usuario de la sesión vigente y renueva su expiración por inactividad. Los endpoints protegidos deben usar las guardias `SessionAuthGuard` y, cuando corresponda, `RolesGuard` junto con `@Roles(...)`. `POST /sessions/logout` revoca la sesión y borra la cookie; es idempotente y devuelve `204`.

Las sesiones de clientes vencen después de 30 minutos sin actividad. Las sesiones con rol `ADMIN` vencen después de 15 minutos sin actividad. Cada solicitud autenticada válida actualiza la última actividad y la expiración. El token está firmado con HMAC-SHA-256 y solo se acepta si su registro sigue vigente en `auth_session`; cerrar sesión revoca ese registro.

## Revisión administrativa manual

La primera cuenta administradora se habilita mediante una operación local controlada sobre PostgreSQL, después de registrar una cuenta confiable. No existe una ruta de autoasignación de permisos. Conecta con la cuenta administrativa local descrita en el README raíz y ejecuta la asignación al usuario elegido:

```sql
INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id
FROM app_user AS u
JOIN role AS r ON r.codigo = 'ADMIN'
WHERE u.username = 'usuario-confiable'
ON CONFLICT (user_id, role_id) DO NOTHING;
```

Protege la cuenta que recibe `ADMIN` y no ejecutes esta instrucción desde la aplicación.

`GET /identity/admin/pending-reviews` lista las personas y cuentas comerciales pendientes. Todas las siguientes rutas requieren una sesión con el rol `ADMIN`:

| Método y ruta | JSON de entrada | Resultado |
| --- | --- | --- |
| `PATCH /identity/admin/people/{personId}/verification` | `{ "decision": "APPROVED" }` o `{ "decision": "REJECTED" }` | Estado y fecha de verificación |
| `PATCH /identity/admin/business-accounts/{businessAccountId}/review` | `{ "decision": "APPROVED" }` | Estado aprobado, administrador revisor y fecha |
| `PATCH /identity/admin/business-accounts/{businessAccountId}/review` | `{ "decision": "REJECTED", "reason": "..." }` | Estado rechazado, motivo, administrador revisor y fecha |

Las decisiones solo aceptan `APPROVED` o `REJECTED`; una solicitud ya revisada devuelve `409`. El rechazo comercial requiere un motivo. Solo la aprobación comercial añade `CUSTOMER_B2B`; aprobar la identidad por sí sola no concede beneficios mayoristas. Las respuestas de validación usan `400`, una sesión ausente o inválida `401`, y una sesión sin rol administrador `403`.
