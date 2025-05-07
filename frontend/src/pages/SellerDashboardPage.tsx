// src/pages/SellerDashboardPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios, { AxiosError } from 'axios';
// import { Link } from 'react-router-dom';
import './SellerDashboardPage.css'; // Ensure CSS is linked

// --- Helper Types ---
interface ProductSummary { prodId: number; name: string; imageUrl?: string; }
interface SellerOrderItemWithProduct { sellerOrderItemId: number; productId: number; quantityOrdered: number; pricePerUnit: number; productNameSnapshot: string; product: ProductSummary; createdAt: string | null; updatedAt: string | null; }
interface NestedOrderDetails { orderId: number; userId: string; orderDate: string; pickupArea: string; pickupPoint: string; }
interface SellerOrderDetails { sellerOrderId: number; orderId: number; order: NestedOrderDetails; userId: string; deliveryMethod: string; deliveryPrice: number; deliveryTimeEstimate: string; itemsSubtotal: number; sellerTotal: number; status: string; createdAt: string | null; updatedAt: string | null; items: SellerOrderItemWithProduct[]; }
interface EarningsResponse { totalEarnings: number; }
// --- End Helper Types ---

const api = axios.create({ baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000', });

const ORDER_FILTER_STATUSES = ['Processing', 'Packaging', 'Shipped', 'Ready for Pickup'];
const ORDER_UPDATE_STATUSES = ['Processing', 'Packaging', 'Shipped', 'Ready for Pickup'];

const statusClassMap: Record<string, string> = { Processing: 'status-processing', Packaging: 'status-packaging', 'Ready for Pickup': 'status-ready', Shipped: 'status-shipped', Delivered: 'status-delivered', Cancelled: 'status-cancelled', };


export default function SellerDashboardPage() {
    const { user, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
    const [allSellerOrders, setAllSellerOrders] = useState<SellerOrderDetails[]>([]);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
    const [earnings, setEarnings] = useState<number | null>(null);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true); // Target this state
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [earningsError, setEarningsError] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<number | null>(null);

    const fetchSellerOrders = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoadingOrders(true);
        setOrdersError(null);
        try {
            const token = await getAccessTokenSilently();
            const response = await api.get<SellerOrderDetails[]>('/orders/my-seller-orders', { headers: { Authorization: `Bearer ${token}` }, });
            setAllSellerOrders(response.data);
        } catch (error) {
            console.error("Failed to fetch seller orders:", error);
            const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not load seller orders.';
            setOrdersError(errorMsg); setAllSellerOrders([]);
        } finally { setIsLoadingOrders(false); }
    }, [isAuthenticated, getAccessTokenSilently]);

    const fetchSellerEarnings = useCallback(async () => {
        if (!isAuthenticated) return; setIsLoadingEarnings(true); setEarningsError(null);
        try {
            const token = await getAccessTokenSilently();
            const response = await api.get<EarningsResponse>('/orders/my-seller-earnings', { headers: { Authorization: `Bearer ${token}` }, });
            setEarnings(response.data.totalEarnings);
        } catch (error) {
            console.error("Failed to fetch seller earnings:", error);
            const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not load earnings.';
            setEarningsError(errorMsg);
        } finally { setIsLoadingEarnings(false); }
    }, [isAuthenticated, getAccessTokenSilently]);

    useEffect(() => {
        if (isAuthenticated && !isAuthLoading) { fetchSellerOrders(); fetchSellerEarnings(); }
        else if (!isAuthLoading && !isAuthenticated) { setIsLoadingOrders(false); setIsLoadingEarnings(false); setAllSellerOrders([]); setEarnings(null); }
    }, [isAuthenticated, isAuthLoading, fetchSellerOrders, fetchSellerEarnings]);

    const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => { setSelectedStatusFilter(event.target.value); };

    const handleStatusUpdate = async (sellerOrderId: number, newStatus: string) => {
        setUpdateError(null); setUpdatingStatusOrderId(sellerOrderId);
        try {
            const token = await getAccessTokenSilently();
            await api.patch<SellerOrderDetails>( `/orders/seller/${sellerOrderId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } } );
            setAllSellerOrders(currentOrders => currentOrders.map(order => order.sellerOrderId === sellerOrderId ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } : order ));
        } catch (error) {
            console.error(`Failed to update status for order ${sellerOrderId}:`, error);
            const errorMsg = error instanceof AxiosError ? error.response?.data?.message || error.message : 'Could not update order status.';
            setUpdateError(`Failed for Order #${sellerOrderId}: ${errorMsg}`);
        } finally { setUpdatingStatusOrderId(null); }
    };

    const filteredSellerOrders = useMemo(() => {
        if (selectedStatusFilter === 'All') return allSellerOrders;
        return allSellerOrders.filter(order => order.status === selectedStatusFilter);
    }, [allSellerOrders, selectedStatusFilter]);


    // --- Render Logic ---
    if (isAuthLoading) {
        // Keep original text for Auth loading
        return (
            <main className="seller-dashboard-container">
                <p>Loading authentication...</p>
            </main>
        );
    }
    if (!isAuthenticated) {
        return (
            <main className="seller-dashboard-container">
                <h1>Seller Dashboard</h1>
                <p>Please log in to view your dashboard.</p>
            </main>
        );
    }

    return (
        <main className="seller-dashboard-container">
            <h1>Seller Dashboard</h1>
            <p>Welcome, {user?.name ?? 'Seller'}!</p>

            {/* --- Earnings Section --- */}
            <section className="dashboard-section">
                <h2>Earnings</h2>
                {/* Keep original text for earnings loading */}
                {isLoadingEarnings && <p>Loading earnings...</p>}
                {earningsError && <p className="error-message">Error loading earnings: {earningsError}</p>}
                {earnings !== null && !isLoadingEarnings && !earningsError && (
                    <p className="earnings-display">Total Earnings (All Orders): R{earnings.toFixed(2)}</p>
                )}
            </section>

            {/* --- Orders Section --- */}
            <section className="dashboard-section">
                <div className="orders-header">
                    <h2>Your Orders</h2>
                    <div className="order-filter-container">
                        <label htmlFor="status-filter">Filter by Status:</label>
                        <select id="status-filter" value={selectedStatusFilter} onChange={handleFilterChange} disabled={isLoadingOrders} className="status-filter-select">
                            <option value="All">All Statuses</option>
                            {ORDER_FILTER_STATUSES.map(status => (<option key={status} value={status}>{status}</option>))}
                        </select>
                    </div>
                </div>

                {/* Loading/Error/Empty States */}
                {/* MODIFIED: Use spinner for isLoadingOrders */}
                {isLoadingOrders && (
                    <div className="loading-container"> {/* Uses specific CSS for inline */}
                        <div className="spinner"></div>
                        <p>Loading orders...</p>
                    </div>
                )}
                {ordersError && !isLoadingOrders && <p className="error-message">Error loading orders: {ordersError}</p>}
                {!isLoadingOrders && filteredSellerOrders.length === 0 && !ordersError && (
                    <p className="no-orders-message">
                        {selectedStatusFilter === 'All' ? "You have no orders yet." : `No orders found with status "${selectedStatusFilter}".`}
                    </p>
                )}
                {updateError && <p className="error-message update-error">Update Error: {updateError}</p>}

                {/* Order List - Renders only if not loading and orders exist */}
                {!isLoadingOrders && filteredSellerOrders.length > 0 && (
                     <div className="order-list">
                        {filteredSellerOrders.map((sellerOrder) => ( // <<< Use filteredSellerOrders
                            <article key={sellerOrder.sellerOrderId} className="order-card">
                                <header className="order-header">
                                    <h3>Order #{sellerOrder.orderId} </h3>
                                    <p>Status: <strong className={`status-badge ${statusClassMap[sellerOrder.status] || 'status-unknown'}`}>{sellerOrder.status}</strong></p>
                                </header>
                                <div className="order-details">
                                    <p><strong>Order Date:</strong> {new Date(sellerOrder.order.orderDate).toLocaleDateString()}</p>
                                    <p><strong>Pickup Area:</strong> {sellerOrder.order.pickupArea}</p>
                                    <p><strong>Pickup Point:</strong> {sellerOrder.order.pickupPoint}</p>
                                    <p><strong>Delivery Method:</strong> {sellerOrder.deliveryMethod} (R{sellerOrder.deliveryPrice.toFixed(2)})</p>
                                    <p><strong>Delivery Deadline:</strong> {sellerOrder.deliveryTimeEstimate} days</p>
                                    <p><strong>Your Total for this Order:</strong> R{sellerOrder.sellerTotal.toFixed(2)}</p>
                                </div>
                                <div className="items-section">
                                    <h4>Items in this Shipment:</h4>
                                    <ul className="item-list">
                                        {sellerOrder.items.map((item) => (
                                            <li key={item.sellerOrderItemId} className="item">
                                                <img src={item.product.imageUrl || 'https://placehold.co/60x60/eee/ccc?text=No+Image'} alt={item.product.name} className="item-image" onError={(e) => (e.currentTarget.src = 'https://placehold.co/60x60/eee/ccc?text=Error')} />
                                                <div className="item-details">
                                                    <span>{item.productNameSnapshot} (ID: {item.productId})</span>
                                                    <span>Qty: {item.quantityOrdered} @ R{item.pricePerUnit.toFixed(2)} each</span>
                                                    <span>Item Total: R{(item.pricePerUnit * item.quantityOrdered).toFixed(2)}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                 <div className="status-update-section">
                                     <label htmlFor={`status-${sellerOrder.sellerOrderId}`}>Update Status:</label>
                                     <select id={`status-${sellerOrder.sellerOrderId}`} value={sellerOrder.status} onChange={(e) => handleStatusUpdate(sellerOrder.sellerOrderId, e.target.value)} className="status-select" disabled={updatingStatusOrderId === sellerOrder.sellerOrderId}>
                                         {ORDER_UPDATE_STATUSES.map(status => (<option key={status} value={status}>{status}</option>))}
                                     </select>
                                     {updatingStatusOrderId === sellerOrder.sellerOrderId && <span className="updating-indicator"> Updating...</span>}
                                 </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}