// src/orders/entities/seller-order.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../auth/user.entity'; // Adjust path if needed
import { SellerOrderItem } from './seller-order-item.entity';

@Entity('SellerOrders') // Matches table name in screenshot
export class SellerOrder {

  // Matches #seller_order_id int4 PK in screenshot
  @PrimaryGeneratedColumn({ name: 'seller_order_id', type: 'int' })
  sellerOrderId: number; // JS/TS property name

  // Matches order_id int4 FK in screenshot
  @Column({ name: 'order_id', type: 'int' })
  orderId: number; // JS/TS property name

  // Relationship to Order
  @ManyToOne(() => Order, order => order.sellerOrders)
  @JoinColumn({ name: 'order_id', referencedColumnName: 'orderId' }) // FK column name in this table, PK property name in Order entity
  order: Order;

  // Matches userID varchar FK in screenshot (Seller's User ID)
  @Column({ name: 'userID', type: 'varchar' })
  userId: string; // JS/TS property name

  // Relationship to User (Seller)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userID', referencedColumnName: 'userID' }) // FK column name in this table, PK property name in User entity
  seller: User;

  // Matches delivery_method varchar in screenshot
  @Column({ name: 'delivery_method', type: 'varchar', length: 100 })
  deliveryMethod: string;

  // Matches delivery_price float4 in screenshot
  @Column({ name: 'delivery_price', type: 'float4' }) // Use 'float4' type
  deliveryPrice: number;

  // Matches delivery_time_estimate varchar in screenshot
  @Column({ name: 'delivery_time_estimate_snapshot', type: 'varchar', length: 255, nullable: true })
  deliveryTimeEstimate: string;

  // Matches items_subtotal float4 in screenshot
  @Column({ name: 'items_subtotal', type: 'float4' }) // Use 'float4' type
  itemsSubtotal: number;

  // Matches seller_total float4 in screenshot
  @Column({ name: 'seller_total', type: 'float4' }) // Use 'float4' type
  sellerTotal: number;

  // Matches status varchar in screenshot
  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Processing' })
  status: string;


  // Relationship to SellerOrderItem
  @OneToMany(() => SellerOrderItem, item => item.sellerOrder)
  items: SellerOrderItem[];
}
