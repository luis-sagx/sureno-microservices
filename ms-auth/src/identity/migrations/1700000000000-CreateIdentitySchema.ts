import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentitySchema1700000000000 implements MigrationInterface {
  name = 'CreateIdentitySchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "person" (
        "id" uuid PRIMARY KEY,
        "cedula" varchar(10) NOT NULL,
        "nombres" varchar(100) NOT NULL,
        "apellidos" varchar(100) NOT NULL,
        "fecha_nacimiento" date NOT NULL,
        "telefono" varchar(20) NOT NULL,
        "email_contacto" varchar(255),
        "estado_verificacion" varchar(20) NOT NULL DEFAULT 'PENDING',
        "fecha_verificacion" timestamptz,
        CONSTRAINT "uq_person_cedula" UNIQUE ("cedula"),
        CONSTRAINT "ck_person_verification_state"
          CHECK ("estado_verificacion" IN ('PENDING', 'APPROVED', 'REJECTED'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "app_user" (
        "id" uuid PRIMARY KEY,
        "person_id" uuid NOT NULL,
        "username" varchar(80) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "estado" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "creado_en" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_app_user_person" UNIQUE ("person_id"),
        CONSTRAINT "uq_app_user_username" UNIQUE ("username"),
        CONSTRAINT "fk_app_user_person" FOREIGN KEY ("person_id")
          REFERENCES "person" ("id") ON DELETE CASCADE,
        CONSTRAINT "ck_app_user_state" CHECK ("estado" IN ('ACTIVE', 'DISABLED'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "role" (
        "id" uuid PRIMARY KEY,
        "codigo" varchar(40) NOT NULL UNIQUE,
        "nombre" varchar(80) NOT NULL,
        "descripcion" text
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_role" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "asignado_en" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pk_user_role" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "fk_user_role_user" FOREIGN KEY ("user_id")
          REFERENCES "app_user" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_role_role" FOREIGN KEY ("role_id")
          REFERENCES "role" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "business_account" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "ruc" varchar(13) NOT NULL,
        "razon_social" varchar(160) NOT NULL,
        "nombre_comercial" varchar(160),
        "direccion_negocio" text NOT NULL,
        "estado_solicitud" varchar(20) NOT NULL DEFAULT 'PENDING',
        "solicitada_en" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "revisado_por_user_id" uuid,
        "revisado_en" timestamptz,
        "motivo_rechazo" text,
        CONSTRAINT "uq_business_account_user" UNIQUE ("user_id"),
        CONSTRAINT "uq_business_account_ruc" UNIQUE ("ruc"),
        CONSTRAINT "fk_business_account_user" FOREIGN KEY ("user_id")
          REFERENCES "app_user" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_business_account_reviewer" FOREIGN KEY ("revisado_por_user_id")
          REFERENCES "app_user" ("id") ON DELETE SET NULL,
        CONSTRAINT "ck_business_account_state"
          CHECK ("estado_solicitud" IN ('PENDING', 'APPROVED', 'REJECTED'))
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "business_account"');
    await queryRunner.query('DROP TABLE "user_role"');
    await queryRunner.query('DROP TABLE "role"');
    await queryRunner.query('DROP TABLE "app_user"');
    await queryRunner.query('DROP TABLE "person"');
  }
}
