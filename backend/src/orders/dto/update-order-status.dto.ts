// src/orders/dto/update-order-status.dto.ts

import { IsNotEmpty, IsString, IsIn } from 'class-validator';

// Define the allowed status values a seller can set
const ALLOWED_STATUSES = ['Processing', 'Packaging', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'] as const;
// You can customize this list based on your desired workflow

// Create a type from the allowed statuses tuple
type OrderStatus = typeof ALLOWED_STATUSES[number];

export class UpdateOrderStatusDto {
  @IsNotEmpty({ message: 'Status cannot be empty' })
  @IsString()
  @IsIn(ALLOWED_STATUSES, { message: 'Invalid status value provided.' }) // Validate against allowed values
  status: OrderStatus; // Use the specific OrderStatus type
}

