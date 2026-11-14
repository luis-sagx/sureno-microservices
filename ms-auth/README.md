# MS01 — Identidad y registro

El servicio usa `auth_db` en PostgreSQL. TypeORM aplica la migración inicial al arrancar (`migrationsRun: true`, `synchronize: false`). Para desarrollo, inicia la base desde la raíz del repositorio y exporta su contraseña al proceso de Nest:

```sh
docker compose up -d postgres
set -a
. ../.env.example
set +a
pnpm start:dev
```

Conexión por defecto desde el host: `localhost:5432`, base `auth_db`, usuario `auth_app`. Se puede cambiar con `AUTH_DB_HOST`, `AUTH_DB_PORT`, `AUTH_DB_NAME`, `AUTH_DB_USER` y `AUTH_DB_PASSWORD`. No uses `POSTGRES_ADMIN_USER` ni `POSTGRES_ADMIN_PASSWORD` como credenciales de la aplicación.

## Registro individual

`POST /identity/individuals` recibe JSON con `cedula`, `nombres`, `apellidos`, `fecha_nacimiento` (`AAAA-MM-DD`), `telefono`, `username`, `password` y el campo opcional `email_contacto`. La cédula ecuatoriana debe pasar su dígito verificador; se rechaza a menores de 18 años y el username se normaliza a minúsculas. La contraseña requiere al menos 12 caracteres y se almacena con scrypt y una sal aleatoria.

Una respuesta creada (`201`) incluye `user_id`, `username`, `tipo_cliente: "B2C"`, `estado: "ACTIVE"` y `estado_verificacion: "PENDING"`. No devuelve la cédula ni el hash. Datos inválidos devuelven `400`; cédula o usuario duplicado devuelve `409`.

## Solicitud de cuenta comercial

`POST /identity/business-requests` recibe los mismos datos personales y agrega `ruc` (13 dígitos), `razon_social`, `direccion_negocio` y el opcional `nombre_comercial`. La cuenta y la verificación de identidad quedan pendientes de revisión manual. La respuesta `201` agrega `tipo_cliente: "B2B"` y `estado_solicitud: "PENDING"`; no habilita beneficios mayoristas.

## Tablas de MS01

La migración crea `person`, `app_user`, `role`, `user_role` y `business_account`, con claves únicas para cédula, username, RUC y persona asociada. La aprobación de identidad o negocio, asignación de roles, inicio/cierre de sesión y sesiones quedan para la siguiente unidad de MS01.
