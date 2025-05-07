// src/orders/entities/order.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../auth/user.entity'; // Adjust path if needed
import { SellerOrder } from './seller-order.entity';

@Entity('Orders') // Matches table name in screenshot
export class Order {

  // Matches #order_id int4 PK in screenshot
  @PrimaryGeneratedColumn({ name: 'order_id', type: 'int' })
  orderId: number; // JS/TS property name

  // Matches userID varchar FK in screenshot
  @Column({ name: 'userID', type: 'varchar' })
  userId: string; // JS/TS property name

  // Relationship to User (Buyer)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userID', referencedColumnName: 'userID' }) // FK column name in this table, PK property name in User entity
  user: User;

  // Matches order_date date in screenshot
  @Column({ name: 'order_date', type: 'date' }) // Use 'date' type
  orderDate: Date;

  // Matches grand_total float4 in screenshot
  @Column({ name: 'grand_total', type: 'float4' }) // Use 'float4' type (maps to number)
  grandTotal: number;

  // Matches pickup_area varchar in screenshot
  @Column({ name: 'pickup_area', type: 'varchar', length: 255, nullable: true })
  pickupArea: string;

  // Matches pickup_point varchar in screenshot
  @Column({ name: 'pickup_point', type: 'varchar', length: 255, nullable: true })
  pickupPoint: string;



  // Relationship to SellerOrder
  @OneToMany(() => SellerOrder, sellerOrder => sellerOrder.order)
  sellerOrders: SellerOrder[];

  // Optional Yoco ID (using snake_case column name if added)
  // @Column({ name: 'yoco_charge_id', type: 'varchar', length: 255, nullable: true, unique: true })
  // yocoChargeId: string;
}
