#!/bin/sh
set -eu

create_service_database() {
  db_name="$1"
  app_user="$2"
  app_password="$3"

  if [ -z "$app_password" ]; then
    echo "Missing password for $app_user" >&2
    exit 1
  fi

  psql --username "$POSTGRES_USER" --dbname postgres --set=ON_ERROR_STOP=1 \
    --set=app_user="$app_user" --set=app_password="$app_password" \
    --set=db_name="$db_name" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'app_user', :'app_password')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'app_user')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db_name')
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'db_name', :'app_user')
\gexec

SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'db_name')
\gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'app_user')
\gexec
SQL
}

# Keep service credentials out of the shared bootstrap and template databases.
psql --username "$POSTGRES_USER" --dbname postgres --set=ON_ERROR_STOP=1 <<'SQL'
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;
SQL

create_service_database auth_db auth_app "$AUTH_DB_PASSWORD"
create_service_database catalog_db catalog_app "$CATALOG_DB_PASSWORD"
create_service_database orders_db orders_app "$ORDERS_DB_PASSWORD"
create_service_database prices_db prices_app "$PRICES_DB_PASSWORD"
create_service_database faq_db faq_app "$FAQ_DB_PASSWORD"
