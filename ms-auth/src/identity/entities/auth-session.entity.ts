import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'auth_session' })
export class AuthSession {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  user_id!: string;

  @Column({ type: 'timestamptz', name: 'creada_en', default: () => 'CURRENT_TIMESTAMP' })
  creada_en!: Date;

  @Column({ type: 'timestamptz', name: 'ultima_actividad_en', default: () => 'CURRENT_TIMESTAMP' })
  ultima_actividad_en!: Date;

  @Column({ type: 'timestamptz', name: 'expira_en' })
  expira_en!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'revocada_en' })
  revocada_en!: Date | null;
}
