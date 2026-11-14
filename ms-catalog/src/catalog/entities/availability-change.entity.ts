import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Product } from './product.entity.js';

@Entity({ name: 'availability_change' })
export class AvailabilityChange {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  product_id!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'boolean', name: 'estado_anterior' })
  estado_anterior!: boolean;

  @Column({ type: 'boolean', name: 'estado_nuevo' })
  estado_nuevo!: boolean;

  @Column({ type: 'uuid', name: 'actor_user_id' })
  actor_user_id!: string;

  @Column({ type: 'timestamptz', name: 'cambiado_en', default: () => 'CURRENT_TIMESTAMP' })
  cambiado_en!: Date;
}
