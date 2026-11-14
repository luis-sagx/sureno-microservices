import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'app_user' })
export class AppUser {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true, name: 'person_id' })
  person_id!: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password_hash!: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  estado!: 'ACTIVE' | 'DISABLED';

  @Column({ type: 'timestamptz', name: 'creado_en', default: () => 'CURRENT_TIMESTAMP' })
  creado_en!: Date;
}
