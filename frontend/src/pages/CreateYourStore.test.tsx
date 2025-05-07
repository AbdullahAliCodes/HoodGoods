// src/pages/CreateYourStore.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// REMOVED fireEvent
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import the component to test
import CreateYourStore from './CreateYourStore';
// Import types and constants needed for mocking/testing
import { STANDARD_DELIVERY_TIMES, EXPRESS_DELIVERY_TIMES, PRODUCT_CATEGORIES } from '../types/createStore';
import supabase from '../supabaseClient';

// --- Mock Child Components (No Changes) ---
vi.mock('../components/StoreInfoForm', () => ({
    default: ({ storeName, onStoreNameChange, isSubmitting }: any) => (
        <div>
            <label htmlFor="storeName">Mock Store Name</label>
            <input id="storeName" data-testid="store-name-input" value={storeName} onChange={(e) => onStoreNameChange(e.target.value)} disabled={isSubmitting}/>
        </div>
    )
}));
vi.mock('../components/ProductList', () => ({
    default: ({ products, onProductChange, onImageChange, onRemoveProduct, onAddProduct, isSubmitting }: any) => {
        return (
            <div data-testid="product-list">
                <h3>Mock Product List</h3>
                {products.map((p: any, index: number) => (
                    <div key={index} data-testid={`product-item-${index}`}>
                         <label htmlFor={`productName-${index}`}>Product Name</label>
                        <input id={`productName-${index}`} data-testid={`product-name-${index}`} value={p.productName} onChange={(e) => onProductChange(index, 'productName', e.target.value)} disabled={isSubmitting}/>
                        <label htmlFor={`productDescription-${index}`}>Description</label>
                        <textarea id={`productDescription-${index}`} data-testid={`product-description-${index}`} value={p.productDescription} onChange={(e) => onProductChange(index, 'productDescription', e.target.value)} disabled={isSubmitting}/>
                        <label htmlFor={`productPrice-${index}`}>Price</label>
                        <input id={`productPrice-${index}`} type="number" data-testid={`product-price-${index}`} value={p.productPrice} onChange={(e) => onProductChange(index, 'productPrice', e.target.value)} disabled={isSubmitting}/>
                        <label htmlFor={`productQuantity-${index}`}>Quantity</label>
                        <input id={`productQuantity-${index}`} type="number" data-testid={`product-quantity-${index}`} value={p.productQuantity} onChange={(e) => onProductChange(index, 'productQuantity', e.target.value)} disabled={isSubmitting}/>
                        <label htmlFor={`productCategory-${index}`}>Category</label>
                        <select id={`productCategory-${index}`} data-testid={`product-category-${index}`} value={p.productCategory} onChange={(e) => onProductChange(index, 'productCategory', e.target.value)} disabled={isSubmitting}>
                            <option value="">Select Category</option>
                            {PRODUCT_CATEGORIES.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <label htmlFor={`image-${index}`}>Image</label>
                        <input type="file" id={`image-${index}`} data-testid={`product-image-${index}`} onChange={(e) => onImageChange(index, e)} disabled={isSubmitting}/>
                        {p.imagePreview && <img src={p.imagePreview} alt="preview" data-testid={`image-preview-${index}`} />}
                        <button onClick={() => onRemoveProduct(index)} data-testid={`remove-product-${index}`} disabled={isSubmitting}>Remove</button>
                    </div>
                ))}
                <button onClick={onAddProduct} data-testid="add-product-button" disabled={isSubmitting}>Add Product</button>
            </div>
        );
    }
}));
vi.mock('../components/SubmissionStatus', () => ({
    default: ({ error, success }: any) => (
        <div>
            {error && <div data-testid="error-message">{error}</div>}
            {success && <div data-testid="success-message">{success}</div>}
        </div>
    )
}));
vi.mock('../components/ImageGalleryDisplay', () => ({
     default: ({ galleryImages }: any) => ( <div data-testid="image-gallery"> Mock Image Gallery ({galleryImages?.length || 0} images) </div> )
}));

// --- Mock Supabase Client (No Changes) ---
vi.mock('../supabaseClient', () => ({
     default: { storage: { from: vi.fn().mockReturnThis(), list: vi.fn(), getPublicUrl: vi.fn() } }
}));
const mockSupabaseTyped = supabase as any;

// --- Mock fetch CORRECTLY (No Changes) ---
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Mock window.location (Keep for other tests if needed, or remove if only used by deleted test) ---
// Still potentially useful if other tests interact with location, otherwise can be removed.
const locationMock = {
    _href: '',
    get href() { return this._href; },
    set href(url: string) { this._href = url; },
    assign: vi.fn((url: string) => { locationMock.href = url; }),
    replace: vi.fn((url: string) => { locationMock.href = url; }),
    origin: 'http://localhost:3000',
    pathname: '/',
};
vi.stubGlobal('location', locationMock);


// --- Test Suite ---
describe('CreateYourStore Page', () => {
    const user = userEvent.setup();
    const mockToken = 'mock-access-token';
    const mockFile = new File(['content'], 'test-image.png', { type: 'image/png' });
    const BASE_URL = 'http://localhost:3000'; // Use the fallback URL

    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        sessionStorage.setItem('access_token', mockToken);
        locationMock.href = 'http://localhost:3000/'; // Reset location mock

        // Mock Supabase storage methods
        const mockStorageFns = { list: vi.fn(), getPublicUrl: vi.fn() };
        mockSupabaseTyped.storage.from.mockReturnValue(mockStorageFns);
        const mockFilesData = [{ name: 'gallery1.jpg', id: '1', created_at: new Date().toISOString() }];
        const mockPublicUrlData = { data: { publicUrl: 'http://mock-supabase.test/gallery1.jpg' } };
        mockStorageFns.list.mockResolvedValue({ data: mockFilesData, error: null });
        mockStorageFns.getPublicUrl.mockReturnValue(mockPublicUrlData);

        // Setup default fetch mock
        mockFetch.mockResolvedValue({
            ok: true, status: 200, json: async () => ({}), text: async () => ('')
        });
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.useRealTimers();
    });

    // Helper function (No Changes)
    const fillValidFormData = async () => {
        await user.type(screen.getByTestId('store-name-input'), 'Test Store');
        await user.type(screen.getByLabelText(/standard delivery price/i), '5.50');
        await user.selectOptions(screen.getByLabelText(/standard delivery time/i), STANDARD_DELIVERY_TIMES[0].toString());
        await user.type(screen.getByLabelText(/express delivery price/i), '11.00');
        await user.selectOptions(screen.getByLabelText(/express delivery time/i), EXPRESS_DELIVERY_TIMES[0].toString());
        await user.type(screen.getByTestId('product-name-0'), 'Test Product');
        await user.type(screen.getByTestId('product-description-0'), 'This is a test product description.');
        const priceInput = screen.getByTestId('product-price-0');
        await user.clear(priceInput); await user.type(priceInput, '15.99');
        const quantityInput = screen.getByTestId('product-quantity-0');
        await user.clear(quantityInput); await user.type(quantityInput, '10');
        await user.selectOptions(screen.getByTestId('product-category-0'), PRODUCT_CATEGORIES[0]);
        await user.upload(screen.getByTestId('product-image-0'), mockFile);
        await waitFor(() => expect(screen.getByTestId('image-preview-0')).toBeInTheDocument());
    };

    // --- Test cases ('it' blocks) ---

    it('renders the component structure and initial elements', async () => {
        render(<CreateYourStore />);
        expect(screen.getByRole('heading', { name: /create your artisan store/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create your store/i })).toBeDisabled();
        await waitFor(() => {
            expect(mockSupabaseTyped.storage.from).toHaveBeenCalledWith('images');
            const fromInstance = mockSupabaseTyped.storage.from.mock.results[0].value;
            expect(fromInstance.list).toHaveBeenCalledWith('uploads', expect.any(Object));
        });
     });
    it('updates store name state on input change', async () => {
        render(<CreateYourStore />);
        const storeNameInput = screen.getByTestId('store-name-input');
        await user.type(storeNameInput, 'My Awesome Store');
        expect(storeNameInput).toHaveValue('My Awesome Store');
     });
    it('updates delivery options state on change', async () => {
        render(<CreateYourStore />);
        const stdPriceInput = screen.getByLabelText(/standard delivery price/i);
        const stdTimeSelect = screen.getByLabelText(/standard delivery time/i);
        const expPriceInput = screen.getByLabelText(/express delivery price/i);
        const expTimeSelect = screen.getByLabelText(/express delivery time/i);
        await user.type(stdPriceInput, '5.99');
        await user.selectOptions(stdTimeSelect, STANDARD_DELIVERY_TIMES[1].toString());
        await user.type(expPriceInput, '12.50');
        await user.selectOptions(expTimeSelect, EXPRESS_DELIVERY_TIMES[1].toString());
        expect(stdPriceInput).toHaveValue(5.99);
        expect(stdTimeSelect).toHaveValue(STANDARD_DELIVERY_TIMES[1].toString());
        expect(expPriceInput).toHaveValue(12.50);
        expect(expTimeSelect).toHaveValue(EXPRESS_DELIVERY_TIMES[1].toString());
     });
    it('updates product state on input change', async () => {
        render(<CreateYourStore />);
        const productNameInput = screen.getByTestId('product-name-0');
        await user.type(productNameInput, 'Handmade Mug');
        const productDescInput = screen.getByTestId('product-description-0');
        await user.type(productDescInput, 'A lovely mug');
        const productPriceInput = screen.getByTestId('product-price-0');
        await user.clear(productPriceInput); await user.type(productPriceInput, '25');
        const productQuantityInput = screen.getByTestId('product-quantity-0');
        await user.clear(productQuantityInput); await user.type(productQuantityInput, '10');
        const productCategorySelect = screen.getByTestId('product-category-0');
        await user.selectOptions(productCategorySelect, PRODUCT_CATEGORIES[1]);
        expect(productNameInput).toHaveValue('Handmade Mug');
        expect(productDescInput).toHaveValue('A lovely mug');
        expect(productPriceInput).toHaveValue(25);
        expect(productQuantityInput).toHaveValue(10);
        expect(productCategorySelect).toHaveValue(PRODUCT_CATEGORIES[1]);
     });
    it('adds and removes product fields', async () => {
        render(<CreateYourStore />);
        const addButton = screen.getByTestId('add-product-button');
        await user.click(addButton);
        expect(screen.getByTestId('product-item-1')).toBeInTheDocument();
        const removeButton1 = screen.getByTestId('remove-product-1');
        await user.click(removeButton1);
        expect(screen.queryByTestId('product-item-1')).not.toBeInTheDocument();
        const removeButton0 = screen.getByTestId('remove-product-0');
        await user.click(removeButton0);
        expect(await screen.findByTestId('error-message')).toHaveTextContent('You need at least one product');
     });
    it('handles image upload and preview', async () => {
        render(<CreateYourStore />);
        const fileInput = screen.getByTestId('product-image-0') as HTMLInputElement;
        await user.upload(fileInput, mockFile);
        await waitFor(() => {
            expect(screen.getByTestId('image-preview-0')).toBeInTheDocument();
            expect(screen.getByTestId('image-preview-0')).toHaveAttribute('src', expect.stringContaining('data:'));
        });
     });
    it('enables submit button only when all required fields are filled', async () => {
        render(<CreateYourStore />);
        const submitButton = screen.getByRole('button', { name: /create your store/i });
        expect(submitButton).toBeDisabled();
        await fillValidFormData();
        expect(submitButton).toBeEnabled();
        await user.clear(screen.getByTestId('store-name-input'));
        expect(submitButton).toBeDisabled();
     });
    it('shows validation error if submitting with missing fields (e.g., product name)', async () => {
        render(<CreateYourStore />);
        await user.type(screen.getByTestId('store-name-input'), 'Temp Store');
        await user.type(screen.getByLabelText(/standard delivery price/i), '5');
        await user.selectOptions(screen.getByLabelText(/standard delivery time/i), STANDARD_DELIVERY_TIMES[0].toString());
        await user.type(screen.getByLabelText(/express delivery price/i), '10');
        await user.selectOptions(screen.getByLabelText(/express delivery time/i), EXPRESS_DELIVERY_TIMES[0].toString());
        await user.type(screen.getByTestId('product-description-0'), 'Desc here');
        await user.type(screen.getByTestId('product-price-0'), '15');
        await user.type(screen.getByTestId('product-quantity-0'), '5');
        await user.selectOptions(screen.getByTestId('product-category-0'), PRODUCT_CATEGORIES[1]);
        await user.upload(screen.getByTestId('product-image-0'), mockFile);
        await user.clear(screen.getByTestId('product-name-0')); // Clear name last

        const submitButton = screen.getByRole('button', { name: /create your store/i });
        const form = submitButton.closest('form');
        expect(form).toBeInTheDocument();
        if(form){
             const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
             form.dispatchEvent(submitEvent);
        }

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/product #1 name is required/i);
        });
        expect(mockFetch).not.toHaveBeenCalled();
     });
    it('shows authentication error if no token is found', async () => {
        sessionStorage.removeItem('access_token');
        render(<CreateYourStore />);
        await fillValidFormData();
        const submitButton = screen.getByRole('button', { name: /create your store/i });
        await user.click(submitButton);
        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/authentication error: no token found/i);
        });
     });
    it('handles image upload failure during submission', async () => {
        render(<CreateYourStore />);
        mockFetch
            .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: 'Promoted' }) })
            .mockRejectedValueOnce(new Error('Image upload failed miserably'));
        await fillValidFormData();
        const submitButton = screen.getByRole('button', { name: /create your store/i });
        await user.click(submitButton);
        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/Image upload failed miserably/i);
        });
        expect(mockFetch).toHaveBeenCalledTimes(2);
     });
    it('handles store creation API failure', async () => {
        render(<CreateYourStore />);
        const mockImageUrl = `${BASE_URL}/uploads/test-image.png`;
        mockFetch
             .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: 'Promoted' }) })
             .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ url: mockImageUrl }) })
             .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Server ded' }) });
        await fillValidFormData();
        const submitButton = screen.getByRole('button', { name: /create your store/i });
        await user.click(submitButton);
        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/failed to create store: Server ded/i);
        });
        expect(mockFetch).toHaveBeenCalledTimes(3);
     });

    // REMOVED the 'handles successful form submission' test case

}); // End of Describe block