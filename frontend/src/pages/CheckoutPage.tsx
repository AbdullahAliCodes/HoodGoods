import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CheckoutPage.css'; // Ensure CSS is linked
import { useCart } from '../context/ContextCart'; // Assuming path is correct
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';

// --- Interfaces ---
type CartItemDisplay = {
  id: string; // Likely mapped from productId
  productId: number;
  name: string;
  productName: string; // Included as it's used in groupedItemsByStoreId mapping
  price: number;
  productPrice: number; // Included as it's used in calculations
  quantity: number;
  storeName: string;
  storeId: string;
};

interface StoreDeliveryDetails {
    storeId: string;
    standardPrice: number;
    standardTime: string;
    expressPrice: number;
    expressTime: string;
    storeName?: string; // Optional: Can be derived from cart items if needed
}

// Type for the response from the /stores/delivery-options endpoint
type DeliveryOptionsResponse = Record<string, StoreDeliveryDetails>;

// Type declaration for YocoSDK assuming it's loaded globally
declare const YocoSDK: any;

interface InitiatePaymentResponse {
  checkoutId: string;
}
// --- End Interfaces ---

// --- Pickup Locations Data Structure ---
const pickupLocationsData: Record<string, string[]> = {
    "Area1": ["Area 1 - Pickup Point Alpha", "Area 1 - Pickup Point Beta"],
    "Area2": ["Area 2 - Pickup Point Gamma", "Area 2 - Pickup Point Delta", "Area 2 - Pickup Point Epsilon"],
    "Area3": ["Area 3 - Pickup Point Zeta", "Area 3 - Pickup Point Eta", "Area 3 - Pickup Point Theta"]
};
// --- End Pickup Locations Data ---

// Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

