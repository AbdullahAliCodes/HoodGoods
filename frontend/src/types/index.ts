// src/types/index.ts

export interface ColorOption {
  id: number;
  color: string;
}

export interface Product {
  id: number; // Corresponds to prodId from backend?
  name: string;
  price: string; // Consider if this should be number if coming directly from backend
  image: string; // Corresponds to imageUrl from backend?
  colorOptions: ColorOption[]; // This field doesn't seem to exist in the backend entity provided
  productquantity: number; // Added: The quantity from the backend
  // --- Potential other fields from backend entity ---
  // description?: string; 
  // category?: string;
  // storeName?: string;
  // userId?: string;
  // isActive?: boolean;
}

export interface Shop {
  id: number;
  name: string;
  image: string;
  info: string;
}

export interface Feature {
  id: number;
  title: string;
  description: string;
  icon: string;
}