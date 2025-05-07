// backend/src/store/entities/store.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index
} from 'typeorm';
import { User } from '../../auth/user.entity'; // Adjust path if needed
import { Product } from '../../products/entities/product.entity'; // Adjust path if needed

@Entity('Stores') // Match your table name in the database
export class Store {

  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'store_id' })
  storeId: string; // TypeORM maps bigint to string

  @Index({ unique: true })
  @Column({ type: 'varchar', name: 'userID', unique: true, nullable: false }) // Maps to userID column in DB
  userId: string; // JS/TS property

  @OneToOne(() => User, { nullable: false })
  @JoinColumn({
      name: 'userID', // This entity's FK column name
      referencedColumnName: 'userID' // Referenced PK column name in User table (ensure User entity has matching PK name)
  })
  user: User;

  @Column({ type: 'text', name: 'store_name', nullable: false })
  storeName: string;

  // --- Delivery Options (Using 'real' for float4) ---
  @Column({
    name: 'standard_price',
    type: 'real', // Changed from numeric to real (float4)
    nullable: false
  })
  standardPrice: number; // TypeORM maps 'real' to number

  @Column({ name: 'standard_time', type: 'text', nullable: false })
  standardTime: string;

  @Column({
    name: 'express_price',
    type: 'real', // Changed from numeric to real (float4)
    nullable: false
  })
  expressPrice: number; // TypeORM maps 'real' to number

  @Column({ name: 'express_time', type: 'text', nullable: false })
  expressTime: string;
  // --- End Delivery Options ---

  @OneToMany(() => Product, product => product.store, { eager: false }) // Added eager: false for clarity
  products: Product[];

}