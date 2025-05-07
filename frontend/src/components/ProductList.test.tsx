import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import { ProductFormData } from '../types/createStore';

// Mock the ProductForm component
vi.mock('./ProductForm', () => ({
  default: vi.fn(() => <div data-testid="product-form">Mocked Product Form</div>)
}));

describe('ProductList Component', () => {
  // Define mock product data that matches the expected type
  const mockProducts: ProductFormData[] = [
    {
      productName: 'Test Product 1',
      productDescription: 'Description 1',
      productPrice: '10.99',
      productQuantity: '10',
      productCategory: 'Category A',
      image: null,
      imagePreview: '',
      imageURL: ''
    },
    {
      productName: 'Test Product 2',
      productDescription: 'Description 2',
      productPrice: '20.99',
      productQuantity: '5',
      productCategory: 'Category B',
      image: null,
      imagePreview: '',
      imageURL: ''
    }
  ];

  // Define correct type for onProductChange to match the component
  const onProductChangeFn = vi.fn((_index: number, _field: keyof Omit<ProductFormData,
      'image' | 'imagePreview' | 'imageURL' |
      'standardPrice' | 'standardTime' | 'expressPrice' | 'expressTime'
  >, _value: string) => {});

  // Define mock props
  const mockProps = {
    products: mockProducts,
    productCategories: ['Category A', 'Category B', 'Category C'],
    onProductChange: onProductChangeFn,
    onImageChange: vi.fn(),
    onRemoveProduct: vi.fn(),
    onAddProduct: vi.fn(),
    isSubmitting: false
  };

  beforeEach(() => {
    // Clear all mock calls before each test
    vi.clearAllMocks();
    
    // Reset the ProductForm mock implementation for each test
    (ProductForm as any).mockImplementation(() => <div data-testid="product-form">Mocked Product Form</div>);
  });

  it('renders correctly with products', () => {
    render(<ProductList {...mockProps} />);
    
    // Check heading and description
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Add at least one product. Ensure all fields are filled and an image is selected.')).toBeInTheDocument();
    
    // Check that ProductForm is rendered for each product
    const productForms = screen.getAllByTestId('product-form');
    expect(productForms).toHaveLength(2);
    
    // Check that add button is rendered
    expect(screen.getByText('+ Add Another Product')).toBeInTheDocument();
  });

  it('calls onAddProduct when add button is clicked', () => {
    render(<ProductList {...mockProps} />);
    
    const addButton = screen.getByText('+ Add Another Product');
    fireEvent.click(addButton);
    
    // Verify the handler was called
    expect(mockProps.onAddProduct).toHaveBeenCalledTimes(1);
  });

  it('passes correct props to ProductForm components', () => {
    render(<ProductList {...mockProps} />);
    
    // Check that ProductForm is called with correct props for each product
    expect(ProductForm).toHaveBeenCalledTimes(2);
    
    // Get the first call arguments and verify they contain the expected properties
    const firstCallArgs = (ProductForm as any).mock.calls[0][0];
    expect(firstCallArgs.product).toEqual(mockProps.products[0]);
    expect(firstCallArgs.index).toBe(0);
    expect(firstCallArgs.productCategories).toEqual(mockProps.productCategories);
    expect(firstCallArgs.onProductChange).toBe(mockProps.onProductChange);
    expect(firstCallArgs.onImageChange).toBe(mockProps.onImageChange);
    expect(firstCallArgs.onRemove).toBe(mockProps.onRemoveProduct);
    expect(firstCallArgs.isSubmitting).toBe(mockProps.isSubmitting);
    expect(firstCallArgs.canRemove).toBe(true);
    
    // Get the second call arguments and verify they contain the expected properties
    const secondCallArgs = (ProductForm as any).mock.calls[1][0];
    expect(secondCallArgs.product).toEqual(mockProps.products[1]);
    expect(secondCallArgs.index).toBe(1);
    expect(secondCallArgs.productCategories).toEqual(mockProps.productCategories);
    expect(secondCallArgs.onProductChange).toBe(mockProps.onProductChange);
    expect(secondCallArgs.onImageChange).toBe(mockProps.onImageChange);
    expect(secondCallArgs.onRemove).toBe(mockProps.onRemoveProduct);
    expect(secondCallArgs.isSubmitting).toBe(mockProps.isSubmitting);
    expect(secondCallArgs.canRemove).toBe(true);
  });

  it('disables add button when isSubmitting is true', () => {
    render(<ProductList {...mockProps} isSubmitting={true} />);
    
    const addButton = screen.getByText('+ Add Another Product');
    expect(addButton).toBeDisabled();
  });

  it('does not allow removing the last product', () => {
    // Modify props to have only one product
    const singleProductProps = {
      ...mockProps,
      products: [mockProps.products[0]]
    };
    
    render(<ProductList {...singleProductProps} />);
    
    // Check that ProductForm is called with canRemove: false
    const callArgs = (ProductForm as any).mock.calls[0][0];
    expect(callArgs.canRemove).toBe(false);
  });

  it('renders correct section class name', () => {
    const { container } = render(<ProductList {...mockProps} />);
    const section = container.querySelector('section.product-list-section');
    expect(section).toBeInTheDocument();
  });

  it('renders the correct number of ProductForm components', () => {
    // Test with 3 products
    const threeProductProps = {
      ...mockProps,
      products: [
        ...mockProps.products,
        {
          productName: 'Test Product 3',
          productDescription: 'Description 3',
          productPrice: '30.99',
          productQuantity: '15',
          productCategory: 'Category C',
          image: null,
          imagePreview: '',
          imageURL: ''
        }
      ]
    };
    
    render(<ProductList {...threeProductProps} />);
    
    // Should render 3 ProductForm components
    expect(ProductForm).toHaveBeenCalledTimes(3);
    const productForms = screen.getAllByTestId('product-form');
    expect(productForms).toHaveLength(3);
  });

  it('handles button click correctly when disabled', () => {
    render(<ProductList {...mockProps} isSubmitting={true} />);
    
    const addButton = screen.getByText('+ Add Another Product');
    fireEvent.click(addButton);
    
    // The handler should not be called when button is disabled
    expect(mockProps.onAddProduct).not.toHaveBeenCalled();
  });
  
  it('correctly passes onProductChange handler to ProductForm', () => {
    render(<ProductList {...mockProps} />);
    
    // Extract the onProductChange handler that was passed to ProductForm
    const passedProps = (ProductForm as any).mock.calls[0][0];
    const passedHandler = passedProps.onProductChange;
    
    // Call the handler
    passedHandler(0, 'productName', 'Updated Name');
    
    // Verify our mock was called with correct parameters
    expect(mockProps.onProductChange).toHaveBeenCalledWith(0, 'productName', 'Updated Name');
  });
});