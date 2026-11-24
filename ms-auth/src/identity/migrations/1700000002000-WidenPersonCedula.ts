import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenPersonCedula1700000002000 implements MigrationInterface {
  name = 'WidenPersonCedula1700000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "person" ALTER COLUMN "cedula" TYPE varchar(13)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [result] = (await queryRunner.query(
      'SELECT EXISTS (SELECT 1 FROM "person" WHERE length("cedula") > 10) AS contains_long_person_id',
    )) as Array<{ contains_long_person_id: boolean }>;
    if (result?.contains_long_person_id) {
      throw new Error(
        'Cannot narrow person.cedula while 13-digit identifiers exist.',
      );
    }
    await queryRunner.query(
      'ALTER TABLE "person" ALTER COLUMN "cedula" TYPE varchar(10)',
    );
  }
}
