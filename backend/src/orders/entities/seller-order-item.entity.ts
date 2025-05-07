// src/orders/entities/seller-order-item.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SellerOrder } from './seller-order.entity';
import { Product } from '../../products/entities/product.entity'; // Adjust path if needed

@Entity('SellerOrderItems') // Matches table name in screenshot
export class SellerOrderItem {

  // Matches #seller_order_item_id int4 PK in screenshot
  @PrimaryGeneratedColumn({ name: 'seller_order_item_id', type: 'int' })
  sellerOrderItemId: number; // JS/TS property name

  // Matches seller_order_id int4 FK in screenshot
  @Column({ name: 'seller_order_id', type: 'int' })
  sellerOrderId: number; // JS/TS property name

  // Relationship to SellerOrder
  @ManyToOne(() => SellerOrder, sellerOrder => sellerOrder.items)
  @JoinColumn({ name: 'seller_order_id', referencedColumnName: 'sellerOrderId' }) // FK column name in this table, PK property name in SellerOrder entity
  sellerOrder: SellerOrder;

  // Matches productID int4 FK in screenshot
  @Column({ name: 'productID', type: 'int' })
  productId: number; // JS/TS property name

  // Relationship to Product
  // Ensure Product entity's PK property name is 'prodId' as defined previously
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productID', referencedColumnName: 'prodId' }) // FK column name in this table, PK property name in Product entity
  product: Product;

  // Matches quantity_ordered int4 in screenshot
  @Column({ name: 'quantity_ordered', type: 'int' })
  quantityOrdered: number;

  // Matches price_per_unit float4 in screenshot
  @Column({ name: 'price_per_unit', type: 'float4' }) // Use 'float4' type
  pricePerUnit: number;

  // Matches product_name_snapshot varchar in screenshot
  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 255, nullable: true })
  productNameSnapshot: string;





}
