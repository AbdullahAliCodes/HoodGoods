import React from 'react';
// Ensure ProductFormData is the simplified version (no storeName/delivery)
import { ProductFormData } from '../types/createStore'; // Adjust path if needed

interface ProductFormProps {
  product: ProductFormData; // Uses simplified ProductFormData
  index: number;
  productCategories: string[];
  // --- UPDATE the type for the 'field' parameter to match ProductList ---
  onProductChange: (
      index: number,
      // Omit image fields AND delivery fields
      field: keyof Omit<ProductFormData,
          'image' | 'imagePreview' | 'imageURL' |
          'standardPrice' | 'standardTime' | 'expressPrice' | 'expressTime'
      >,
      value: string
  ) => void;
  // --- End Update ---
  onImageChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  isSubmitting: boolean;
  canRemove: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  index,
  productCategories,
  onProductChange, // Now expects the correctly restricted type
  onImageChange,
  onRemove,
  isSubmitting,
  canRemove,
}) => {
  return (
    <section className="product-section">
      <h3>Product #{index + 1}</h3>

      {/* Product Name */}
      <fieldset className="form-group">
        <label htmlFor={`product-name-${index}`}>Product Name</label>
        <input
          type="text"
          id={`product-name-${index}`}
          value={product.productName}
          // Calls onProductChange with 'productName' - this matches the updated Omit<> type
          onChange={(e) => onProductChange(index, 'productName', e.target.value)}
          placeholder="Enter product name"
          required
          disabled={isSubmitting}
        />
      </fieldset>

      {/* Description */}
      <fieldset className="form-group">
        <label htmlFor={`product-description-${index}`}>Description</label>
        <textarea
          id={`product-description-${index}`}
          value={product.productDescription}
          // Calls onProductChange with 'productDescription' - matches Omit<>
          onChange={(e) => onProductChange(index, 'productDescription', e.target.value)}
          placeholder="Describe your product..."
          rows={4}
          required
          disabled={isSubmitting}
        />
      </fieldset>

      {/* Price, Quantity & Category Row */}
      <article className="form-row">
        {/* Price Fieldset */}
        <fieldset className="form-group">
          <label htmlFor={`product-price-${index}`}>Price (R)</label>
          <input
            type="number"
            id={`product-price-${index}`}
            value={product.productPrice}
            // Calls onProductChange with 'productPrice' - matches Omit<>
            onChange={(e) => onProductChange(index, 'productPrice', e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            required
            disabled={isSubmitting}
          />
        </fieldset>

        {/* Quantity Fieldset */}
        <fieldset className="form-group">
          <label htmlFor={`product-quantity-${index}`}>Quantity Available</label>
          <input
            type="number"
            id={`product-quantity-${index}`}
            value={product.productQuantity}
            // Calls onProductChange with 'productQuantity' - matches Omit<>
            onChange={(e) => onProductChange(index, 'productQuantity', e.target.value)}
            placeholder="0"
            step="1"
            min="0"
            required
            disabled={isSubmitting}
          />
        </fieldset>

        {/* Category Fieldset */}
        <fieldset className="form-group">
          <label htmlFor={`product-category-${index}`}>Category</label>
          <select
            id={`product-category-${index}`}
            value={product.productCategory}
            // Calls onProductChange with 'productCategory' - matches Omit<>
            onChange={(e) => onProductChange(index, 'productCategory', e.target.value)}
            required
            disabled={isSubmitting}
          >
            <option value="">Select a category</option>
            {productCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </fieldset>
      </article>

      {/* Image Upload */}
      <fieldset className="form-group">
         <label htmlFor={`product-image-${index}`}>Product Image *</label>
         <input type="file" id={`product-image-${index}`} accept="image/*" onChange={(e) => onImageChange(index, e)} required disabled={isSubmitting} />
         {product.imagePreview && ( <figure className="image-preview"><img src={product.imagePreview} alt={`Preview`} /></figure> )}
         {!product.image && !product.imagePreview && <small>Please select an image.</small>}
      </fieldset>

      {/* Remove Button */}
      {canRemove && ( <button type="button" className="remove-product-btn" onClick={() => onRemove(index)} disabled={isSubmitting}> Remove Product </button> )}
    </section>
  );
};

export default ProductForm;