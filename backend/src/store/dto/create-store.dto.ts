// src/store/dto/create-store.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsIn, ValidateNested, ArrayMinSize, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer'; // Needed for nested validation
import { CreateProductDto } from '../../products/dto/create-product.dto'; // Adjust path if needed

// Define valid delivery time options for validation
const VALID_STANDARD_TIMES = ['3-5', '5-7', '7-9'];
const VALID_EXPRESS_TIMES = ['0-1', '1-2', '2-3'];

export class CreateStoreDto { // Renamed for convention
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsNumber({ maxDecimalPlaces: 4 }) // Allow float precision
  @Min(0) // Price cannot be negative
  standardPrice: number;

  @IsString()
  @IsIn(VALID_STANDARD_TIMES) // Ensure value is one of the allowed times
  standardTime: string;

  @IsNumber({ maxDecimalPlaces: 4 }) // Allow float precision
  @Min(0)
  expressPrice: number;

  @IsString()
  @IsIn(VALID_EXPRESS_TIMES) // Ensure value is one of the allowed times
  expressTime: string;

  // --- Nested Validation for Initial Products ---
  @IsArray()
  @ValidateNested({ each: true }) // Validate each object in the array
  @ArrayMinSize(1) // Ensure at least one product is provided
  @Type(() => CreateProductDto) // Specify the type of the objects in the array
  products: CreateProductDto[];
  // --- End Nested Validation ---
}