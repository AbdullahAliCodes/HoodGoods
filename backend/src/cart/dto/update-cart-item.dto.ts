import { IsNumber, IsPositive, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsNumber()
  @IsPositive() // Quantity must be at least 1 to update, use delete to remove
  @Min(1)
  quantity: number;
}