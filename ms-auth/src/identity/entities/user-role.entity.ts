import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_role' })
export class UserRole {
  @PrimaryColumn('uuid', { name: 'user_id' })
  user_id!: string;

  @PrimaryColumn('uuid', { name: 'role_id' })
  role_id!: string;

  @Column({ type: 'timestamptz', name: 'asignado_en', default: () => 'CURRENT_TIMESTAMP' })
  asignado_en!: Date;
}
