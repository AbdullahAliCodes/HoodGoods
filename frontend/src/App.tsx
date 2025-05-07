// src/App.tsx
import React from 'react';
import { Auth0Provider, AppState } from '@auth0/auth0-react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/ContextCart';
import './App.css';

// Import Components and Pages
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';
import CartPage from './pages/CartPage';
import ProductsPage from './pages/ProductsPage';
import CreateYourStore from './pages/CreateYourStore';
import MyStore from './pages/MyStore';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import SellerDashboardPage from './pages/SellerDashboardPage'; // Adjust path if needed
// *** Import the My Orders Page ***
import MyOrdersPage from './pages/MyOrdersPage'; // Adjust path if needed

const AppContent: React.FC = () => {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    console.log("Auth0 onRedirectCallback triggered. AppState:", appState);
    // Navigate to the intended route after login, or fallback to current path/home
    navigate(appState?.returnTo || window.location.pathname || '/');
  };

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN!}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID!}
      authorizationParams={{
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL || window.location.origin,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      <CartProvider>
        <header>
          <Navbar />
        </header>

        <main>
          <Routes>
            {/* Public Home Routes */}
            <Route path="/" element={
              <>
                <section>
                  <Hero />
                </section>
                <section>
                  <WhyChooseUs />
                </section>
              </>
            } />

            {/* Public Products Route */}
            <Route path="/products" element={
              <section>
                <ProductsPage />
              </section>
            } />

          {/* --- MODIFIED: Cart Route (Protected) --- */}
          <Route path="/cart" element={
              <section>
                <ProtectedRoute allowedRoles={['buyer', 'seller']}> {/* Protect for buyers and sellers */}
                  <CartPage />
                </ProtectedRoute>
              </section>
            } />

            {/* Checkout Route (Protected) */}
            <Route path="/checkout" element={
              <section>
                 <ProtectedRoute allowedRoles={['buyer', 'seller']}> {/* Example: Allow all logged-in */}
                    <CheckoutPage />
                 </ProtectedRoute>
              </section>
            } />


            {/* --- MODIFIED: Order Confirmation Route (Protected) --- */}
            <Route path="/order-confirmation" element={
              <section>
                 <ProtectedRoute allowedRoles={['buyer', 'seller']}> {/* Protect for buyers and sellers */}
                   <OrderConfirmationPage />
                 </ProtectedRoute>
              </section>
            } />

            {/* --- Protected Routes --- */}
            <Route path="/create-store" element={
              <ProtectedRoute allowedRoles={['buyer']}> {/* Adjust roles as needed */}
                <article>
                  <CreateYourStore />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/my-store" element={
              <ProtectedRoute allowedRoles={['seller']}> {/* Adjust roles as needed */}
                <article>
                  <MyStore />
                </article>
              </ProtectedRoute>
            } />

             <Route path="/seller-dashboard" element={
              <ProtectedRoute allowedRoles={['seller']}> {/* Protect for sellers */}
                <article>
                  <SellerDashboardPage />
                </article>
              </ProtectedRoute>
            } />

            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}> {/* Adjust roles as needed */}
                <article>
                  <AdminDashboard />
                </article>
              </ProtectedRoute>
            } />

            {/* *** ADDED My Orders Route (for any logged-in user) *** */}
            <Route path="/my-orders" element={
              <ProtectedRoute allowedRoles={['buyer', 'seller']}> {/* Or just 'buyer' if preferred */}
                <article>
                  <MyOrdersPage />
                </article>
              </ProtectedRoute>
            } />

            {/* Add other routes as needed */}

          </Routes>
        </main>

        <footer>
          <Footer />
        </footer>
      </CartProvider>
    </Auth0Provider>
  );
}

// Keep the structure if AppContent is necessary for context providers
function App() {
  return <AppContent />;
}

export default App;