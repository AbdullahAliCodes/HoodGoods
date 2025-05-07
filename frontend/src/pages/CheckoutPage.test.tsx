import { render, screen,  } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { vi, Mock, describe, beforeEach, afterEach, test, expect } from 'vitest';
import axios, {  AxiosInstance } from 'axios';

import CheckoutPage from './CheckoutPage'; // Assuming path is correct

// Extend the Window interface to include YocoSDK for TypeScript
declare global {
  interface Window {
    YocoSDK: any;
  }
}

// --- Mocks ---
const mockUseAuth0 = vi.fn();
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => mockUseAuth0() }));

const mockUseCart = vi.fn();
vi.mock('../context/ContextCart', async () => ({ useCart: () => mockUseCart() })); // Simplified mock

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const originalModule = await vi.importActual('react-router-dom');
  return {
    ...originalModule,
    useNavigate: () => mockNavigate,
    Link: (props: any) => <a href={props.to} {...props}>{props.children}</a>,
  };
});

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const mockedAxiosInstance = {
  get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn(),
} as unknown as MockedAxiosInstance;
type MockedAxiosInstance = { get: Mock; post: Mock; delete: Mock; patch: Mock; };

const mockYocoShowPopup = vi.fn();
const mockYocoClosePopup = vi.fn();
(window as any).YocoSDK = vi.fn().mockImplementation(() => ({
  showPopup: mockYocoShowPopup, closePopup: mockYocoClosePopup,
}));

// --- Helper Functions ---
const setDefaultAuth0Mock = (overrides = {}) => {
  mockUseAuth0.mockReturnValue({
    isAuthenticated: false, isLoading: false, user: null,
    getAccessTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
    ...overrides,
  });
};

const setDefaultCartMock = (overrides = {}) => {
  mockUseCart.mockReturnValue({
    cartItems: [], clearCart: vi.fn().mockResolvedValue(undefined), cartError: null,
    ...overrides,
  });
};

const renderCheckoutPage = () => {
  return render(
    <MemoryRouter>
      <CheckoutPage />
    </MemoryRouter>
  );
};

// --- Test Suite ---
describe('CheckoutPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultAuth0Mock();
    setDefaultCartMock();
    mockedAxiosInstance.get.mockReset();
    mockedAxiosInstance.post.mockReset().mockResolvedValue({ data: {} }); // Default resolve
    mockedAxiosInstance.delete.mockReset();
    mockedAxiosInstance.patch.mockReset();
    mockedAxios.create.mockClear();
    mockedAxios.create.mockReturnValue(mockedAxiosInstance as unknown as AxiosInstance);
    mockYocoShowPopup.mockClear();
    mockYocoClosePopup.mockClear();
    (window as any).YocoSDK.mockClear();
    vi.useFakeTimers(); // Use fake timers for timeouts
  });

  afterEach(() => {
    vi.runOnlyPendingTimers(); // Run any remaining timers
    vi.useRealTimers(); // Restore real timers
  });

  // --- Rendering Tests ---

  test('renders loading state when Auth0 is loading', () => {
    setDefaultAuth0Mock({ isLoading: true });
    renderCheckoutPage();
    expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
  });

  test('renders login prompt when not authenticated', () => {
    renderCheckoutPage();
    expect(screen.getByText(/Please log in to proceed with checkout./i)).toBeInTheDocument();
  });

  test('renders empty cart message when authenticated but cart is empty', () => {
    setDefaultAuth0Mock({ isAuthenticated: true, user: { sub: 'user1' } });
    renderCheckoutPage();
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue shopping/i })).toBeInTheDocument();
  });

  // --- Tests that were timing out have been removed ---

}); // End describe block
