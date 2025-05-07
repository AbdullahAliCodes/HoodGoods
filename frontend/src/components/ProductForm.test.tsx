// src/components/ProductForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ProductForm from './ProductForm';
import { ProductFormData } from '../types/createStore';

// Sample product data for testing
const mockProduct: ProductFormData = {
  productName: 'Test Product',
  productDescription: 'This is a test product description',
  productPrice: '29.99',
  productQuantity: '10',
  productCategory: 'Art',
  image: null,
  imagePreview: null,
  imageURL: undefined
};

// Sample categories
const mockCategories = [
  'Home & Living', 
  'Jewellery & Accessories', 
  'Clothing', 
  'Art', 
  'Crafts & Collectibles'
];

describe('ProductForm component', () => {
  // Mock functions for props
  const mockOnProductChange = vi.fn();
  const mockOnImageChange = vi.fn();
  const mockOnRemove = vi.fn();
  
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  // Test 1: Basic rendering
  test('renders all form elements correctly', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );
    
    // Check heading
    expect(screen.getByText('Product #1')).toBeInTheDocument();
    
    // Check input fields
    expect(screen.getByLabelText('Product Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Price (R)')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity Available')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText(/Product Image/)).toBeInTheDocument();
    
    // Check if values are populated correctly
    expect(screen.getByLabelText('Product Name')).toHaveValue('Test Product');
    expect(screen.getByLabelText('Description')).toHaveValue('This is a test product description');
    expect(screen.getByLabelText('Price (R)')).toHaveValue(29.99);
    expect(screen.getByLabelText('Quantity Available')).toHaveValue(10);
    expect(screen.getByLabelText('Category')).toHaveValue('Art');
    
    // Check if remove button is present
    expect(screen.getByText('Remove Product')).toBeInTheDocument();
  });

  // Test 2: Input changes call the correct handlers - Fixed approach
  test('calls the correct handlers when inputs change', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );
    
    // Test name change - use fireEvent instead of userEvent
    const nameInput = screen.getByLabelText('Product Name');
    fireEvent.change(nameInput, { target: { value: 'New Product Name' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(0, 'productName', 'New Product Name');
    
    // Test description change
    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'New description' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(0, 'productDescription', 'New description');
    
    // Test price change
    const priceInput = screen.getByLabelText('Price (R)');
    fireEvent.change(priceInput, { target: { value: '39.99' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(0, 'productPrice', '39.99');
    
    // Test quantity change
    const quantityInput = screen.getByLabelText('Quantity Available');
    fireEvent.change(quantityInput, { target: { value: '20' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(0, 'productQuantity', '20');
    
    // Test category change
    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: 'Clothing' } });
    expect(mockOnProductChange).toHaveBeenCalledWith(0, 'productCategory', 'Clothing');
  });

  // Test 3: Image change handler
  test('calls image change handler when file is selected', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );
    
    // Create a file and dispatch a change event
    const file = new File(['image content'], 'test-image.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Product Image/) as HTMLInputElement;
    
    // Simulate file change event
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Check if image change handler was called with correct params
    expect(mockOnImageChange).toHaveBeenCalledTimes(1);
    expect(mockOnImageChange).toHaveBeenCalledWith(0, expect.any(Object));
  });

  // Test 4: Remove button calls remove handler
  test('calls remove handler when remove button is clicked', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );
    
    // Click remove button - use fireEvent
    const removeButton = screen.getByText('Remove Product');
    fireEvent.click(removeButton);
    
    // Check if remove handler was called with correct index
    expect(mockOnRemove).toHaveBeenCalledTimes(1);
    expect(mockOnRemove).toHaveBeenCalledWith(0);
  });

  // Test 5: Remove button is not shown when canRemove is false
  test('hides remove button when canRemove is false', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={false}
      />
    );
    
    // Check that remove button is not present
    expect(screen.queryByText('Remove Product')).not.toBeInTheDocument();
  });

  // Test 6: Form is disabled when isSubmitting is true
  test('disables all form elements when isSubmitting is true', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={true}
        canRemove={true}
      />
    );
    
    // Check that all inputs are disabled
    expect(screen.getByLabelText('Product Name')).toBeDisabled();
    expect(screen.getByLabelText('Description')).toBeDisabled();
    expect(screen.getByLabelText('Price (R)')).toBeDisabled();
    expect(screen.getByLabelText('Quantity Available')).toBeDisabled();
    expect(screen.getByLabelText('Category')).toBeDisabled();
    expect(screen.getByLabelText(/Product Image/)).toBeDisabled();
    expect(screen.getByText('Remove Product')).toBeDisabled();
  });

  // Test 7: Shows image preview when available
  test('displays image preview when available', () => {
    const productWithPreview = {
      ...mockProduct,
      imagePreview: 'data:image/png;base64,fakeImageData'
    };
    
    render(
      <ProductForm
        product={productWithPreview}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );
    
    // Check if preview image is rendered
    const previewImage = screen.getByAltText('Preview');
    expect(previewImage).toBeInTheDocument();
    expect(previewImage).toHaveAttribute('src', 'data:image/png;base64,fakeImageData');
  });

  // Test 8: Shows "Please select an image" prompt when no image is selected
  test('shows prompt when no image is selected', () => {
    const productWithoutImage = {
      ...mockProduct,
      image: null,
      imagePreview: null
    };
    
    render(
      <ProductForm
        product={productWithoutImage}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );
    
    // Check if prompt is shown
    expect(screen.getByText('Please select an image.')).toBeInTheDocument();
  });

  // Test 9: Properly renders product categories in select dropdown
  test('renders all product categories in the dropdown', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={0}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );
    
    // Check for default option
    expect(screen.getByText('Select a category')).toBeInTheDocument();
    
    // Check if all categories are present
    mockCategories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument();
    });
  });

  // Test 10: Renders with different index
  test('renders with different index', () => {
    render(
      <ProductForm
        product={mockProduct}
        index={2}
        productCategories={mockCategories}
        onProductChange={mockOnProductChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        isSubmitting={false}
        canRemove={true}
      />
    );
    
    // Check that the correct product number is displayed
    expect(screen.getByText('Product #3')).toBeInTheDocument();
    
    // Check IDs for inputs contain the index
    expect(screen.getByLabelText('Product Name')).toHaveAttribute('id', 'product-name-2');
    expect(screen.getByLabelText('Description')).toHaveAttribute('id', 'product-description-2');
    expect(screen.getByLabelText('Price (R)')).toHaveAttribute('id', 'product-price-2');
    expect(screen.getByLabelText('Quantity Available')).toHaveAttribute('id', 'product-quantity-2');
    expect(screen.getByLabelText('Category')).toHaveAttribute('id', 'product-category-2');
    expect(screen.getByLabelText(/Product Image/)).toHaveAttribute('id', 'product-image-2');
  });
});