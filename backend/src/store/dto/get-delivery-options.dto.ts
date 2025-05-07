// src/store/dto/get-delivery-options.dto.ts
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class GetDeliveryOptionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true }) // Ensure each element in the array is a string
  storeIds: string[];
}