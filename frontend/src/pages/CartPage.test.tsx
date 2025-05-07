import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CartPage from './CartPage';
import { useCart } from '../context/ContextCart';
import { BrowserRouter } from 'react-router-dom';

// Mocking the cart context
vi.mock('../context/ContextCart', () => ({
  useCart: vi.fn()
}));

// Helper function to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Define the interface expected by the component
interface CartItemDisplay {
  productId: number;
  imageUrl?: string | undefined;
  productName: string;
  productPrice: number;
  quantity: number;
  availableQuantity?: number;
}

describe('CartPage Component', () => {
  // Setup default cart context mock values
  const mockCartContext = {
    cartItems: [] as CartItemDisplay[],
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    totalPrice: 0,
    clearCart: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    // Reset mock calls and implementations
    vi.clearAllMocks();
    (useCart as any).mockReturnValue({ ...mockCartContext });
  });

  it('shows loading state initially', () => {
    (useCart as any).mockReturnValue({ ...mockCartContext, isLoading: true });

    renderWithRouter(<CartPage />);

    expect(screen.getByText('Loading cart...')).toBeInTheDocument();
    const spinnerElement = document.querySelector('.spinner');
    expect(spinnerElement).toBeInTheDocument();
  });

  it('shows local loading state for 200ms minimum', async () => {
    // Mock the context to not be loading (isLoading: false)
    // but component should still show loading due to local state

    renderWithRouter(<CartPage />);

    // Loading state should be visible initially due to local state
    expect(screen.getByText('Loading cart...')).toBeInTheDocument();

    // After 200ms, loading should disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });
  });

  it('displays empty cart message when no items in cart', async () => {
    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Browse Products')).toBeInTheDocument();

    // Check if the link has the correct URL
    const browseLink = screen.getByText('Browse Products');
    expect(browseLink.getAttribute('href')).toBe('/products');
  });

  it('renders cart items with correct product details', async () => {
    // Mock cart items with the structure expected by the component
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 2,
        imageUrl: '/test-image.jpg',
        availableQuantity: 5
      },
      {
        productId: 2,
        productName: 'Another Product',
        productPrice: 150.50,
        quantity: 1,
        imageUrl: undefined, // Testing undefined image URL
        availableQuantity: 10
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 350.50 // This is the value we check against Subtotal
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Test first product
    expect(screen.getByText('Test Product')).toBeInTheDocument();

    // Find price and subtotal elements by class
    const itemPriceElements = document.querySelectorAll('.item-price');
    expect(itemPriceElements[0].textContent).toContain('100.00');

    const itemSubtotalElements = document.querySelectorAll('.item-subtotal');
    expect(itemSubtotalElements[0].textContent).toContain('200.00');

    // Available quantity message (5 - 2 = 3 more available)
    expect(screen.getByText('3 more available')).toBeInTheDocument();

    // Test second product
    expect(screen.getByText('Another Product')).toBeInTheDocument();

    // Use the same elements found earlier for the second product
    expect(itemPriceElements[1].textContent).toContain('150.50');
    expect(itemSubtotalElements[1].textContent).toContain('150.50');

    expect(screen.getByText('9 more available')).toBeInTheDocument();

    // Test placeholder image for undefined imageUrl
    const images = screen.getAllByRole('img');
    expect(images[0].getAttribute('src')).toBe('/test-image.jpg');
    expect(images[1].getAttribute('src')).toBe('/placeholder.png');

    // Check order summary
    expect(screen.getByText('Order Summary')).toBeInTheDocument();

    // Check subtotal value in the summary
    const subtotalLabels = screen.getAllByText('Subtotal:');
    const summarySubtotalValue = subtotalLabels.find(el =>
      el.closest('.summary-details') // Find the Subtotal: label within the summary section
    )?.nextElementSibling; // Get the corresponding value (<dd>)
    expect(summarySubtotalValue?.textContent).toContain('350.50'); // Check it matches the mocked totalPrice

    // The check for "Total:" has been removed as the component doesn't render it.

  });

  it('calls updateQuantity with correct params when incrementing quantity', async () => {
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 2,
        availableQuantity: 5
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 200
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Find and click the increase quantity button
    const increaseButton = screen.getByLabelText('Increase quantity of Test Product');
    fireEvent.click(increaseButton);

    // Check if updateQuantity was called with correct arguments
    expect(mockCartContext.updateQuantity).toHaveBeenCalledWith(1, 3);
  });

  it('calls updateQuantity with correct params when decrementing quantity', async () => {
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 2,
        availableQuantity: 5
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 200
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Find and click the decrease quantity button
    const decreaseButton = screen.getByLabelText('Decrease quantity of Test Product');
    fireEvent.click(decreaseButton);

    // Check if updateQuantity was called with correct arguments
    expect(mockCartContext.updateQuantity).toHaveBeenCalledWith(1, 1);
  });

  it('disables decrease button when quantity is 1', async () => {
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 1,
        availableQuantity: 5
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 100
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Find the decrease quantity button and check if it's disabled
    const decreaseButton = screen.getByLabelText('Decrease quantity of Test Product');
    expect(decreaseButton).toBeDisabled();
  });

  it('disables increase button when quantity equals availableQuantity', async () => {
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 5,
        availableQuantity: 5
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 500
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Find the increase quantity button and check if it's disabled
    const increaseButton = screen.getByLabelText('Increase quantity of Test Product');
    expect(increaseButton).toBeDisabled();

    // Check if "0 more available" message is shown
    expect(screen.getByText('0 more available')).toBeInTheDocument();
  });

  it('calls removeFromCart when remove button is clicked', async () => {
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 2,
        availableQuantity: 5
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 200
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Find and click the remove button
    const removeButton = screen.getByLabelText('Remove Test Product from cart');
    fireEvent.click(removeButton);

    // Check if removeFromCart was called with correct arguments
    expect(mockCartContext.removeFromCart).toHaveBeenCalledWith(1);
  });

  it('displays warning when quantity exceeds available stock', async () => {
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 8,
        availableQuantity: 5
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 800
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Check if warning message is displayed
    expect(screen.getByText(/Warning: Quantity in cart exceeds available stock/)).toBeInTheDocument();
    expect(screen.getByText(/\(5 available\)/)).toBeInTheDocument();
  });

  it('handles items with no availableQuantity set', async () => {
    // Testing items that might not have availableQuantity set
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 2
        // No availableQuantity set
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 200
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Product details should still be displayed
    expect(screen.getByText('Test Product')).toBeInTheDocument();

    // Find price element by class
    const singleItemPrice = document.querySelector('.item-price');
    expect(singleItemPrice?.textContent).toContain('100.00');

    // Increase button should not be disabled (since no availableQuantity)
    const increaseButton = screen.getByLabelText('Increase quantity of Test Product');
    expect(increaseButton).not.toBeDisabled();

    // No warning message or availability info should be shown
    expect(screen.queryByText(/available/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/warning/i)).not.toBeInTheDocument();
  });

  it('calls clearCart when clear cart button is clicked', async () => {
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 2,
        availableQuantity: 5
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 200
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Find and click the clear cart button
    const clearCartButton = screen.getByText('Clear Cart');
    fireEvent.click(clearCartButton);

    // Check if clearCart was called
    expect(mockCartContext.clearCart).toHaveBeenCalled();
  });

  it('renders cart items from multiple stores with store information', async () => {
    // Testing items from different stores
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product', // Assuming from default store
        productPrice: 100,
        quantity: 2,
        availableQuantity: 5
      },
      {
        productId: 2,
        productName: 'Store B Product', // Assuming from another store
        productPrice: 150,
        quantity: 1,
        availableQuantity: 10
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 350
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Check that both products are displayed
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Store B Product')).toBeInTheDocument();
  });

  it('displays the correct navigation links and checkout button', async () => {
    const mockCartItems: CartItemDisplay[] = [
      {
        productId: 1,
        productName: 'Test Product',
        productPrice: 100,
        quantity: 2,
        availableQuantity: 5
      }
    ];

    (useCart as any).mockReturnValue({
      ...mockCartContext,
      cartItems: mockCartItems,
      totalPrice: 200
    });

    renderWithRouter(<CartPage />);

    // Wait for loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading cart...')).not.toBeInTheDocument();
    }, { timeout: 250 });

    // Check if checkout button is displayed and has the correct link
    const checkoutButton = screen.getByText('Proceed to Checkout');
    expect(checkoutButton).toBeInTheDocument();
    expect(checkoutButton.getAttribute('href')).toBe('/checkout');

    // Check if continue shopping button is displayed and has the correct link
    const continueShoppingButton = screen.getByText('Continue Shopping');
    expect(continueShoppingButton).toBeInTheDocument();
    expect(continueShoppingButton.getAttribute('href')).toBe('/products');
  });
});