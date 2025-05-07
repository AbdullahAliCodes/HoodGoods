import { IsNumber, IsPositive, Min } from 'class-validator';

export class CreateCartItemDto {
  @IsNumber()
  productId: number; // Changed to number

  @IsNumber()
  @IsPositive() // Quantity must be at least 1
  @Min(1)
  quantity: number;
}