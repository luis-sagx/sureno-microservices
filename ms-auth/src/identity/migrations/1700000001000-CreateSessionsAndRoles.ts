import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const roles = [
  ['CUSTOMER', 'Cliente', 'Cuenta de cliente sin beneficios comerciales pendientes.'],
  ['CUSTOMER_B2B', 'Cliente comercial', 'Cuenta comercial aprobada.'],
  ['ADMIN', 'Administrador', 'Gestiona revisiones administrativas.'],
  ['DISPATCH', 'Despacho', 'Consulta pedidos confirmados y actualiza su preparación.'],
] as const;

export class CreateSessionsAndRoles1700000001000 implements MigrationInterface {
  name = 'CreateSessionsAndRoles1700000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_session" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "creada_en" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ultima_actividad_en" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expira_en" timestamptz NOT NULL,
        "revocada_en" timestamptz,
        CONSTRAINT "fk_auth_session_user" FOREIGN KEY ("user_id")
          REFERENCES "app_user" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "ix_auth_session_user" ON "auth_session" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "ix_auth_session_expiry" ON "auth_session" ("expira_en")',
    );

    for (const [codigo, nombre, descripcion] of roles) {
      await queryRunner.query(
        `INSERT INTO "role" ("id", "codigo", "nombre", "descripcion")
         VALUES ($1, $2, $3, $4) ON CONFLICT ("codigo") DO NOTHING`,
        [randomUUID(), codigo, nombre, descripcion],
      );
    }

    const [customerRole] = await queryRunner.query(
      'SELECT "id" FROM "role" WHERE "codigo" = $1',
      ['CUSTOMER'],
    );
    await queryRunner.query(
      `INSERT INTO "user_role" ("user_id", "role_id")
       SELECT "id", $1 FROM "app_user"
       ON CONFLICT ("user_id", "role_id") DO NOTHING`,
      [customerRole.id],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "auth_session"');
    await queryRunner.query(
      `DELETE FROM "user_role" WHERE "role_id" IN
       (SELECT "id" FROM "role" WHERE "codigo" IN ('CUSTOMER', 'CUSTOMER_B2B', 'ADMIN', 'DISPATCH'))`,
    );
    await queryRunner.query(
      `DELETE FROM "role" WHERE "codigo" IN ('CUSTOMER', 'CUSTOMER_B2B', 'ADMIN', 'DISPATCH')`,
    );
  }
}
