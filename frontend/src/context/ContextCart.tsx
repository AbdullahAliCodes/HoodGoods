import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// --- INTERFACE CHANGES ---
interface CartItemUI {
  cartID?: number;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  storeId: string;   // <<< CHANGE HERE (Made required, type string)
  storeName: string;
  imageUrl?: string;
  availableQuantity?: number;
}

export interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  storeId: string;   // <<< CHANGE HERE (Made required, type string)
  storeName: string;
  imageUrl?: string;
}
// --- END INTERFACE CHANGES ---


interface CartContextType {
  cartItems: CartItemUI[];
  addToCart: (item: AddToCartItem) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  cartLoaded: boolean;
  fetchCart: () => Promise<void>;
  cartError?: string; // Optional error state
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const [cartItems, setCartItems] = useState<CartItemUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cartError, setCartError] = useState<string | undefined>(undefined); // Added error state

  const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  });

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || isAuthLoading || !user) {
      if (!isAuthLoading) {
        setIsLoading(false);
        setCartLoaded(true);
      }
      return;
    }

    setIsLoading(true);
    setCartError(undefined); // Clear previous errors
    try {
      const token = await getAccessTokenSilently();
      const response = await api.get('/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Log raw response for debugging
      // console.log('Raw response.data received from API:', JSON.stringify(response.data, null, 2));

      // ***** START CHANGE HERE *****
      const fetchedItems: CartItemUI[] = response.data.map((item: any) => {
         // Basic validation
         if (typeof item.storeId === 'undefined' || item.storeId === null) {
            console.warn(`Cart item for product ${item.productId} received without a storeId.`);
            // Decide how to handle this - skip item? Assign default? Throw error?
            // For now, let's assign a placeholder, but ideally fix the backend data source.
            // return null; // Option: skip item (requires filtering later)
         }
         if (typeof item.storeName === 'undefined' || item.storeName === null) {
             console.warn(`Cart item for product ${item.productId} received without a storeName.`);
         }

         return {
            cartID: item.cartID,
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            availableQuantity: item.availableQuantity,
            storeName: item.storeName || 'Unknown Store', // Provide default if missing
            storeId: String(item.storeId ?? 'unknown'), // <<< ADDED storeId, ensure it's a string, provide default
         };
      });
      // Filter out any potentially skipped items if you returned null above
      // const validItems = fetchedItems.filter(item => item !== null);
      // setCartItems(validItems);

      // ***** END CHANGE HERE *****

      setCartItems(fetchedItems); // Or use validItems if filtering

    } catch (error: any) {
      console.error('Failed to fetch cart:', error);
      const message = error.response?.data?.message || error.message || "Failed to fetch cart items.";
      setCartError(message); // Set error state
      setCartItems([]); // Safe fallback
    } finally {
      setIsLoading(false);
      setCartLoaded(true);
    }
  }, [isAuthenticated, isAuthLoading, user, getAccessTokenSilently]);

  // syncCart might need updating later to include storeId/storeName if required by backend
  const syncCart = useCallback(async (currentCartItems: CartItemUI[]) => {
    if (!isAuthenticated || isAuthLoading || !user || isSyncing || isLoading) return;

    setIsSyncing(true);
    setCartError(undefined); // Clear previous errors
    try {
      const token = await getAccessTokenSilently();
      const payload = {
        items: currentCartItems.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity)
          // Add storeId/storeName here if backend /cart/sync endpoint needs them
        }))
      };
      await api.post('/cart/sync', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error: any) {
      console.error('Failed to sync cart:', error);
      const message = error.response?.data?.message || error.message || "Failed to sync cart with server.";
      setCartError(message); // Set error state
      // Decide if you want to revert local cart state on sync failure
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, isAuthLoading, user, getAccessTokenSilently, isSyncing, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && user) {
      fetchCart();
    } else if (!isAuthenticated && !isAuthLoading) {
      setCartItems([]);
      setIsLoading(false);
      setCartLoaded(true);
    }
  }, [isAuthenticated, isAuthLoading, user, fetchCart]);

  // Debounced sync effect
  useEffect(() => {
    if (isLoading || !isAuthenticated || isAuthLoading || !user || !cartLoaded || isSyncing) return;

    const timer = setTimeout(() => {
       syncCart(cartItems);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cartItems, isLoading, isAuthenticated, isAuthLoading, user, cartLoaded, syncCart, isSyncing]);

  // addToCart needs to ensure storeId and storeName are included
  const addToCart = async (itemToAdd: AddToCartItem) => {
    if (!isAuthenticated) {
        setCartError("Please log in to add items to your cart.");
        return;
    }
    setCartError(undefined); // Clear previous errors

    setCartItems(prev => {
      const existingItem = prev.find(i => i.productId === itemToAdd.productId);
      if (existingItem) {
        return prev.map(i =>
          i.productId === itemToAdd.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      } else {
        // Ensure all required fields are present
        return [...prev, {
            ...itemToAdd, // Includes productId, productName, productPrice, storeName, storeId
            quantity: 1,
            cartID: undefined // cartID comes from backend
        }];
      }
    });
  };

  const removeFromCart = async (productId: number) => {
    setCartError(undefined); // Clear previous errors
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    setCartError(undefined); // Clear previous errors
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = async () => {
    setCartError(undefined); // Clear previous errors
    setCartItems([]);
    // Optionally call backend clear endpoint immediately
    /*
    if (isAuthenticated && user) {
        try {
            const token = await getAccessTokenSilently();
            await api.delete('/cart/clear', { headers: { Authorization: `Bearer ${token}` }});
        } catch (error) { console.error("Failed to clear cart on backend:", error); }
    }
    */
  };

  const totalItems = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (Number(item.productPrice || 0) * Number(item.quantity || 0)), 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isLoading,
      cartLoaded,
      fetchCart,
      cartError // Expose cartError
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
