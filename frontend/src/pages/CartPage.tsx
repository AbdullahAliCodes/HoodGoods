import React, { useEffect, useState } from 'react';
import { useCart } from '../context/ContextCart'; // Assuming path is correct
import { Link } from 'react-router-dom';
import './CartPage.css'; // Assuming path is correct

interface CartItemDisplay {
  productId: number;
  imageUrl?: string | undefined;
  productName: string;
  productPrice: number;
  quantity: number;
  availableQuantity?: number;
}

const CartPage: React.FC = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
    isLoading
  } = useCart();

  // NEW: Local loading state
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingLocal(false);
    }, 200); // Wait minimum 200ms

    return () => clearTimeout(timer); // Clean up timer
  }, []);

  // Updated loading logic
  if (isLoading || isLoadingLocal) {
    return (
      <div className="loading-container">
        <div className="spinner"></div> {/* Spinner element */}
        <p>Loading cart...</p>
      </div>
    );
  }

  return (
    <main className="cart-container">
      <header>
        <h1 className="cart-title">Your Shopping Cart</h1>
      </header>

      {cartItems.length === 0 ? (
        <section className="empty-cart">
          <p className="empty-text">Your cart is empty</p>
          <Link to="/products" className="continue-shopping-btn">
            Browse Products
          </Link>
        </section>
      ) : (
        <section className="cart-content">
          <section className="cart-items">
            {cartItems.map((item: CartItemDisplay) => (
              <article key={item.productId} className="cart-item">
                <figure className="item-image-container">
                  <img src={item.imageUrl || '/placeholder.png'} alt={item.productName} className="item-image" />
                </figure>
                <section className="item-details">
                  <h3 className="item-name">{item.productName}</h3>
                  <p className="item-price">R{Number(item.productPrice).toFixed(2)}</p>
                  <section className="quantity-controls">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="quantity-btn"
                      aria-label={`Decrease quantity of ${item.productName}`}
                    >
                      −
                    </button>
                    <output className="quantity" aria-live="polite">{item.quantity}</output>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.availableQuantity != null && item.quantity >= item.availableQuantity}
                      className="quantity-btn"
                      aria-label={`Increase quantity of ${item.productName}`}
                    >
                      +
                    </button>
                  </section>
                  {item.availableQuantity != null && (
                    <p style={{ fontSize: '0.8em', color: '#666' }}>
                      {item.availableQuantity - item.quantity >= 0
                        ? `${item.availableQuantity - item.quantity} more available`
                        : `${item.availableQuantity} available (in stock)`}
                    </p>
                  )}
                  {item.availableQuantity != null && item.quantity > item.availableQuantity && (
                    <p style={{ color: 'red', fontSize: '0.8em', fontWeight: 'bold' }}>
                      Warning: Quantity in cart exceeds available stock! ({item.availableQuantity} available)
                    </p>
                  )}
                  <p className="item-subtotal">
                    Subtotal: R{(Number(item.productPrice) * item.quantity).toFixed(2)}
                  </p>
                </section>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="remove-btn"
                  aria-label={`Remove ${item.productName} from cart`}
                >
                  ×
                </button>
              </article>
            ))}
          </section>

          <footer className="cart-summary">
            <h3 className="summary-title">Order Summary</h3>
            <dl className="summary-details">
              <dt>Subtotal:</dt>
              <dd>R{Number(totalPrice).toFixed(2)}</dd>
            </dl>
            <section className="cart-actions">
              <Link to="/products" className="checkout-btn">
                Continue Shopping
              </Link>
              <Link to="/checkout" className="checkout-btn">
                Proceed to Checkout
              </Link>
              <button
                onClick={clearCart}
                className="checkout-btn"
              >
                Clear Cart
              </button>
            </section>
          </footer>
        </section>
      )}
    </main>
  );
};

export default CartPage;
