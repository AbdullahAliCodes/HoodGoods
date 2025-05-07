import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom'; // Import Routes and Route for path checking
import { vi } from 'vitest'; // Or import { jest } from '@jest/globals'; if using Jest
import Navbar from './Navbar'; // Adjust path if needed

// --- Mocks ---

// Mock useAuth0 hook
const mockUseAuth0 = vi.fn();
vi.mock('@auth0/auth0-react', () => ({
    useAuth0: () => mockUseAuth0(), // Return the mock function's result
}));

// Mock fetch API
global.fetch = vi.fn();
const mockedFetch = vi.mocked(global.fetch);

// Mock sessionStorage
const mockSessionStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Mock window.location
const originalLocation = window.location;
beforeAll(() => {
    Object.defineProperty(window, 'location', {
        writable: true,
        value: {
            ...originalLocation,
            assign: vi.fn(),
            reload: vi.fn(),
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000/',
            pathname: '/', // Default to home page for tests
        },
    });
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    // Mock getElementById
    document.getElementById = vi.fn();

});

afterAll(() => {
    // Restore original window.location
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
    });
    // Clean up mocks
    vi.restoreAllMocks();
    // @ts-ignore - Reset mock implementation if needed
    document.getElementById.mockRestore?.();
    // @ts-ignore - Reset mock implementation if needed
    window.HTMLElement.prototype.scrollIntoView.mockRestore?.();
});


// Mock ImageImports
vi.mock('./utils/ImageImports', () => ({
    logo: 'mock-logo.png',
}));

// Helper to set default Auth0 mock values
const setDefaultAuth0Mock = (overrides = {}) => {
    mockUseAuth0.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        getAccessTokenSilently: vi.fn().mockResolvedValue('mock-access-token'),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
        getIdTokenClaims: vi.fn(),
        ...overrides,
    });
};

// Helper to setup fetch mocks for role/register
const setupFetchMocks = (roleResponse: any = { role: 'user' }, roleStatus = 200, registerStatus = 200) => {
     mockedFetch.mockImplementation(async (url) => {
         const urlString = url.toString();
         if (urlString.includes('/auth/me')) {
             if (roleStatus !== 200) {
                 return Promise.resolve({ ok: false, status: roleStatus, statusText: `Error ${roleStatus}` } as Response);
             }
             return Promise.resolve({
                 ok: true,
                 status: 200,
                 json: async () => roleResponse,
             } as Response);
         }
         if (urlString.includes('/auth/register')) {
             return Promise.resolve({
                 ok: registerStatus === 200,
                 status: registerStatus,
                 json: async () => ({ message: 'Registered/Updated' }),
             } as Response);
         }
         return Promise.resolve({ ok: false, status: 404, json: async () => ({ message: 'Not Found' }) } as Response);
     });
};

// Helper function to render Navbar within MemoryRouter, optionally at a specific route
const renderNavbar = (initialRoute = '/') => {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
                <Route path="*" element={<Navbar />} />
            </Routes>
        </MemoryRouter>
    );
};


