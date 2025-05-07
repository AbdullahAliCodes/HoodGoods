// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import App from './App';
import { useAuth0 } from '@auth0/auth0-react';

// Mock all components used in App
vi.mock('./components/Navbar', () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>
}));

vi.mock('./components/Hero', () => ({
  default: () => <div data-testid="mock-hero">Hero</div>
}));

vi.mock('./components/WhyChooseUs', () => ({
  default: () => <div data-testid="mock-why-choose-us">WhyChooseUs</div>
}));

vi.mock('./components/Footer', () => ({
  default: () => <div data-testid="mock-footer">Footer</div>
}));

vi.mock('./pages/CartPage', () => ({
  default: () => <div data-testid="mock-cart-page">CartPage</div>
}));

vi.mock('./pages/ProductsPage', () => ({
  default: () => <div data-testid="mock-products-page">ProductsPage</div>
}));

vi.mock('./pages/CreateYourStore', () => ({
  default: () => <div data-testid="mock-create-your-store">CreateYourStore</div>
}));

vi.mock('./pages/MyStore', () => ({
  default: () => <div data-testid="mock-my-store">MyStore</div>
}));

vi.mock('./pages/AdminDashboard', () => ({
  default: () => <div data-testid="mock-admin-dashboard">AdminDashboard</div>
}));

vi.mock('./pages/CheckoutPage', () => ({
  default: () => <div data-testid="mock-checkout-page">CheckoutPage</div>
}));

vi.mock('./pages/OrderConfirmationPage', () => ({
  default: () => <div data-testid="mock-order-confirmation-page">OrderConfirmationPage</div>
}));

vi.mock('./pages/SellerDashboardPage', () => ({
  default: () => <div data-testid="mock-seller-dashboard-page">SellerDashboardPage</div>
}));

vi.mock('./pages/MyOrdersPage', () => ({
  default: () => <div data-testid="mock-my-orders-page">MyOrdersPage</div>
}));

// Instead of mocking ProtectedRoute to just render its children,
// we'll implement the actual role-checking logic to test auth properly
vi.mock('./components/ProtectedRoute', () => ({
  default: ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const { isAuthenticated, user } = useAuth0();
    
    // Get user roles from auth0 user object
    const userRoles = user?.['https://hoodsgoods.com/roles'] || [];
    
    // Check if user is authenticated and has allowed roles
    const hasRequiredRole = isAuthenticated && 
      (allowedRoles.some(role => userRoles.includes(role)));
    
    return (
      <div 
        data-testid="protected-route" 
        data-roles={allowedRoles.join(',')}
        data-authenticated={isAuthenticated}
        data-has-role={hasRequiredRole}
      >
        {hasRequiredRole ? children : <div data-testid="access-denied">Access Denied</div>}
      </div>
    );
  }
}));

// Mock the Auth0 hook with different authentication scenarios
const mockUseAuth0 = vi.fn();
vi.mock('@auth0/auth0-react', async () => {
  const actual = await vi.importActual('@auth0/auth0-react');
  return {
    ...actual,
    useAuth0: () => mockUseAuth0(),
    // We're still mocking Auth0Provider, but no need to import it
    Auth0Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>
  };
});