export default function CheckoutPage() {
  // --- Hooks ---
  const { cartItems, clearCart, cartError: contextCartError } = useCart();
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const navigate = useNavigate();

  // --- State ---
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedPickupPoint, setSelectedPickupPoint] = useState('');
  const [deliverySelectionState, setDeliverySelectionState] = useState<Record<string, 'standard' | 'express'>>({});
  const [storeDeliveryOptions, setStoreDeliveryOptions] = useState<DeliveryOptionsResponse>({});
  const [isLoadingDeliveryOptions, setIsLoadingDeliveryOptions] = useState(false);
  const [deliveryOptionsError, setDeliveryOptionsError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // --- Refs ---
  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const yocoInstanceRef = useRef<any>(null);

  // --- Data Processing & Memos ---
  const uniqueStoreIds = useMemo(() =>
    [...new Set(cartItems.map(item => item.storeId).filter(id => id && id !== 'unknown'))]
  , [cartItems]);

  const groupedItemsByStoreId = useMemo(() =>
    cartItems.reduce((groups, item) => {
      const key = item.storeId;
      if (!key || key === 'unknown') return groups;
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        id: item.productId.toString(),
        productId: item.productId,
        name: item.productName,
        productName: item.productName,
        price: item.productPrice,
        productPrice: item.productPrice,
        quantity: item.quantity,
        storeName: item.storeName || 'Unknown Store',
        storeId: key
      });
      return groups;
    }, {} as Record<string, CartItemDisplay[]>)
  , [cartItems]);

  // --- Effects ---
  // Effect for fetching delivery options
  useEffect(() => {
    if (!isAuthenticated || uniqueStoreIds.length === 0) {
      setStoreDeliveryOptions({}); setDeliverySelectionState({}); return;
    }
    const fetchOptions = async () => { /* ... (fetch logic unchanged) ... */
        setIsLoadingDeliveryOptions(true); setDeliveryOptionsError(null);
        try {
            const token = await getAccessTokenSilently();
            const response = await api.post<DeliveryOptionsResponse>('/stores/delivery-options', { storeIds: uniqueStoreIds }, { headers: { Authorization: `Bearer ${token}` } });
            const fetchedOptions = response.data || {};
            setStoreDeliveryOptions(fetchedOptions);
            setDeliverySelectionState(prev => {
                const newState: Record<string, 'standard' | 'express'> = {};
                uniqueStoreIds.forEach(id => { if (fetchedOptions[id]) { newState[id] = prev[id] || 'standard'; } });
                Object.keys(prev).forEach(id => { if (uniqueStoreIds.includes(id) && fetchedOptions[id] && !newState[id]) { newState[id] = prev[id]; } });
                return newState;
            });
        } catch (error) {
            console.error("Failed to fetch delivery options:", error);
            const msg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not load delivery options.';
            setDeliveryOptionsError(msg); setStoreDeliveryOptions({}); setDeliverySelectionState({});
        } finally { setIsLoadingDeliveryOptions(false); }
    }; fetchOptions();
  }, [uniqueStoreIds, isAuthenticated, getAccessTokenSilently]);

  // Effect for Timeout/Yoco Cleanup on Unmount
  useEffect(() => { /* ... (unmount cleanup unchanged) ... */
    return () => {
        if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); }
        try { if (yocoInstanceRef.current?.closePopup) { yocoInstanceRef.current.closePopup(); } } catch (e) { console.error("Error closing Yoco on unmount:", e); }
    };
  }, []);

  // --- Calculation Functions ---
  const calculateStoreSubtotal = (items: CartItemDisplay[]): number => items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculateTotalDelivery = (): number => Object.keys(deliverySelectionState).reduce((sum, storeId) => { const opt = deliverySelectionState[storeId]; const details = storeDeliveryOptions[storeId]; if (!opt || !details) return sum; const price = opt === 'standard' ? details.standardPrice : details.expressPrice; return sum + (Number(price) || 0); }, 0);
  const grandTotal = useMemo(() => { const itemsSub = cartItems?.reduce((s, i) => s + (i.productPrice * i.quantity), 0) ?? 0; const delTotal = calculateTotalDelivery(); return itemsSub + delTotal; }, [cartItems, deliverySelectionState, storeDeliveryOptions]);

  // --- Event Handlers ---
  const handleDeliveryOptionChange = (storeId: string, selection: string) => { if (selection === 'standard' || selection === 'express') { setDeliverySelectionState(prev => ({ ...prev, [storeId]: selection })); } };
  const handleAreaChange = (event: React.ChangeEvent<HTMLSelectElement>) => { const newArea = event.target.value; setSelectedArea(newArea); setSelectedPickupPoint(''); };

  // --- handlePayment function ---
  const handlePayment = async () => {
    // --- Step 1: Frontend Validation ---
    if (!isAuthenticated || !user || cartItems.length === 0) { setPaymentError("Please log in and ensure your cart is not empty."); return; }
    if (!selectedArea || !selectedPickupPoint) { setPaymentError("Please select a pickup area and point."); return; }
    if (uniqueStoreIds.some(id => !deliverySelectionState[id])) { setPaymentError("Please select a delivery option for all stores."); return; }
    if (grandTotal <= 0) { setPaymentError("Cannot process payment with zero or negative total."); return; }
    // --- End Frontend Validation ---

    setIsProcessingPayment(true);
    setPaymentError(null);

    if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); paymentTimeoutRef.current = null; }
    yocoInstanceRef.current = null;

    // --- Function to perform cleanup ---
    const performCleanup = () => {
        console.log(">>> Performing payment cleanup function...");
        // Check current state *before* setting it, for logging purposes
        const wasProcessing = isProcessingPayment;
        console.log(`Cleanup called. isProcessingPayment was: ${wasProcessing}`);

        setIsProcessingPayment(false); // <<< Force reset state

        // Attempt SDK close
        try { if (yocoInstanceRef.current?.closePopup) { console.log("Cleanup: Attempting SDK closePopup..."); yocoInstanceRef.current.closePopup(); } }
        catch (closeError) { console.error("Cleanup: Error closing via SDK:", closeError); }

        // Fallback: Force remove the popup element
        const popupSelector = '.yc-auto-shown-popup'; // <<< VERIFY THIS SELECTOR
        try {
            // Use timeout 0 to queue this after current execution context
            setTimeout(() => {
                const yocoPopupElement = document.querySelector(popupSelector);
                if (yocoPopupElement) {
                    console.log(`Cleanup: Found popup element (${popupSelector}). Removing it.`);
                    yocoPopupElement.remove();
                } else {
                    console.warn(`Cleanup: Could not find popup element (${popupSelector}) to remove manually.`);
                }
            }, 0);
        } catch (removeError) { console.error("Cleanup: Error removing element manually:", removeError); }

        // Clear timeout ref
        if (paymentTimeoutRef.current) {
            console.log("Cleanup: Clearing payment timeout ref.");
            clearTimeout(paymentTimeoutRef.current);
            paymentTimeoutRef.current = null;
        }
        console.log(">>> Cleanup function finished.");
    };


    try {
        // --- Step 2: Initiate Yoco Payment ---
        const token = await getAccessTokenSilently();
        console.log("Initiating payment...");
        const response = await api.post<InitiatePaymentResponse>('/payments/initiate-yoco', { amount: Math.round(grandTotal * 100), currency: 'ZAR' }, { headers: { Authorization: `Bearer ${token}` } });
        const { checkoutId } = response.data;
        if (!checkoutId) throw new Error("Missing checkoutId from backend.");
        console.log("Received checkoutId:", checkoutId);
        // --- End Initiation ---

        // --- Step 3: Show Yoco Popup ---
        const yoco = new YocoSDK({ publicKey: 'pk_test_ed3c54a6gOol69qa7f45' }); // !!! Replace with your ACTUAL key !!!
        yocoInstanceRef.current = yoco;

        console.log("Showing Yoco popup...");
        yoco.showPopup({
            checkoutId: checkoutId, amountInCents: Math.round(grandTotal * 100), currency: 'ZAR',
            // --- Yoco Callback ---
            callback: async (result: any) => {
                console.log("--- Yoco SDK Callback START ---");
                console.log("Raw Yoco Result:", result);

                let outcomeError: string | null = null;
                let shouldClearCartAndNavigate = false;
                let callbackStatus = "unknown";

                try { // Status checking logic... (remains the same)
                    if (result.error) { callbackStatus = "error"; /*...*/ outcomeError = `Payment failed: ${result.error.message || 'Unknown error'}`; }
                    else if (result.status === 'successful' || result.status === 'pending' || result.status === 'charge_ready') { callbackStatus = `success_or_pending (${result.status})`; /*...*/
                        const yocoChargeId = result.id || result.chargeId || result.paymentId || 'yoco_id_not_found';
                        const backendCartItems = cartItems.map(item => ({ productId: item.productId, quantity: item.quantity, pricePerUnitSnapshot: item.productPrice, storeId: item.storeId.toString() }));
                        const orderPayload = { cartItems: backendCartItems, deliverySelections: deliverySelectionState, selectedArea, selectedPickupPoint, yocoChargeId, frontendGrandTotal: grandTotal };
                        try { const backendToken = await getAccessTokenSilently(); await api.post('/orders/create', orderPayload, { headers: { Authorization: `Bearer ${backendToken}` } }); shouldClearCartAndNavigate = true; }
                        catch (backendError) { /*...*/ outcomeError = "Order Placement Failed..."; shouldClearCartAndNavigate = false; }
                    }
                    else if (result.status === 'failed') { callbackStatus = "failed"; /*...*/ outcomeError = "Payment failed."; }
                    else if (result.status === 'cancelled') { callbackStatus = "cancelled"; /*...*/ outcomeError = "Payment was cancelled."; }
                    else { callbackStatus = `other (${result.status})`; /*...*/ outcomeError = `Unexpected status: ${result.status}.`; }

                    console.log(`Callback status: ${callbackStatus}. OutcomeError: ${outcomeError}`);
                    if (outcomeError) { setPaymentError(outcomeError); }

                } catch (callbackLogicError) { console.error("Error inside Yoco callback try block:", callbackLogicError); setPaymentError("Unexpected error after payment."); shouldClearCartAndNavigate = false; }
                finally {
                    console.log(`Callback finally block executing. Status was: ${callbackStatus}`);
                    performCleanup(); // <<< Cleanup runs here
                    console.log("--- Yoco SDK Callback END ---");
                }

                // --- Navigation ---
                if (shouldClearCartAndNavigate) {
                    try { await clearCart(); navigate('/order-confirmation'); }
                    catch (clearError) { console.error("Failed to clear cart:", clearError); setPaymentError("Order placed, but failed to clear cart."); navigate('/order-confirmation'); }
                }
            } // <<< Callback ends here
        }); // end showPopup

        // --- Step 5: Set Timeout Fallback ---
        console.log("Setting payment timeout fallback (45s).");
        paymentTimeoutRef.current = setTimeout(() => {
            console.warn("--- Payment Timeout Reached ---");
            // Capture state for logging, but always call cleanup
            const stillProcessing = isProcessingPayment;
            console.log(`Timeout check: isProcessingPayment was ${stillProcessing}`);

            // *** MODIFICATION START ***
            // Always perform cleanup if timeout is reached, regardless of the captured state.
            // This ensures the UI is reset even if there was a state/render timing issue.
            console.warn("Timeout reached. Forcing cleanup.");
            setPaymentError("Payment process timed out or did not complete correctly. Please try again."); // Set appropriate error
            performCleanup();
            // *** MODIFICATION END ***

            paymentTimeoutRef.current = null; // Ensure ref is cleared
        }, 27000); // 45 seconds
        // --- End Timeout Fallback ---

    } catch (error) { // Catch initiation errors
        console.error("Failed to initiate payment:", error);
        const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Payment initiation failed';
        setPaymentError(errorMsg);
        setIsProcessingPayment(false); // Reset button state on initiation fail
        if (paymentTimeoutRef.current) { clearTimeout(paymentTimeoutRef.current); paymentTimeoutRef.current = null; }
    }
  }; // --- END handlePayment ---

  // --- Render Logic ---
  if (isAuthLoading) return <p>Loading authentication...</p>;
  if (!isAuthenticated) return ( <main className="checkout-container"><h1>Checkout</h1><p>Please log in to proceed with checkout.</p></main> );
  if (cartItems === null) return <p>Loading cart...</p>;
  if (cartItems.length > 0 && isLoadingDeliveryOptions) { return <p>Loading checkout details...</p>; }
  if (cartItems.length === 0) return ( <main className="checkout-container"><h1>Checkout</h1><p>Your cart is empty.</p><Link to="/products" className="back-link">Continue Shopping</Link></main> );

  const displayGrandTotal = typeof grandTotal === 'number' && !isNaN(grandTotal) ? grandTotal : 0;
  const isCheckoutReady = !isProcessingPayment && !isLoadingDeliveryOptions && !deliveryOptionsError && selectedArea && selectedPickupPoint && uniqueStoreIds.length > 0 && !uniqueStoreIds.some(id => !deliverySelectionState[id]) && displayGrandTotal > 0;

  // --- JSX Rendering ---
  return (
    <main className="checkout-container">
      <header>
        <h1>Checkout</h1>
        <p className="instructions">Please select your pickup location, review delivery options, and complete your order.</p>
        {contextCartError && <p className="error-message cart-error">Cart Notice: {contextCartError}</p>}
        {deliveryOptionsError && <p className="error-message delivery-error">Delivery Error: {deliveryOptionsError}</p>}
        {paymentError && <p className="error-message payment-error">Payment Error: {paymentError}</p>}
      </header>

      <div className="checkout-layout"> {/* Wrapper for layout */}

        {/* Pickup Location Section */}
        <section className="form-section pickup-location-section" aria-labelledby="pickup-location-heading">
            <h2 id="pickup-location-heading">1. Pickup Location</h2>
            <p className="form-field">
                <label htmlFor="delivery-area">Select Area:</label>
                <select id="delivery-area" className="form-input" value={selectedArea} onChange={handleAreaChange} required>
                    <option value="" disabled>Select an area...</option>
                    {Object.keys(pickupLocationsData).map(area => (<option key={area} value={area}>{area}</option>))}
                </select>
            </p>
            <p className="form-field">
                <label htmlFor="pickup-point">Select Pickup Point:</label>
                <select id="pickup-point" className="form-input" value={selectedPickupPoint} onChange={(e) => setSelectedPickupPoint(e.target.value)} required disabled={!selectedArea}>
                    <option value="" disabled>Select a pickup point...</option>
                    {selectedArea && pickupLocationsData[selectedArea]?.map(point => (<option key={point} value={point}>{point}</option>))}
                </select>
                {!selectedArea && <small className="field-hint">Please select an area first.</small>}
            </p>
           </section>

        {/* Order Summary Section */}
        <section className="form-section order-summary-section" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">2. Order Summary & Delivery</h2>
          {uniqueStoreIds.map(storeId => {
            const items = groupedItemsByStoreId[storeId];
            const deliveryDetails = storeDeliveryOptions[storeId];
            const currentSelection = deliverySelectionState[storeId];
            if (!items || items.length === 0) return null;
            const storeName = items[0]?.storeName || `Store ID: ${storeId}`;
            return (
              <article key={storeId} className="store-group" aria-labelledby={`store-heading-${storeId}`}>
                <h3 id={`store-heading-${storeId}`} className="store-name">{storeName}</h3>
                <div className="delivery-option form-field">
                  <label htmlFor={`delivery-${storeId}`}>Delivery Option:</label>
                  {isLoadingDeliveryOptions ? (<span>Loading options...</span>) : !deliveryDetails ? (<span className="error-message">Delivery Unavailable</span>) : (
                    <select id={`delivery-${storeId}`} className="form-input" value={currentSelection || ''} onChange={(e) => handleDeliveryOptionChange(storeId, e.target.value)} required>
                      <option value="standard"> Standard - R{deliveryDetails.standardPrice.toFixed(2)} ({deliveryDetails.standardTime}) </option>
                      <option value="express"> Express - R{deliveryDetails.expressPrice.toFixed(2)} ({deliveryDetails.expressTime}) </option>
                    </select>
                  )}
                </div>
                <ul className="order-items" aria-label={`Items from ${storeName}`}>
                  {items.map(item => ( <li key={`${item.productId}-${storeId}`} className="order-item"> {item.name} - R{item.price.toFixed(2)} &times; {item.quantity} </li> ))}
                </ul>
                <footer className="store-summary">
                  <p>Items Subtotal: R{calculateStoreSubtotal(items).toFixed(2)}</p>
                  {deliveryDetails && currentSelection && (<p>Delivery: R{(currentSelection === 'standard' ? deliveryDetails.standardPrice : deliveryDetails.expressPrice).toFixed(2)}</p>)}
                </footer>
              </article>
            );
          })}
          <footer className="order-totals">
            <p className="grand-total">Grand Total: R{displayGrandTotal.toFixed(2)}</p>
          </footer>
        </section>

        {/* Payment Button Section */}
        <section className="payment-section">
            <h2 style={{marginBottom: '10px'}}>3. Payment</h2>
          <button type="button" onClick={handlePayment} disabled={!isCheckoutReady || isProcessingPayment} className="yoco-pay-button">
            {isProcessingPayment ? 'Processing Payment...' : `Pay R${displayGrandTotal.toFixed(2)} Securely with Yoco`}
          </button>
          {!isCheckoutReady && !isProcessingPayment && !deliveryOptionsError &&
            <p className="field-hint payment-hint"> Please select area, pickup point, and delivery options for all items to proceed. </p>
          }
        </section>

        {/* Actions Menu (e.g., Back to Cart) */}
        <menu className="actions">
          <li><Link to="/cart" className="back-link">&larr; Back to Cart</Link></li>
        </menu>

      </div> {/* End checkout-layout wrapper */}
    </main>
  );
}
