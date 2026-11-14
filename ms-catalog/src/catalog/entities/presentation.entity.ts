import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Product } from './product.entity.js';

@Entity({ name: 'presentation' })
export class Presentation {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  product_id!: string;

  @ManyToOne(() => Product, (product) => product.presentaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: object;

  @Column({ type: 'varchar', length: 10 })
  tipo!: 'UNIDAD' | 'CAJA';

  @Column({ type: 'integer', name: 'unidades_por_presentacion' })
  unidades_por_presentacion!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;
}