// --- Test Suite ---
describe('Navbar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionStorage.clear();
        mockedFetch.mockClear();
        // Reset window.location properties if needed between tests
        Object.defineProperty(window, 'location', {
            writable: true,
            value: {
                ...window.location, // Use the potentially modified value from beforeAll
                href: 'http://localhost:3000/',
                pathname: '/', // Default to home for most tests
                assign: vi.fn(),
                reload: vi.fn(),
                origin: window.location.origin // Preserve origin
            },
        });
        setDefaultAuth0Mock(); // Set default (logged out) state
        setupFetchMocks(); // Set default fetch mocks
        // Reset mocks used in specific tests
        vi.mocked(document.getElementById).mockClear();
        vi.mocked(window.HTMLElement.prototype.scrollIntoView).mockClear();
    });

    // --- Test Cases ---

    test('renders standard links and guest icons correctly when logged out', () => {
        renderNavbar(); // Render at default '/'
        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: '🛒' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: '📋' })).not.toBeInTheDocument();
    });

    test('renders standard links and authenticated icons correctly when logged in', async () => {
        setDefaultAuth0Mock({ isAuthenticated: true, isLoading: false, user: { name: 'Test User' } });
        setupFetchMocks({ role: 'user' });
        renderNavbar(); // Render at default '/'

        await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '🛒' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '📋' })).toBeInTheDocument();
    });

    test('renders loading state initially', () => {
        setDefaultAuth0Mock({ isLoading: true });
        renderNavbar();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/hi,/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: '🛒' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: '📋' })).not.toBeInTheDocument();
    });

    test('renders "Sign in" button when logged out', () => {
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: false });
        renderNavbar();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/hi,/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: '🛒' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: '📋' })).not.toBeInTheDocument();
    });

    test('calls loginWithRedirect when "Sign in" is clicked', () => {
        const loginMock = vi.fn();
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: false, loginWithRedirect: loginMock });
        renderNavbar();
        const signInButton = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(signInButton);
        expect(loginMock).toHaveBeenCalledTimes(1);
    });

    test('renders user greeting, "Sign out", and "Become a Seller" when logged in as regular user', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'user' });
        renderNavbar();

        await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByText(/hi, Test/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /become a seller/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: '🛒' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '📋' })).toBeInTheDocument();

        await waitFor(() => {
            expect(mockUseAuth0().getAccessTokenSilently).toHaveBeenCalled();
            expect(mockSessionStorage.setItem).toHaveBeenCalledWith('access_token', 'mock-access-token');
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/register'), expect.any(Object));
        });
    });

     test('renders "My Store" link when logged in as seller', async () => {
        const mockUser = { name: 'Seller User', given_name: 'Seller' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'seller' });
        renderNavbar();

         await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByText(/hi, Seller/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /my store/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: '🛒' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '📋' })).toBeInTheDocument();
    });

     test('renders "Admin Dashboard" link when logged in as admin', async () => {
        const mockUser = { name: 'Admin User', given_name: 'Admin' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'admin' });
        renderNavbar();

         await waitFor(() => {
             expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByText(/hi, Admin/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /become a seller/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: '🛒' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '📋' })).toBeInTheDocument();
    });


    test('calls logout when "Sign out" is clicked', async () => {
        const logoutMock = vi.fn();
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser, logout: logoutMock });
        setupFetchMocks({ role: 'user' });
        renderNavbar();

        const signOutButton = await screen.findByRole('button', { name: /sign out/i });
        fireEvent.click(signOutButton);

        expect(logoutMock).toHaveBeenCalledTimes(1);
        expect(logoutMock).toHaveBeenCalledWith({
            logoutParams: { returnTo: window.location.origin }
        });
    });

    test('handles role fetch failure gracefully', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks(null, 500); // Mock role fetch failure
        renderNavbar();

        await waitFor(() => {
            expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
        });

        expect(screen.getByText(/hi, Test/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '🛒' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '📋' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /become a seller/i })).toBeInTheDocument(); // Should still render if role is null
        expect(screen.queryByRole('link', { name: /my store/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /admin dashboard/i })).not.toBeInTheDocument();
    });

     test('redirects when "Become a Seller" is clicked', async () => {
        const mockUser = { name: 'Test User', given_name: 'Test' };
        setDefaultAuth0Mock({ isLoading: false, isAuthenticated: true, user: mockUser });
        setupFetchMocks({ role: 'user' });
        renderNavbar();

        const becomeSellerLink = await screen.findByRole('link', { name: /become a seller/i });
        expect(becomeSellerLink).toHaveAttribute('href', '/create-store');
    });

    test('reloads page when Cart icon is clicked', async () => {
        setDefaultAuth0Mock({ isAuthenticated: true, isLoading: false, user: { name: 'Test' } });
        setupFetchMocks({ role: 'user' });
        renderNavbar();

        const cartLink = await screen.findByRole('link', { name: '🛒' });
        fireEvent.click(cartLink);

        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    // --- New Test Cases ---

    test('"About Us" link scrolls into view when on home page', () => {
        // Ensure we are on the home page ('/')
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { ...window.location, pathname: '/' }
        });

        // Mock getElementById to return a mock element
        const mockElement = { scrollIntoView: vi.fn() };
        vi.mocked(document.getElementById).mockReturnValue(mockElement as any);

        renderNavbar(); // Render at '/'

        const aboutUsLink = screen.getByRole('link', { name: /about us/i });
        fireEvent.click(aboutUsLink);

        // Verify getElementById and scrollIntoView were called
        expect(document.getElementById).toHaveBeenCalledWith('about-us');
        expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    test('"About Us" link navigates normally when not on home page', () => {
        // Set current path to something other than '/'
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { ...window.location, pathname: '/products' }
        });

        renderNavbar('/products'); // Render at '/products'

        const aboutUsLink = screen.getByRole('link', { name: /about us/i });
        fireEvent.click(aboutUsLink); // Normal Link behavior should occur

        // Verify scrollIntoView was NOT called
        expect(document.getElementById).not.toHaveBeenCalled();
        expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
        // Check that the link still points to the correct hash location
        expect(aboutUsLink).toHaveAttribute('href', '/#about-us');
    });

    test('does not call token/fetch APIs when not authenticated', () => {
        setDefaultAuth0Mock({ isAuthenticated: false, isLoading: false }); // Ensure logged out and not loading
        renderNavbar();

        // Verify these functions were NOT called
        expect(mockUseAuth0().getAccessTokenSilently).not.toHaveBeenCalled();
        expect(mockedFetch).not.toHaveBeenCalledWith(expect.stringContaining('/auth/register'), expect.any(Object));
        expect(mockedFetch).not.toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
    });

    test('clears session storage when not authenticated on load', () => {
        // Pre-populate mock session storage to simulate a leftover token
        mockSessionStorage.setItem('access_token', 'old-stale-token');

        setDefaultAuth0Mock({ isAuthenticated: false, isLoading: false }); // Logged out, not loading
        renderNavbar();

        // Verify removeItem was called for the access token
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('access_token');
        expect(mockSessionStorage.getItem('access_token')).toBeNull(); // Ensure it's actually gone
    });

    test('clears session storage on logout', async () => {
        // Start logged in
        const logoutMock = vi.fn();
        setDefaultAuth0Mock({ isAuthenticated: true, isLoading: false, user: { name: 'Test' }, logout: logoutMock });
        setupFetchMocks({ role: 'user' });
        mockSessionStorage.setItem('access_token', 'active-token'); // Set a token

        const { rerender } = renderNavbar();

        // Wait for initial auth checks
        await waitFor(() => {
            expect(mockSessionStorage.getItem('access_token')).toBe('active-token');
        });

        // Simulate logout action (e.g., clicking the button)
        const signOutButton = await screen.findByRole('button', { name: /sign out/i });
        fireEvent.click(signOutButton);
        expect(logoutMock).toHaveBeenCalled(); // Verify logout was called

        // --- Simulate Auth0 state change after logout ---
        setDefaultAuth0Mock({ isAuthenticated: false, isLoading: false, user: null }); // Now logged out
        // Rerender with the new state
        rerender(
             <MemoryRouter>
                <Routes>
                    <Route path="*" element={<Navbar />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for the effect hook to run with the new state
        await waitFor(() => {
            // Verify removeItem was called after the state update
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('access_token');
        });
         expect(mockSessionStorage.getItem('access_token')).toBeNull(); // Ensure it's actually gone
    });


});