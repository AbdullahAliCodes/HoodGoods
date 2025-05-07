// src/pages/ProductsPage.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProductsPage from './ProductsPage';
import { useAuth0, Auth0ContextInterface, User } from '@auth0/auth0-react';
import { useCart } from '../context/ContextCart';

// Mock axios
vi.mock('axios');

// Mock Auth0
vi.mock('@auth0/auth0-react');

// Mock Cart Context
vi.mock('../context/ContextCart');

// Mock search params
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(() => {
      return [
        {
          get: () => {
            // Default is empty string for all params
            return '';
          }
        },
        mockSetSearchParams
      ];
    })
  };
});

// Sample product data
const mockProducts = [
  {
    prodId: 1,
    name: 'Handmade Ceramic Mug',
    description: 'Beautiful artisan mug made with local clay',
    category: 'Home & Living',
    price: 25.99,
    productquantity: 10,
    userId: 'user1',
    imageUrl: 'http://example.com/mug.jpg',
    storeId: 'store1',
    storeName: 'Ceramic Creations',
    isActive: true
  },
  {
    prodId: 2,
    name: 'Leather Journal',
    description: 'Handcrafted leather journal with recycled paper',
    category: 'Stationery',
    price: 35.50,
    productquantity: 5,
    userId: 'user2',
    imageUrl: 'http://example.com/journal.jpg',
    storeId: 'store2',
    storeName: 'Leather Works',
    isActive: true
  }
];

// Helper function to create Auth0 mock
const createAuth0Mock = (isAuthenticated = true, userId = 'user4') => {
  return {
    isAuthenticated,
    user: isAuthenticated ? { sub: userId } : undefined,
    loginWithRedirect: vi.fn(),
    getAccessTokenSilently: vi.fn(),
    logout: vi.fn(),
    // Additional properties required by Auth0ContextInterface
    getAccessTokenWithPopup: vi.fn(),
    getIdTokenClaims: vi.fn(),
    loginWithPopup: vi.fn(),
    handleRedirectCallback: vi.fn(),
    isLoading: false,
    buildAuthorizeUrl: vi.fn(),
    buildLogoutUrl: vi.fn(),
    error: undefined
  } as Auth0ContextInterface<User>;
};

// Helper function to create Cart context mock
const createCartMock = () => {
  return {
    cartItems: [],
    addToCart: vi.fn().mockResolvedValue(undefined),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    cartTotal: 0,
    // Additional properties required by CartContextType
    totalItems: 0,
    totalPrice: 0,
    isLoading: false,
    cartLoaded: true,
    fetchCart: vi.fn()
  };
};

