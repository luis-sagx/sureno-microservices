# MS04 — Precios y promociones

Servicio NestJS organizado en hexágonos: reglas independientes en `pricing/domain`, casos de uso y puertos en `pricing/application`, y adaptadores HTTP/PostgreSQL en `pricing/infrastructure`.

## Configuración local

Variables: `PORT` (3004 en el compose), `PRICES_DB_HOST`, `PRICES_DB_PORT`, `PRICES_DB_USER`, `PRICES_DB_PASSWORD`, `PRICES_DB_NAME`, `CATALOG_SERVICE_URL` (MS02) y `AUTH_SERVICE_URL` (MS01). Valores de DB por defecto: `localhost:5432`, `prices_app`, `prices_db`. Desde la raíz, iniciar PostgreSQL con `docker compose up -d prices_db` y arrancar MS01/MS02.

```sh
pnpm install
pnpm db:migrate
pnpm db:seed:reference
pnpm start:dev
```

Las migraciones son repetibles. La carga inicial hace correspondencia por nombre exacto y presentación `UNIDAD`/`CAJA` de 12 unidades en MS02; si una presentación falta, aborta la transacción. Sólo importa las once cantidades explícitas del legado `/home/luissagnay/Desktop/ls/projects/sureno/prisma/add-sureno-products.ts`. Como el legado no define una tarifa pública por caja, MS04 deriva una como nueve veces el precio B2C unitario, calculado en centavos (por ejemplo, $1.67 × 9 = $15.03). Las tarifas B2B se calculan como `wholesaleUnitPrice` ya redondeado a centavos por 12 (por ejemplo, $1.67 × 12 = $20.04). La carga no reemplaza ninguna tarifa activa ya configurada y registra en `price_changes` cada tarifa que inserta. Los valores del legado y la regla de caja aún requieren validación comercial.

## API

- `GET /prices/quotes?presentation_ids=<uuid>,<uuid>` — cotización por lote. MS01 decide si la sesión está aprobada como `CUSTOMER_B2B`; un parámetro `segmento` del cliente se ignora. Sin tarifa aplicable, cada elemento informa `configured: false` y `final_amount: null`.
- `POST /prices/admin/prices`, `PATCH /prices/admin/prices/:id`, `DELETE /prices/admin/prices/:id`
- `GET /prices/admin/prices/:id/history`
- `GET /prices/admin/promotions`, `POST /prices/admin/promotions`, `PATCH /prices/admin/promotions/:id`, `DELETE /prices/admin/promotions/:id`
- `GET /prices/admin/promotions/:id/history`

Las operaciones de administración verifican la sesión y rol `ADMIN` en MS01. Sólo un `401` explícito de MS01 se considera sesión anónima; una caída, respuesta 5xx o respuesta inválida del servicio de identidad falla con `503` y no degrada la cotización a B2C. Segmento/precio de B2B sólo aplica a caja de 12. Promociones admiten porcentaje y monto fijo, sólo B2B; no se acumulan: se escoge el mayor ahorro y se limita al importe de la línea. El precio público de caja, cuando se configure, debe ser estrictamente menor que doce precios unitarios durante todo su período. Los cambios de tarifa/promoción y su auditoría se escriben en una única transacción; los cambios guardan actor y fecha. `promotion_changes` amplía el ERD original, que no contemplaba auditoría de promociones. Referencias a MS01/MS02 son UUID externos sin claves foráneas entre servicios.

## Verificación

```sh
pnpm test
pnpm test:e2e
pnpm lint
pnpm build
```
