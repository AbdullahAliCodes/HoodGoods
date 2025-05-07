// src/pages/MyOrdersPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
// import { Link } from 'react-router-dom';
import './MyOrdersPage.css'; // Make sure spinner CSS is in here or imported

// --- Helper Types ---
interface ProductSummary {
    prodId: number;
    name: string;
    imageUrl?: string;
}
interface SellerOrderItemWithProduct {
    sellerOrderItemId: number;
    productId: number;
    quantityOrdered: number;
    pricePerUnit: number;
    productNameSnapshot: string;
    product: ProductSummary;
    createdAt: string | null;
    updatedAt: string | null;
}
interface NestedSellerOrder {
    sellerOrderId: number;
    orderId: number;
    userId: string; // Seller's User ID
    deliveryMethod: string;
    deliveryPrice: number;
    deliveryTimeEstimate: string;
    itemsSubtotal: number;
    sellerTotal: number;
    status: string; // This is the tracking status for this part
    createdAt: string | null;
    updatedAt: string | null;
    items: SellerOrderItemWithProduct[];
}
interface BuyerOrderDetails {
    orderId: number;
    userId: string; // Buyer's User ID
    orderDate: string;
    grandTotal: number;
    pickupArea: string;
    pickupPoint: string;
    createdAt: string | null;
    updatedAt: string | null;
    sellerOrders: NestedSellerOrder[]; // Array of seller orders within this main order
}
// --- End Helper Types ---

// Create Axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
});

// Define allowed statuses for mapping CSS classes
const statusClassMap: Record<string, string> = {
    Processing: 'status-processing',
    Packaging: 'status-packaging',
    'Ready for Pickup': 'status-ready',
    Shipped: 'status-shipped',
    Delivered: 'status-delivered',
    Cancelled: 'status-cancelled',
};


export default function MyOrdersPage() {
    const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
    const [orders, setOrders] = useState<BuyerOrderDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true); // For data fetching
    const [error, setError] = useState<string | null>(null);

    // --- Fetch Buyer Orders ---
    const fetchMyOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getAccessTokenSilently();
            const response = await api.get<BuyerOrderDetails[]>('/orders/my-orders', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrders(response.data);
        } catch (err) {
            console.error("Failed to fetch buyer orders:", err);
            const errorMsg = err instanceof AxiosError
                ? err.response?.data?.message || err.message
                : 'Could not load your orders.';
            setError(errorMsg);
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [getAccessTokenSilently]); // Dependencies

    // --- Initial Data Fetch Effect ---
    useEffect(() => {
        // Only fetch if Auth0 is done loading AND user is authenticated
        if (!isAuthLoading && isAuthenticated) {
            fetchMyOrders();
        } else if (!isAuthLoading && !isAuthenticated) {
            // If Auth0 is done and user is not logged in, stop loading
            setIsLoading(false);
            setOrders([]);
            setError(null); // No error, just not logged in
        }
        // If isAuthLoading is true, we show the auth loading text below
    }, [isAuthenticated, isAuthLoading, fetchMyOrders]); // Run when auth state changes


    // --- Render Logic ---

    // Keep original text for Auth loading
    if (isAuthLoading) {
        return (
             <main className="my-orders-container">
                 <p>Loading authentication...</p> {/* Text for initial auth check */}
             </main>
        );
    }

    // Show login message if Auth0 is done loading but user isn't logged in
    if (!isAuthenticated) {
        return (
             <main className="my-orders-container">
                 <p>Please log in to view your order history.</p>
                 {/* Optionally add a login button here */}
             </main>
        );
    }

    // --- Authenticated User Content ---
    return (
        <main className="my-orders-container">
            <h1>My Orders</h1>

            {/* MODIFIED: Show spinner *while* fetching orders (isLoading state) */}
            {isLoading && (
                <div className="loading-container" style={{ minHeight: '150px', padding: '1rem 0' }}> {/* Adjusted style for inline loading */}
                    <div className="spinner"></div>
                    <p>Loading your orders...</p>
                </div>
            )}

            {/* Show error message if fetching orders failed */}
            {error && !isLoading && <p className="error-message">Error loading orders: {error}</p>}

            {/* Show message if loading is done, no error, but no orders */}
            {!isLoading && orders.length === 0 && !error && (
                <p>You haven't placed any orders yet.</p>
            )}

            {/* Display orders if loading is done and orders exist */}
            {!isLoading && orders.length > 0 && (
                <div className="order-list">
                    {orders.map((order) => (
                        <article key={order.orderId} className="order-card">
                            <header className="order-header">
                                <h2>Order #{order.orderId}</h2>
                                <span>Placed on: {new Date(order.orderDate).toLocaleDateString()}</span>
                            </header>
                            <div className="order-details-overall">
                                <p><strong>Grand Total:</strong> R{order.grandTotal.toFixed(2)}</p>
                                <p><strong>Pickup Location:</strong> {order.pickupPoint} ({order.pickupArea})</p>
                            </div>

                            <div className="shipments-section">
                                <h3>Shipments in this Order:</h3>
                                {order.sellerOrders.map((sellerOrder) => (
                                    <section key={sellerOrder.sellerOrderId} className="shipment-card">
                                        <header className="shipment-header">
                                            <h4>Shipment #{sellerOrder.sellerOrderId}</h4>
                                            {/* TODO: Display Seller/Store Name */}
                                            <p>Status: <strong className={`status-badge ${statusClassMap[sellerOrder.status] || 'status-unknown'}`}>{sellerOrder.status}</strong></p>
                                        </header>
                                        <div className="shipment-details">
                                            <p><strong>Delivery Method:</strong> {sellerOrder.deliveryMethod} (R{sellerOrder.deliveryPrice.toFixed(2)})</p>
                                            <p><strong>ETA:</strong> {sellerOrder.deliveryTimeEstimate} days</p>
                                            <p><strong>Shipment Total:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                                        </div>
                                        <ul className="item-list">
                                            {sellerOrder.items.map((item) => (
                                                <li key={item.sellerOrderItemId} className="item">
                                                    <img
                                                        src={item.product.imageUrl || 'https://placehold.co/50x50/eee/ccc?text=N/A'}
                                                        alt={item.product.name}
                                                        className="item-image"
                                                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/50x50/eee/ccc?text=Err')}
                                                    />
                                                    <div className="item-details">
                                                        <span>{item.productNameSnapshot}</span>
                                                        <span>Qty: {item.quantityOrdered} @ R{item.pricePerUnit.toFixed(2)}</span>
                                                        <span>Item Total: R{(item.pricePerUnit * item.quantityOrdered).toFixed(2)}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}