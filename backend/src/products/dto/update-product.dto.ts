// src/products/dto/update-product.dto.ts

export interface UpdateProductDto {
  name?: string;                 // Changed from productName
  description?: string;          // Changed from productDescription
  price?: number;                // Changed from productPrice
  category?: string;             // Changed from productCategory
  imageUrl?: string;             // Changed from imageURL
  productquantity?: number;      // Added optional product quantity field
  // storeName is typically not updated individually here, but managed at the store level
  // isActive might be handled by separate activate/deactivate endpoints
}