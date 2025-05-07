import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity'; // Assuming you have a Product entity
import { User } from '../../auth/user.entity'; // Corrected path to User entity

@Entity('cart_item')
export class CartItem {
  @PrimaryGeneratedColumn() // Defaults to auto-incrementing integer PRIMARY KEY
  cartID: number; // Matches schema: cartID int4 Primary key

  @Column({ name: 'userID', type: 'varchar' }) // Matches schema: userID varchar Foreign key
  userId: string;

  @Column({ name: 'productID', type: 'int4' }) // Matches schema: productID int4 Foreign key
  productId: number; // Changed to number

  @Column({ type: 'int4' }) // Matches schema: quantity int4
  quantity: number;


  // --- Relationships (Optional but Recommended for TypeORM) ---
  // These help TypeORM understand the foreign keys

  // Link to User

}