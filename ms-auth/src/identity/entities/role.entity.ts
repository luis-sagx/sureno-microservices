import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'role' })
export class Role {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 80 })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;
}
