import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link, useNavigate } from 'react-router-dom';  // Import useNavigate
import './Navbar.css';
import { logo } from './utils/ImageImports';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const Navbar: React.FC = () => {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    user,
    getAccessTokenSilently,
    isLoading,
  } = useAuth0();

  const [role, setRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(true);

  const navigate = useNavigate();  // useNavigate hook to programmatically navigate

  useEffect(() => {
    const fetchTokenAndRole = async () => {
      if (!isLoading && isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          sessionStorage.setItem('access_token', token);

          fetch(`${backendUrl}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }).catch(regError => console.warn("Registration fetch warning:", regError));

          const roleRes = await fetch(`${backendUrl}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (roleRes.ok) {
            const data = await roleRes.json();
            setRole(data.role);
          } else {
            setRole(null);
          }
        } catch (e) {
          sessionStorage.removeItem('access_token');
          setRole(null);
        } finally {
          setIsRoleLoading(false);
        }
      } else if (!isLoading && !isAuthenticated) {
        sessionStorage.removeItem('access_token');
        setRole(null);
        setIsRoleLoading(false);
      }
    };

    fetchTokenAndRole();
  }, [isAuthenticated, getAccessTokenSilently, isLoading, backendUrl]);

  // Handle cart icon click to refresh the cart page
  const handleCartClick = () => {
    navigate('/cart');  // Navigate to cart page
    window.location.reload();  // Reload the page to refresh the cart
  };

  return (
    <nav className="navbar">
      <header className="navbar-container">
        {/* Logo Section */}
        <figure className="logo-container">
          <img src={logo} alt="Hood Goods" className="logo" />
        </figure>

        {/* Navigation Menu Links */}
        <ul className="nav-menu">
          <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
          <li className="nav-item"><Link to="products" className="nav-link">Products</Link></li>
          <li className="nav-item">
            <Link
              to="/#about-us"
              className="nav-link"
              onClick={(e) => {
                // If already on Home, scroll smoothly
                if (window.location.pathname === '/') {
                  e.preventDefault(); // Prevent default Link behavior
                  const aboutSection = document.getElementById('about-us');
                  if (aboutSection) {
                    aboutSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }
                // If not on Home, Link will handle navigation automatically
              }}
            >
              About Us
            </Link>
          </li>

          {!isLoading && isAuthenticated && !isRoleLoading && role !== 'seller' && role !== 'admin' && (
            <li className="nav-item">
              <Link to="/create-store" className="nav-link">Become A Seller</Link>
            </li>
          )}

          {!isLoading && isAuthenticated && !isRoleLoading && role === 'seller' && (
            <li className="nav-item">
              <Link to="/my-store" className="nav-link">My Store</Link>
            </li>
          )}

          {!isLoading && isAuthenticated && !isRoleLoading && role === 'admin' && (
            <li className="nav-item">
              <Link to="/admin-dashboard" className="nav-link">Admin Dashboard</Link>
            </li>
          )}
        </ul>

        {/* Icons and Authentication Section */}
        <section className="nav-icons">
          {isLoading ? null : (
            !isAuthenticated ? (
              <button
                className="sign-in-btn"
                onClick={() => loginWithRedirect()}
              >
                Sign in
              </button>
            ) : (
              <article className="auth-user">
                <span className="user-greeting">Hi, {user?.given_name ?? user?.name ?? 'User'}</span>
                <button
                  className="sign-out-btn"
                  onClick={() => logout({
                    logoutParams: { returnTo: window.location.origin }
                  })}
                >
                  Sign out
                </button>
              </article>
            )
          )}


          {/* --- MODIFIED: Orders Icon Link --- */}
          {/* Show Orders icon only if authenticated */}
          {isAuthenticated && (
            <Link to="/my-orders" className="icon-link" title="My Orders">
              📋 {/* Orders Icon (Clipboard) */}
            </Link>
          )}
          {/* --- END MODIFICATION --- */}

          {/* Cart Icon Link */}
          {/* Consider showing cart only if authenticated or based on role */}
          {isAuthenticated && ( // Example: Show cart only when logged in
             <Link to="/cart" className="icon-link" title="Cart" onClick={handleCartClick}>
               🛒 {/* Cart Icon */}
             </Link>
          )}
        </section>
      </header>
    </nav>
  );
};

export default Navbar;