// Mock context provider
vi.mock('./context/ContextCart', () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Auth scenarios
const createAuthState = (isAuthenticated: boolean, roles: string[] = []) => {
  return {
    isAuthenticated,
    user: isAuthenticated ? {
      sub: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      'https://hoodsgoods.com/roles': roles
    } : undefined,
    isLoading: false,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn(),
    getAccessTokenWithPopup: vi.fn(),
    getIdTokenClaims: vi.fn(),
    loginWithPopup: vi.fn(),
    handleRedirectCallback: vi.fn(),
    buildAuthorizeUrl: vi.fn(),
    buildLogoutUrl: vi.fn(),
    error: undefined
  };
};

// Auth scenarios
const authScenarios = {
  // Not authenticated
  notAuthenticated: createAuthState(false),
  
  // Authenticated as buyer
  authenticatedAsBuyer: createAuthState(true, ['buyer']),
  
  // Authenticated as seller
  authenticatedAsSeller: createAuthState(true, ['seller']),
  
  // Authenticated as admin
  authenticatedAsAdmin: createAuthState(true, ['admin']),
  
  // Authenticated with multiple roles
  authenticatedWithMultipleRoles: createAuthState(true, ['buyer', 'seller'])
};

// Mock import.meta.env
beforeEach(() => {
  vi.stubGlobal('import', {
    meta: {
      env: {
        VITE_AUTH0_DOMAIN: 'test-domain.auth0.com',
        VITE_AUTH0_CLIENT_ID: 'test-client-id',
        VITE_AUTH0_AUDIENCE: 'test-audience',
        VITE_AUTH0_CALLBACK_URL: 'http://localhost:3000'
      }
    }
  });
  
  // Reset auth mock
  mockUseAuth0.mockReturnValue(authScenarios.notAuthenticated);
});

describe('App component', () => {
  // Test 1: Renders main components (Navbar, Footer)
  test('renders main structural components', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });

  // Test 2: Renders home page components on root route
  test('renders home page components on root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('mock-hero')).toBeInTheDocument();
    expect(screen.getByTestId('mock-why-choose-us')).toBeInTheDocument();
  });

  // Test 3: Renders products page on /products route
  test('renders products page on /products route', () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('mock-products-page')).toBeInTheDocument();
  });

  // Test 4: Access denied for cart page when not authenticated
  test('shows access denied for cart page when not authenticated', () => {
    mockUseAuth0.mockReturnValue(authScenarios.notAuthenticated);
    
    render(
      <MemoryRouter initialEntries={['/cart']}>
        <App />
      </MemoryRouter>
    );
    
    const protectedRoute = screen.getByTestId('protected-route');
    expect(protectedRoute).toBeInTheDocument();
    expect(protectedRoute).toHaveAttribute('data-roles', 'buyer,seller');
    expect(protectedRoute).toHaveAttribute('data-authenticated', 'false');
    expect(protectedRoute).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-cart-page')).not.toBeInTheDocument();
  });

  // Test 5: Access granted for cart page when authenticated as buyer
  test('shows cart page when authenticated as buyer', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    
    render(
      <MemoryRouter initialEntries={['/cart']}>
        <App />
      </MemoryRouter>
    );
    
    const protectedRoute = screen.getByTestId('protected-route');
    expect(protectedRoute).toBeInTheDocument();
    expect(protectedRoute).toHaveAttribute('data-authenticated', 'true');
    expect(protectedRoute).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-cart-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  // Test 6: Access granted for cart page when authenticated as seller
  test('shows cart page when authenticated as seller', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsSeller);
    
    render(
      <MemoryRouter initialEntries={['/cart']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('mock-cart-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  // Test 7: Access denied for create store when authenticated as seller
  test('shows access denied for create store page when authenticated as seller', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsSeller);
    
    render(
      <MemoryRouter initialEntries={['/create-store']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-create-your-store')).not.toBeInTheDocument();
  });

  // Test 8: Access granted for create store when authenticated as buyer
  test('shows create store page when authenticated as buyer', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    
    render(
      <MemoryRouter initialEntries={['/create-store']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-create-your-store')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  // Test 9: Access denied for my store when authenticated as buyer
  test('shows access denied for my store page when authenticated as buyer', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    
    render(
      <MemoryRouter initialEntries={['/my-store']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-my-store')).not.toBeInTheDocument();
  });

  // Test 10: Access granted for my store when authenticated as seller
  test('shows my store page when authenticated as seller', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsSeller);
    
    render(
      <MemoryRouter initialEntries={['/my-store']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-my-store')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  // Test 11: Access denied for admin dashboard when not admin
  test('shows access denied for admin dashboard when authenticated as buyer', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    
    render(
      <MemoryRouter initialEntries={['/admin-dashboard']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-admin-dashboard')).not.toBeInTheDocument();
  });

  // Test 12: Access granted for admin dashboard when admin
  test('shows admin dashboard when authenticated as admin', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsAdmin);
    
    render(
      <MemoryRouter initialEntries={['/admin-dashboard']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-admin-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  // Test 13: Access granted for my orders when authenticated as buyer
  test('shows my orders page when authenticated as buyer', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    
    render(
      <MemoryRouter initialEntries={['/my-orders']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-my-orders-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  // Test 14: Access granted for my orders when authenticated as seller
  test('shows my orders page when authenticated as seller', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsSeller);
    
    render(
      <MemoryRouter initialEntries={['/my-orders']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'true');
    expect(screen.getByTestId('mock-my-orders-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  // Test 15: Access denied for seller dashboard when authenticated as buyer
  test('shows access denied for seller dashboard when authenticated as buyer', () => {
    mockUseAuth0.mockReturnValue(authScenarios.authenticatedAsBuyer);
    
    render(
      <MemoryRouter initialEntries={['/seller-dashboard']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('protected-route')).toHaveAttribute('data-has-role', 'false');
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-seller-dashboard-page')).not.toBeInTheDocument();
  });
});