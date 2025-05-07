// src/products/entities/product.entity.ts
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from '../../store/entities/store.entity'; // Adjust path if needed

@Entity('Products')
export class Product {
  @PrimaryColumn({ name: 'productID', type: 'int' })
  prodId: number;

  @Column({ name: 'productName', type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'productdescription', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'productcategory', type: 'varchar', length: 100, nullable: false })
  category: string;

  @Column({ name: 'productprice', type: 'real', nullable: false })
  price: number;

  @Column({ name: 'productquantity', type: 'int', nullable: false })
  productquantity: number;

  @Column({ name: 'userID', type: 'varchar', length: 255, nullable: false })
  userId: string;

  @Column({ name: 'imageURL', type: 'varchar', length: 1024, nullable: true })
  imageUrl: string;

  @Column({ name: 'storeName', type: 'varchar', length: 255, nullable: false })
  storeName: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'store_id', type: 'bigint', nullable: false })
  storeId: string; // Property name remains 'storeId', type is string


  // --- Relationship Definition ---
  @ManyToOne(() => Store, store => store.products, { nullable: false, eager: false })
  @JoinColumn({
      name: 'store_id', // Foreign key column name in this (Products) table
      referencedColumnName: 'storeId' // <<< CORRECTED: Property name of the PK in the Store entity
  })
  store: Store;
  // --- End Relationship ---

}
