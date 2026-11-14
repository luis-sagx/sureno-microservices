import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'person' })
export class Person {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  cedula!: string;

  @Column({ type: 'varchar', length: 100 })
  nombres!: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos!: string;

  @Column({ type: 'date', name: 'fecha_nacimiento' })
  fecha_nacimiento!: string;

  @Column({ type: 'varchar', length: 20 })
  telefono!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email_contacto!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  estado_verificacion!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_verificacion' })
  fecha_verificacion!: Date | null;
}
