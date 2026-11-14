CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS prices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), presentation_id uuid NOT NULL,
 segmento varchar(3) NOT NULL CHECK(segmento IN ('B2B','B2C')),
 importe numeric(12,2) NOT NULL CHECK(importe > 0), vigente_desde timestamptz NOT NULL,
 vigente_hasta timestamptz NULL, activo boolean NOT NULL DEFAULT true,
 CHECK(vigente_hasta IS NULL OR vigente_hasta > vigente_desde)
);
CREATE INDEX IF NOT EXISTS prices_quote_idx ON prices(presentation_id,segmento,activo,vigente_desde,vigente_hasta);
CREATE TABLE IF NOT EXISTS price_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), price_id uuid NOT NULL REFERENCES prices(id),
 importe_anterior numeric(12,2), importe_nuevo numeric(12,2) NOT NULL,
 actor_user_id uuid NOT NULL, changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promotions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre varchar(120) NOT NULL,
 segmento varchar(3) NOT NULL CHECK(segmento='B2B'),
 tipo_descuento varchar(15) NOT NULL CHECK(tipo_descuento IN ('PERCENTAGE','FIXED_AMOUNT')),
 valor_descuento numeric(12,2) NOT NULL CHECK(valor_descuento > 0),
 vigente_desde timestamptz NOT NULL, vigente_hasta timestamptz NOT NULL CHECK(vigente_hasta > vigente_desde),
 activo boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS promotion_presentations (
 promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
 presentation_id uuid NOT NULL, PRIMARY KEY(promotion_id,presentation_id)
);
CREATE INDEX IF NOT EXISTS promotion_presentations_ref_idx ON promotion_presentations(presentation_id);
CREATE TABLE IF NOT EXISTS promotion_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), promotion_id uuid NOT NULL REFERENCES promotions(id),
 accion varchar(20) NOT NULL CHECK(accion IN ('CREATED','UPDATED','DEACTIVATED')),
 actor_user_id uuid NOT NULL, changed_at timestamptz NOT NULL DEFAULT now(),
 old_data jsonb, new_data jsonb NOT NULL DEFAULT '{}'::jsonb
);
