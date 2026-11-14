import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'business_account' })
export class BusinessAccount {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true, name: 'user_id' })
  user_id!: string;

  @Column({ type: 'varchar', length: 13, unique: true })
  ruc!: string;

  @Column({ type: 'varchar', length: 160 })
  razon_social!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  nombre_comercial!: string | null;

  @Column({ type: 'text', name: 'direccion_negocio' })
  direccion_negocio!: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  estado_solicitud!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'timestamptz', name: 'solicitada_en', default: () => 'CURRENT_TIMESTAMP' })
  solicitada_en!: Date;

  @Column({ type: 'uuid', nullable: true, name: 'revisado_por_user_id' })
  revisado_por_user_id!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'revisado_en' })
  revisado_en!: Date | null;

  @Column({ type: 'text', nullable: true, name: 'motivo_rechazo' })
  motivo_rechazo!: string | null;
}
