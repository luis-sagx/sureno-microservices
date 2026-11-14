import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn, JoinColumn } from 'typeorm';
import { Category } from './category.entity.js';
import { Presentation } from './presentation.entity.js';

@Entity({ name: 'product' })
export class Product {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'category_id' })
  category_id!: string;

  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @Column({ type: 'varchar', length: 160 })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'integer', nullable: true, name: 'volumen_ml' })
  volumen_ml!: number | null;

  @Column({ type: 'boolean', default: true })
  disponible!: boolean;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => Presentation, (presentation) => presentation.product, { cascade: true })
  presentaciones!: Presentation[];
}
