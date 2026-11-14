# Sureño microservices

## Start the local databases

1. Copy `.env.example` to `.env` and replace every `change-this-...` value with a local secret.
2. Start the database containers from the repository root:

   ```sh
   docker compose up -d
   docker compose ps
   ```

Compose reports each container healthy only after its health check succeeds. PostgreSQL creates one database and one application owner per service: `auth_db`, `catalog_db`, `orders_db`, `prices_db`, and `faq_db`. MongoDB provisions `recommendations_db` and `cocktails_db`. Application accounts have write access only to their own database; use the root/admin credentials only for local administration.

The PostgreSQL initialization script runs when its data volume is first created. MongoDB initialization scripts also run on an empty data volume. To reinitialize from scratch after changing bootstrap credentials, remove the local database volumes and start again:

```sh
docker compose down -v
docker compose up -d
```

This deletes local database data. Keep `.env` private; `.gitignore` excludes it.

## Local connection settings

The host ports default to PostgreSQL `5432` and MongoDB `27017`; override them with `POSTGRES_PORT` and `MONGO_PORT`. From the host, PostgreSQL service accounts are `auth_app`, `catalog_app`, `orders_app`, `prices_app`, and `faq_app`, with the corresponding `*_DB_PASSWORD` value and owned `*_db`. MongoDB service accounts are `recommendations_app` and `cocktails_app`, with their respective password variables. From another Compose container, use hostnames `postgres` and `mongo` with the containers' internal ports `5432` and `27017`.

The bootstrap accounts are `POSTGRES_ADMIN_USER` / `POSTGRES_ADMIN_PASSWORD` and `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD`. Do not put bootstrap credentials in application database URLs.

## Database contract smoke test

Run the local provisioning contract checks with:

```sh
node --test infra/tests/database-provisioning.test.mjs
```
