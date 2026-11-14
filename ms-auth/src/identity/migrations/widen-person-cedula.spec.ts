import { WidenPersonCedula1700000002000 } from './1700000002000-WidenPersonCedula.js';
import { vi } from 'vitest';

describe('WidenPersonCedula1700000002000', () => {
  it('widens the person identifier for a personal RUC', async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };

    await new WidenPersonCedula1700000002000().up(queryRunner as never);

    expect(queryRunner.query).toHaveBeenCalledWith(
      'ALTER TABLE "person" ALTER COLUMN "cedula" TYPE varchar(13)',
    );
  });

  it('refuses a rollback that would truncate a stored personal RUC', async () => {
    const queryRunner = {
      query: vi.fn().mockResolvedValueOnce([{ contains_long_person_id: true }]),
    };

    await expect(
      new WidenPersonCedula1700000002000().down(queryRunner as never),
    ).rejects.toThrow('Cannot narrow person.cedula while 13-digit identifiers exist.');
    expect(queryRunner.query).toHaveBeenCalledTimes(1);
  });
});
