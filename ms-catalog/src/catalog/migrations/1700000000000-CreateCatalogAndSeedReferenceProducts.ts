import { randomUUID } from 'node:crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const categories = [
  ['Aguardientes', 'Destilados y aguardientes de caña.'],
  ['Vodkas', 'Vodkas Sureño.'],
  ['Rones', 'Rones y licores de caña añejados.'],
  ['Whiskies', 'Whiskies disponibles en el catálogo.'],
  ['Cócteles', 'Cócteles preparados de sabores frutales.'],
  ['Licores', 'Licores y bebidas de sabores especiales.'],
] as const;

const products = [
  {
    category: 'Aguardientes',
    nombre: 'Aguardiente Diamante',
    descripcion:
      'Aguardiente Diamante, elaborado con los mejores ingredientes del sur de Quito. Una bebida de tradición con 26 grados de pureza.',
    volumen_ml: 750,
  },
  {
    category: 'Vodkas',
    nombre: 'Blue Vodka',
    descripcion:
      'Vodka Blue, de suave filtrado y 9 grados de alcohol. Ideal para cócteles y consumo directo.',
    volumen_ml: 750,
  },
  {
    category: 'Aguardientes',
    nombre: 'Media Caña Sureña',
    descripcion:
      'Media Caña Sureña, la presentación personal de nuestro destilado más icónico. 30 grados de tradición.',
    volumen_ml: 375,
  },
  {
    category: 'Aguardientes',
    nombre: 'Caña Sureña',
    descripcion:
      'Caña Sureña, el destilado más representativo de Licorería Sureño. Elaborado con procesos controlados y 30 grados de pureza.',
    volumen_ml: 750,
  },
  {
    category: 'Cócteles',
    nombre: 'Cocktail Sabor a Durazno',
    descripcion:
      'Refrescante cóctel sabor a durazno, listo para disfrutar. Bajo contenido alcohólico de 5 grados.',
    volumen_ml: 800,
  },
  {
    category: 'Cócteles',
    nombre: 'Cocktail Sabor a Maracuyá',
    descripcion:
      'Cóctel tropical sabor a maracuyá, perfecto para cualquier ocasión. 5 grados de alcohol.',
    volumen_ml: 800,
  },
  {
    category: 'Licores',
    nombre: 'Licor de Cannabis',
    descripcion:
      'Licor artesanal de Cannabis, una experiencia diferenciada. 6 grados de alcohol con notas herbales.',
    volumen_ml: 750,
  },
  {
    category: 'Rones',
    nombre: 'Media Ron Oro',
    descripcion:
      'Presentación media de nuestro Ron Oro. Sabor suave y dorado, 15 grados de alcohol.',
    volumen_ml: 375,
  },
  {
    category: 'Rones',
    nombre: 'Ron Oro',
    descripcion:
      'Ron Oro Sureño, destilado con carácter y sabor suave. 15 grados de alcohol.',
    volumen_ml: 750,
  },
  {
    category: 'Vodkas',
    nombre: 'Vodka Seco Glacial',
    descripcion:
      'Vodka Seco Glacial, de sabor limpio y cristalinamente frío. 12 grados de alcohol.',
    volumen_ml: 750,
  },
  {
    category: 'Whiskies',
    nombre: 'Whisky Red Diez',
    descripcion:
      'Whisky Red Diez, nuestro premium de malta con 16 grados de alcohol. Notas ahumadas y equilibradas.',
    volumen_ml: 750,
  },
] as const;

export class CreateCatalogAndSeedReferenceProducts1700000000000
  implements MigrationInterface
{
  name = 'CreateCatalogAndSeedReferenceProducts1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "category" (
        "id" uuid PRIMARY KEY,
        "nombre" varchar(100) NOT NULL UNIQUE,
        "descripcion" text,
        "activo" boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "product" (
        "id" uuid PRIMARY KEY,
        "category_id" uuid NOT NULL,
        "nombre" varchar(160) NOT NULL,
        "descripcion" text,
        "volumen_ml" integer,
        "disponible" boolean NOT NULL DEFAULT true,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "fk_product_category" FOREIGN KEY ("category_id")
          REFERENCES "category" ("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_product_volume" CHECK ("volumen_ml" IS NULL OR "volumen_ml" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "presentation" (
        "id" uuid PRIMARY KEY,
        "product_id" uuid NOT NULL,
        "tipo" varchar(10) NOT NULL,
        "unidades_por_presentacion" integer NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "fk_presentation_product" FOREIGN KEY ("product_id")
          REFERENCES "product" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_presentation_product_type" UNIQUE ("product_id", "tipo"),
        CONSTRAINT "ck_presentation_type" CHECK ("tipo" IN ('UNIDAD', 'CAJA')),
        CONSTRAINT "ck_presentation_units" CHECK ("unidades_por_presentacion" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "availability_change" (
        "id" uuid PRIMARY KEY,
        "product_id" uuid NOT NULL,
        "estado_anterior" boolean NOT NULL,
        "estado_nuevo" boolean NOT NULL,
        "actor_user_id" uuid NOT NULL,
        "cambiado_en" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_availability_product" FOREIGN KEY ("product_id")
          REFERENCES "product" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "ix_product_category_active" ON "product" ("category_id", "activo")',
    );
    await queryRunner.query(
      'CREATE INDEX "ix_product_name" ON "product" ("nombre")',
    );
    await queryRunner.query(
      'CREATE INDEX "ix_availability_product_changed" ON "availability_change" ("product_id", "cambiado_en" DESC)',
    );

    const categoryIds = new Map<string, string>();
    for (const [nombre, descripcion] of categories) {
      const id = randomUUID();
      categoryIds.set(nombre, id);
      await queryRunner.query(
        'INSERT INTO "category" ("id", "nombre", "descripcion", "activo") VALUES ($1, $2, $3, true)',
        [id, nombre, descripcion],
      );
    }

    for (const record of products) {
      const productId = randomUUID();
      const categoryId = categoryIds.get(record.category);
      if (!categoryId) throw new Error(`Missing category for ${record.nombre}`);
      await queryRunner.query(
        `INSERT INTO "product"
          ("id", "category_id", "nombre", "descripcion", "volumen_ml", "disponible", "activo")
         VALUES ($1, $2, $3, $4, $5, true, true)`,
        [productId, categoryId, record.nombre, record.descripcion, record.volumen_ml],
      );
      for (const [tipo, unidades] of [
        ['UNIDAD', 1],
        ['CAJA', 12],
      ] as const) {
        await queryRunner.query(
          `INSERT INTO "presentation"
            ("id", "product_id", "tipo", "unidades_por_presentacion", "activo")
           VALUES ($1, $2, $3, $4, true)`,
          [randomUUID(), productId, tipo, unidades],
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "availability_change"');
    await queryRunner.query('DROP TABLE "presentation"');
    await queryRunner.query('DROP TABLE "product"');
    await queryRunner.query('DROP TABLE "category"');
  }
}
