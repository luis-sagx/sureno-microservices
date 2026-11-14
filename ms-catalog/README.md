# MS02 — Catálogo

MS02 es dueño de categorías, productos, presentaciones y del historial informativo de disponibilidad. Usa exclusivamente `catalog_db`; no consulta la base de MS01 ni la futura base de MS04. Las tarifas, precios y promociones se entregarán cuando MS04 publique su contrato. Las respuestas de este servicio no contienen precios.

## Inicio local

Desde la raíz del repositorio, inicia PostgreSQL. No se requiere la cuenta administrativa de la base para ejecutar la aplicación:

```sh
docker compose --env-file .env.example up -d postgres
```

En una terminal, inicia MS01:

```sh
cd ms-auth
set -a
. ../.env.example
set +a
PORT=3001 pnpm start:dev
```

En otra terminal, inicia el catálogo:

```sh
cd ms-catalog
set -a
. ../.env.example
set +a
PORT=3002 AUTH_SERVICE_URL=http://localhost:3001 pnpm start:dev
```

La conexión PostgreSQL usa `CATALOG_DB_HOST` (por defecto `localhost`), `CATALOG_DB_PORT` (por defecto `5432`), `CATALOG_DB_NAME` (`catalog_db`), `CATALOG_DB_USER` (`catalog_app`) y `CATALOG_DB_PASSWORD`. La contraseña de ejemplo solo sirve para el entorno local inicializado con `.env.example`; configura secretos propios para otros entornos. TypeORM aplica las migraciones al arrancar y mantiene `synchronize: false`.

Las migraciones importan 11 productos y seis categorías de los registros locales del proyecto Sureño de referencia. Se conservan nombres, descripciones y volúmenes. Cada producto tiene presentación `UNIDAD` y `CAJA`; la referencia registra cajas de 12 unidades. La disponibilidad inicial se marca como informativa y activa, y administración debe mantenerla manualmente. Las imágenes se mantienen como activos de la aplicación web; el esquema del catálogo sigue el modelo de datos y no almacena rutas de imagen.

## API pública

- `GET /catalog/categories` — lista categorías activas.
- `GET /catalog/products?q=caña&category_id=<uuid>&disponible=true&page=1&page_size=20` — busca por nombre o descripción y filtra por categoría/disponibilidad. `q`, `category_id` y `disponible` son opcionales; `page_size` admite de 1 a 100. Devuelve `{ items, total, page, page_size }`.
- `GET /catalog/products/{id}` — consulta un producto activo con categoría y presentaciones activas. Los productos inactivos no aparecen en rutas públicas. Un producto no disponible se puede consultar con `disponible: false`, pero esa marca informa que no debe agregarse a nuevas solicitudes.

La API entrega `id`, `category_id`, `nombre`, `descripcion`, `volumen_ml`, `disponible`, `activo`, categoría y presentaciones. No incluye precio, descuento, existencia física ni una tarifa estimada.

## Administración

Las rutas administrativas requieren la cookie de sesión de MS01 con rol `ADMIN`. MS02 reenvía la credencial a `GET {AUTH_SERVICE_URL}/sessions/me`; nunca lee `auth_db` ni confía en roles enviados por el cliente. Configure `AUTH_SERVICE_URL` con el origen interno de MS01. Si MS01 no está disponible, la operación falla con `503` y no se guarda ningún cambio.

- `GET /catalog/admin/categories` y `GET /catalog/admin/products` — listan también categorías y productos inactivos para que administración pueda reactivarlos. Admiten los mismos filtros y paginación que las rutas públicas.
- `POST /catalog/categories` y `PATCH /catalog/categories/{id}` — crean o modifican categorías; desactivar una categoría también la oculta de los resultados públicos.
- `POST /catalog/products` — crea un producto con `category_id`, nombre, descripción, volumen y una lista `presentaciones`, por ejemplo:

```json
{
  "category_id": "<uuid>",
  "nombre": "Producto Sureño",
  "descripcion": "Descripción del producto",
  "volumen_ml": 750,
  "presentaciones": [
    { "tipo": "UNIDAD", "unidades_por_presentacion": 1 },
    { "tipo": "CAJA", "unidades_por_presentacion": 12 }
  ]
}
```

- `PATCH /catalog/products/{id}` — cambia datos del producto, presentaciones o estado activo. La disponibilidad se cambia por su ruta específica para que siempre quede auditada.
- `PATCH /catalog/products/{id}/availability` con `{ "disponible": false }` — actualiza la disponibilidad y registra estado anterior, estado nuevo, administrador responsable y fecha. No agrega una fila si el valor no cambió.
- `GET /catalog/products/{id}/availability-history` — consulta el historial; también requiere rol `ADMIN`.

`UNIDAD` debe representar una unidad. `CAJA` registra el número de unidades por presentación. Este catálogo no aplica el requisito de compra mínima de B2C ni autoriza beneficios B2B; el cálculo de tarifas es responsabilidad de MS04 y el registro de solicitudes de MS03.

## Verificación

Desde `ms-catalog`, con PostgreSQL disponible y las variables cargadas desde `.env.example`:

```sh
set -a
. ../.env.example
set +a
pnpm test
pnpm build
pnpm lint
```
