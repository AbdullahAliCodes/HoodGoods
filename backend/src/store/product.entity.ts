import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('Products') // Match your exact table name
export class Product {
  @PrimaryColumn({ name: 'productID', type: 'int' })
  prodId: number;
  
  @Column({ name: 'productName', type: 'varchar' })
  name: string;

  @Column({ name: 'productdescription', type: 'text' })
  description: string;

  @Column({ name: 'productcategory', type: 'varchar' })
  category: string;

  @Column({ name: 'productprice', type: 'float' })
  price: number;

  @Column({ name: 'userID', type: 'varchar' })
  userId: string;

  @Column({ name: 'imageURL', type: 'varchar' })
  imageUrl: string;

  @Column({ name: 'storeName', type: 'varchar' })
  storeName: string;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;
  
  @Column({ type: 'int4', default: 0 }) // Assuming integer, default to 0 if not specified
  productquantity: number;

}