import { useEffect, useState, useMemo } from 'react';
import { useCart } from '../context/ContextCart';
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import './ProductsPage.css';

// Search normalizer function
const normalizeSearchTerm = (term: string) => {
  if (!term) return '';
  return term
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, '')
    .replace(/\b(s|es|ies|ing|ed|er)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  productquantity: number;
  userId: string;
  imageUrl: string;
  storeId: string;
  storeName: string;
  isActive: boolean;
}

interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  storeId: string;
  storeName: string;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth0();
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | null}>({message: '', type: null});

  const selectedCategory = searchParams.get('category') || '';
  const selectedStore = searchParams.get('store') || '';
  const searchQuery = searchParams.get('search') || '';

  // Show notification and auto-hide after delay
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({message, type});
    setTimeout(() => {
      setNotification({message: '', type: null});
    }, 3000);
  };
  //for spinner 


  //for spinner

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get<{ products: Product[] } | Product[]>(`${backendUrl}/products`);

        let fetchedProducts: Product[] = [];
        if (Array.isArray(response.data)) {
            fetchedProducts = response.data;
        } else if (typeof response.data === 'object' && response.data !== null && Array.isArray(response.data.products)) {
            fetchedProducts = response.data.products;
        } else {
            console.error("Unexpected data format:", response.data);
            throw new Error('Invalid data format received from server');
        }

        const validatedProducts = fetchedProducts.map(p => ({
            ...p,
            storeId: String(p.storeId ?? 'unknown'),
            productquantity: Number(p.productquantity) || 0
        }))
        .filter(p => p.productquantity > 0);

        setProducts(validatedProducts);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';
        console.error("Fetch products error:", errorMessage, err);
        setError(errorMessage);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
      let result = [...products];
      if (selectedCategory) {
        result = result.filter(product => product.category === selectedCategory);
      }
      if (selectedStore) {
        result = result.filter(product => product.storeName === selectedStore);
      }
      if (searchQuery) {
        const normalizedQuery = normalizeSearchTerm(searchQuery);
        if (normalizedQuery) {
          result = result.filter(product => {
            const searchFields = [
              product.name,
              product.description,
              product.storeName,
              product.category
            ].map(field => normalizeSearchTerm(field || ''));
            return searchFields.some(field => field.includes(normalizedQuery));
          });
        }
      }
      return result;
  }, [selectedCategory, selectedStore, searchQuery, products]);

  const handleFilterChange = (filterType: 'category' | 'store' | 'search', value: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (value) {
          newParams.set(filterType, value);
      } else {
          newParams.delete(filterType);
      }
      setSearchParams(newParams, { replace: true });
  };

  const handleCategoryChange = (category: string) => handleFilterChange('category', category);
  const handleStoreChange = (store: string) => handleFilterChange('store', store);
  const handleSearchChange = (query: string) => handleFilterChange('search', query);

  const handleAddToCart = async (product: Product) => {
    try {
      if (!isAuthenticated) {
        showNotification('Please sign in or create an account to add items to your cart', 'error');
        return;
      }
      if (!product || typeof product.prodId === 'undefined') {
        throw new Error('Product data is invalid or missing ID');
      }
      
      const price = Number(product.price);
      if (isNaN(price)) {
        throw new Error('Product price is invalid');
      }
      
      if (!product.storeId || product.storeId === 'unknown') {
        console.error("Product missing valid storeId:", product);
        throw new Error('Product is missing store information.');
      }

      if (product.productquantity <= 0) {
        showNotification(`${product.name} is currently out of stock.`, 'error');
        return;
      }
      
      if (isAuthenticated && user?.sub === product.userId) {
        showNotification("You cannot add your own product to the cart.", 'error');
        return;
      }

      const itemToAdd: AddToCartItem = {
        productId: product.prodId,
        productName: product.name,
        productPrice: price,
        storeId: product.storeId,
        storeName: product.storeName,
        imageUrl: product.imageUrl || undefined
      };

      await addToCart(itemToAdd);
      showNotification(`${product.name} added to cart!`, 'success');

    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add item to cart';
      showNotification(errorMsg, 'error');
    }
  };

  const categories = useMemo(() => [...new Set(products.map(product => product.category))], [products]);
  const stores = useMemo(() => [...new Set(products.map(product => product.storeName))], [products]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <section className="error-message" role="alert" aria-live="assertive">
        <h2>Error Loading Products</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <main className="products-container">
      {/* Notification Modal */}
      {notification.type && (
        <div className={`notification-modal ${notification.type}`}>
          {notification.message}
        </div>
      )}


      <section className="filters-container" aria-labelledby="filters-heading">
          <div className="search-bar filters">
            <label htmlFor="product-search">Search Products:</label>
            <input
              id="product-search"
              type="search"
              placeholder="Search by name, description, store..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search products"
            />
          </div>

          <div className="category-filter filters">
            <label htmlFor="category-select">Filter by Category:</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="store-filter filters">
            <label htmlFor="store-select">Filter by Store:</label>
            <select
              id="store-select"
              value={selectedStore}
              onChange={(e) => handleStoreChange(e.target.value)}
            >
              <option value="">All Stores</option>
              {stores.map(store => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>
      </section>

      <ul className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const isOwner = isAuthenticated && product.userId === user?.sub;
            const isOutOfStock = product.productquantity <= 0;
            const isDisabled = isOutOfStock || isOwner;
            const buttonText = isOwner ? 'Your Product' : (isOutOfStock ? 'Out of Stock' : 'Add to Cart');

            return (
              <li key={product.prodId} className="product-card">
                <article>
                  <figure className="product-image-container">
                    <img
                      src={product.imageUrl || '/placeholder-product.jpg'}
                      alt={product.name || 'Product image'}
                      className="product-image"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== '/placeholder-product.jpg') {
                          target.src = '/placeholder-product.jpg';
                          target.alt = 'Placeholder image';
                          target.classList.add('placeholder');
                        }
                      }}
                      loading="lazy"
                    />
                  </figure>
                  <section className="product-details">
                    <h2 className="product-name">{product.name}</h2>
                    <p className="product-store">Sold by: {product.storeName || 'Unknown Store'}</p>
                    <p className="product-description">{product.description}</p>
                    <p className="product-category">Category: {product.category}</p>
                    <p className="product-price">R{(Number(product.price) || 0).toFixed(2)}</p>
                    <p className="product-quantity">
                      {isOutOfStock ? 'Out of Stock' : `Available: ${product.productquantity}`}
                    </p>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="add-to-cart-btn"
                      aria-label={isOwner ? `Cannot add own product ${product.name}` : (isOutOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`)}
                      type="button"
                      disabled={isDisabled}
                    >
                      {buttonText}
                    </button>
                  </section>
                </article>
              </li>
            );
          })
        ) : (
          <li className="no-products">
            <p>
              {selectedCategory || selectedStore || searchQuery
                ? 'No products found matching your criteria.'
                : 'No products available at the moment.'}
            </p>
          </li>
        )}
      </ul>
    </main>
  );
};

export default ProductsPage;
