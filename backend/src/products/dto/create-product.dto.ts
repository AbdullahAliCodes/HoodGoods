// src/products/dto/create-product.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsUrl, IsOptional, Min, IsInt } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional() // Make description optional
  description?: string;

  @IsNumber({ maxDecimalPlaces: 4 }) // Allow up to 4 decimal places for float4/real
  @Min(0) // Price cannot be negative
  price: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsUrl() // Validates if it's a URL format
  @IsOptional() // Make image URL optional during initial creation? Adjust if required.
  imageUrl?: string;

  @IsInt() // Ensure it's a whole number
  @Min(0) // Quantity cannot be negative
  productquantity: number;
}