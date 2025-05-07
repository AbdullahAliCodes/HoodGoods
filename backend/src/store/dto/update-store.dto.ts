// src/store/dto/update-store.dto.ts
import { IsString, IsNumber, IsIn, IsOptional, Min } from 'class-validator';

// Define valid delivery time options for validation (ensure these match create-store.dto.ts)
const VALID_STANDARD_TIMES = ['3-5', '5-7', '7-9'];
const VALID_EXPRESS_TIMES = ['0-1', '1-2', '2-3'];

export class UpdateStoreDto {
  @IsOptional() // Make fields optional for PATCH
  @IsNumber({ maxDecimalPlaces: 4 }) // Allow float precision (matching 'real' type)
  @Min(0) // Price cannot be negative
  standardPrice?: number; // Use '?' for optional

  @IsOptional()
  @IsString()
  @IsIn(VALID_STANDARD_TIMES) // Ensure value is one of the allowed times
  standardTime?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }) // Allow float precision
  @Min(0)
  expressPrice?: number;

  @IsOptional()
  @IsString()
  @IsIn(VALID_EXPRESS_TIMES) // Ensure value is one of the allowed times
  expressTime?: string;
}