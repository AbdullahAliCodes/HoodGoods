// src/orders/dto/create-order.dto.ts

import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
  IsPositive,
  Min,
  IsEnum,
  ArrayMinSize,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer'; // Needed for nested validation

// Define the structure for individual items within the cartItems array
export class CartItemDto { // <<< EXPORTED
  @IsNumber()
  @IsNotEmpty()
  productId: number; // Matches Product.prodId type

  @IsNumber()
  @IsPositive({ message: 'Quantity must be a positive number' })
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'Price snapshot cannot be negative' })
  @IsNotEmpty()
  pricePerUnitSnapshot: number; // Price at time of checkout

  @IsString() // Assuming Store PK ('storeId' in Product entity) is string or bigint mapped to string
  @IsNotEmpty()
  storeId: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Cart cannot be empty' })
  @ValidateNested({ each: true }) // Validate each object in the array using CartItemDto rules
  @Type(() => CartItemDto) // Required for class-validator to know the nested type
  cartItems: CartItemDto[];

  @IsObject()
  @IsDefined() // Ensures the object itself is present
  // Validation ensures it's an object; service checks values are 'standard'/'express'
  deliverySelections: Record<string, 'standard' | 'express'>; // Key: storeId, Value: 'standard' or 'express'

  @IsString()
  @IsNotEmpty({ message: 'Pickup area must be selected' })
  selectedArea: string;

  @IsString()
  @IsNotEmpty({ message: 'Pickup point must be selected' })
  selectedPickupPoint: string;

  @IsString()
  @IsNotEmpty({ message: 'Yoco charge ID is missing' })
  yocoChargeId: string; // From Yoco result (e.g., result.id or result.chargeId)

  @IsNumber()
  @Min(0) // Can be 0 if everything is free? Or use IsPositive if > 0 required.
  @IsNotEmpty()
  frontendGrandTotal: number; // Total calculated by frontend (for verification)
}