describe('ProductsPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock import.meta.env
    vi.stubGlobal('import', { 
      meta: { 
        env: { 
          VITE_BACKEND_URL: 'http://localhost:3000' 
        } 
      } 
    });
    
    // Set up Auth0 mock
    vi.mocked(useAuth0).mockReturnValue(createAuth0Mock());
    
    // Set up Cart context mock
    vi.mocked(useCart).mockReturnValue(createCartMock());
    
    // Reset search params mock
    mockSetSearchParams.mockClear();
    
    // Mock successful API call by default
    vi.mocked(axios.get).mockResolvedValue({ data: { products: mockProducts } });
  });

  // Test 1: Renders loading state initially
  test('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Loading products...')).toBeInTheDocument();
    // Find spinner by class
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  // Test 2: Renders products after loading
  test('renders products after loading', async () => {
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Check if products are rendered
    expect(screen.getByText('Handmade Ceramic Mug')).toBeInTheDocument();
    expect(screen.getByText('Leather Journal')).toBeInTheDocument();
    
    // Check product details
    expect(screen.getByText('Beautiful artisan mug made with local clay')).toBeInTheDocument();
    expect(screen.getByText('Handcrafted leather journal with recycled paper')).toBeInTheDocument();
    
    // Check prices
    expect(screen.getByText('R25.99')).toBeInTheDocument();
    expect(screen.getByText('R35.50')).toBeInTheDocument();
  });

  // Test 3: Renders error message when API call fails
  test('renders error message when API call fails', async () => {
    // Mock a failed API call
    vi.mocked(axios.get).mockRejectedValue(new Error('Failed to fetch products'));
    
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Error Loading Products')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to fetch products')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  // Test 4: Calls setSearchParams when category filter changes
  test('calls setSearchParams when category filter changes', async () => {
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Select a category
    const categorySelect = screen.getByLabelText('Filter by Category:');
    fireEvent.change(categorySelect, { target: { value: 'Home & Living' } });
    
    // Just check if mockSetSearchParams was called (without checking exact params)
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  // Test 5: Calls setSearchParams when store filter changes
  test('calls setSearchParams when store filter changes', async () => {
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Select a store
    const storeSelect = screen.getByLabelText('Filter by Store:');
    fireEvent.change(storeSelect, { target: { value: 'Leather Works' } });
    
    // Just check if mockSetSearchParams was called (without checking exact params)
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  // Test 6: Calls setSearchParams when search input changes
  test('calls setSearchParams when search input changes', async () => {
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Search for "leather"
    const searchInput = screen.getByPlaceholderText('Search by name, description, store...');
    fireEvent.change(searchInput, { target: { value: 'leather' } });
    
    // Just check if mockSetSearchParams was called (without checking exact params)
    expect(mockSetSearchParams).toHaveBeenCalled();
  });

  // Test 7: Adds product to cart successfully
  test('adds product to cart successfully', async () => {
    const addToCartMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCart).mockReturnValue({
      ...createCartMock(),
      addToCart: addToCartMock
    });
    
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Find all add to cart buttons
    const addToCartButtons = screen.getAllByText('Add to Cart');
    
    // Click on the first one (which should be for Ceramic Mug)
    fireEvent.click(addToCartButtons[0]);
    
    // Check if addToCart was called with correct product
    expect(addToCartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 1,
        productName: 'Handmade Ceramic Mug',
        productPrice: 25.99,
        storeId: 'store1',
      })
    );
  });

  // Test 8: Requires authentication to add to cart
  test('requires authentication to add to cart', async () => {
    // Mock unauthenticated user
    vi.mocked(useAuth0).mockReturnValue(createAuth0Mock(false));
    
    const addToCartMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCart).mockReturnValue({
      ...createCartMock(),
      addToCart: addToCartMock
    });
    
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Find all add to cart buttons
    const addToCartButtons = screen.getAllByText('Add to Cart');
    
    // Click on the first one
    fireEvent.click(addToCartButtons[0]);
    
    // addToCart should not have been called
    expect(addToCartMock).not.toHaveBeenCalled();
  });

  // Test 9: Shows notification when adding to cart
  test('shows notification when adding to cart', async () => {
    const mockAddToCart = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCart).mockReturnValue({
      ...createCartMock(),
      addToCart: mockAddToCart
    });
    
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Find the first "Add to Cart" button and click it
    const addToCartButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addToCartButtons[0]);
    
    // Check if success notification appears
    await waitFor(() => {
      // Use a substring match since the actual text would be "Handmade Ceramic Mug added to cart!"
      const notification = screen.getByText(/added to cart/i);
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveClass('notification-modal');
      expect(notification).toHaveClass('success');
    });
  });

  // Test 10: Verifies that user's own product button is disabled
  test('disables buttons for user\'s own products', async () => {
    // Mock user with ID matching the product's userId
    vi.mocked(useAuth0).mockReturnValue(createAuth0Mock(true, 'user1'));
    
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Find the button for the user's own product (Ceramic Mug)
    const ownProductButton = screen.getByText('Your Product');
    
    // Button should be disabled
    expect(ownProductButton).toBeDisabled();
    
    // Check aria-label for accessibility
    expect(ownProductButton).toHaveAttribute('aria-label', expect.stringContaining('Cannot add own product'));
  });

  // Test 11: Retry button reloads the page
  test('retry button reloads the page when clicked', async () => {
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true
    });
    
    // Mock a failed API call
    vi.mocked(axios.get).mockRejectedValue(new Error('Failed to fetch products'));
    
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Error Loading Products')).toBeInTheDocument();
    });
    
    // Click the retry button
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    
    // Check if reload was called
    expect(reloadMock).toHaveBeenCalled();
  });

  // Test 12: Displays product categories
  test('renders product categories in dropdown', async () => {
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Get the category dropdown
    const categorySelect = screen.getByLabelText('Filter by Category:');
    
    // Check if categories from mock data are present
    expect(categorySelect).toContainElement(screen.getByText('Home & Living'));
    expect(categorySelect).toContainElement(screen.getByText('Stationery'));
  });

  // Test 13: Displays store names
  test('renders store names in dropdown', async () => {
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Get the store dropdown
    const storeSelect = screen.getByLabelText('Filter by Store:');
    
    // Check if store names from mock data are present
    expect(storeSelect).toContainElement(screen.getByText('Ceramic Creations'));
    expect(storeSelect).toContainElement(screen.getByText('Leather Works'));
  });

  // Test 14: Displays available quantity
  test('displays product quantity information', async () => {
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Check if quantity information is displayed
    expect(screen.getByText('Available: 10')).toBeInTheDocument();
    expect(screen.getByText('Available: 5')).toBeInTheDocument();
  });

  // Test 15: Handles API response variations
  test('handles different API response formats', async () => {
    // Mock API response with direct array instead of nested object
    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockProducts });
    
    render(
      <BrowserRouter>
        <ProductsPage />
      </BrowserRouter>
    );
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.queryByText('Loading products...')).not.toBeInTheDocument();
    });
    
    // Check if products are still rendered correctly
    expect(screen.getByText('Handmade Ceramic Mug')).toBeInTheDocument();
    expect(screen.getByText('Leather Journal')).toBeInTheDocument();
  });
});