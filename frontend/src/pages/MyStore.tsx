import React, { useState, useEffect, useCallback, useRef, ChangeEvent, Fragment } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import './myStore.css'; // Ensure this CSS file is imported
// Ensure all necessary imports from types are included and used
import { PRODUCT_CATEGORIES, STANDARD_DELIVERY_TIMES, EXPRESS_DELIVERY_TIMES } from '../types/createStore';

// --- Frontend Type Definitions ---
interface Product {
    prodId: number;
    name: string;
    description: string;
    price: number;
    category: string;
    productquantity: number;
    imageUrl?: string | null;
    storeId: string;
    userId: string;
    isActive?: boolean;
}

interface Store {
    storeId: string;
    userId: string;
    storeName: string;
    standardPrice: number | null;
    standardTime: string | null;
    expressPrice: number | null;
    expressTime: string | null;
}

// Type for Product Edit Form state (string inputs)
type EditableProductFields = Omit<Product, 'prodId' | 'imageUrl' | 'storeId' | 'userId' | 'isActive' | 'price' | 'productquantity'> & {
    price: string;
    productQuantity: string;
};

// Type for Add Product Form state (string inputs + file)
type NewProductFields = Partial<Omit<Product, 'prodId' | 'imageUrl' | 'storeId' | 'userId' | 'isActive' | 'price' | 'productquantity' >> & {
    price?: string;
    productQuantity?: string;
    imageFile?: File | null;
    imagePreviewUrl?: string | null;
};

// Type for Delivery Edit Form State
interface EditableDeliveryFields {
    standardPrice: string;
    standardTime: string;
    expressPrice: string;
    expressTime: string;
}
// --- End Type Definitions ---


// --- Component ---
const MyStore: React.FC = () => {
    // --- Hooks ---
    const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    // --- State ---
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [loading, setLoading] = useState(true);
    const [storeData, setStoreData] = useState<{ store: Store; products: Product[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    // Add Product State
    const initialNewProductState: NewProductFields = { name: '', description: '', price: '', category: '', productQuantity: '', imageFile: null, imagePreviewUrl: null };
    const [isAddingProductFormVisible, setIsAddingProductFormVisible] = useState(false);
    const [isAddingProductLoading, setIsAddingProductLoading] = useState(false);
    const [newProduct, setNewProduct] = useState<NewProductFields>(initialNewProductState);
    const addFileInputRef = useRef<HTMLInputElement>(null);
    // Edit Product State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<EditableProductFields>>({});
    const [editProductImage, setEditProductImage] = useState<File | null>(null);
    const [editProductPreview, setEditProductPreview] = useState<string>('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const editDialogRef = useRef<HTMLDialogElement>(null);
    // Delete Product State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const deleteDialogRef = useRef<HTMLDialogElement>(null);
    // Edit Delivery State
    const [isEditingDelivery, setIsEditingDelivery] = useState(false);
    const [isSavingDelivery, setIsSavingDelivery] = useState(false);
    const [editDeliveryData, setEditDeliveryData] = useState<EditableDeliveryFields>({
        standardPrice: '', standardTime: '', expressPrice: '', expressTime: ''
    });
    // --- End State ---


    // --- Utility & Fetching Functions ---
    const getToken = useCallback(async (): Promise<string | null> => {
        try {
            const storedToken = sessionStorage.getItem('access_token');
            if (storedToken) return storedToken;
            if (!isAuthenticated) {
                await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
                return null;
            }
            const freshToken = await getAccessTokenSilently();
            sessionStorage.setItem('access_token', freshToken);
            return freshToken;
        } catch (error) {
            console.error('Error getting access token:', error);
            sessionStorage.removeItem('access_token');
            if (error instanceof Error && (error.message.includes('consent_required') || error.message.includes('login_required'))) {
                try {
                     await loginWithRedirect({ appState: { returnTo: window.location.pathname } });
                } catch (redirectError) {
                    console.error("Redirect to login failed:", redirectError);
                }
            }
            return null;
        }
    }, [getAccessTokenSilently, isAuthenticated, loginWithRedirect]);

    const uploadImageToBackend = async (file: File, token: string): Promise<string> => {
        const imgFormData = new FormData();
        imgFormData.append('file', file);
        const res = await fetch(`${baseUrl}/upload/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: imgFormData,
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to parse upload error response' }));
            throw new Error(`Failed to upload image: ${errorData.message || res.statusText}`);
        }
        const data = await res.json();
        if (!data.url || typeof data.url !== 'string') {
            throw new Error(`Image upload succeeded but response did not contain a valid URL string.`);
        }
        return data.url;
    };

    const fetchStoreData = useCallback(async (currentToken?: string) => {
        setLoading(true); setError(null); setActionError(null); // Ensure loading is true at start
        const token = currentToken || await getToken();
        if (!token) {
             setError("Authentication failed.");
             setLoading(false);
             setCheckingAuth(false); // Also stop checking auth here
             return;
        }
        try {
            const response = await fetch(`${baseUrl}/stores/my-store`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                if (response.status === 404) { setError("Store not found. You might need to create your store first."); setStoreData(null); }
                else { const e = await response.json().catch(()=>(null)); throw new Error(e?.message || `Error fetching store data: ${response.statusText}`); }
            } else {
                 const fetchedData: { store: Store; products: Product[] } = await response.json();
                 if (!fetchedData || !fetchedData.store) { throw new Error("Invalid data received."); }
                 fetchedData.products = Array.isArray(fetchedData.products) ? fetchedData.products : [];
                 setStoreData(fetchedData);
                 setIsEditingDelivery(false);
            }
        } catch (err: any) {
            console.error("Error fetching store data:", err);
             if (!(err instanceof Error && err.message.includes("Store not found"))) {
                  setError(err.message || "Unknown error fetching store data.");
             }
             setStoreData(null);
        } finally {
            setLoading(false);
            setCheckingAuth(false); // Auth check is definitely done after fetch attempt
        }
    }, [baseUrl, getToken]);

    // --- Effects ---
    useEffect(() => {
        const checkAuthAndLoad = async () => {
            if (!isAuthLoading && isAuthenticated) {
                 // Auth is ready, start fetching data (which will set loading states)
                 await fetchStoreData();
            } else if (!isAuthLoading && !isAuthenticated) {
                // Auth loaded, user not logged in
                setCheckingAuth(false);
                setLoading(false);
                // Redirect handled by getToken if needed later
            } else {
                 // Auth0 is still loading its initial state
                 setCheckingAuth(true);
                 setLoading(true); // Keep overall loading true
            }
        };
        checkAuthAndLoad();
    }, [isAuthenticated, isAuthLoading, fetchStoreData]); // Dependencies

    useEffect(() => { // Edit modal effect
        const dialog = editDialogRef.current; if (dialog) { if (isEditModalOpen) dialog.showModal(); else dialog.close(); }
    }, [isEditModalOpen]);

    useEffect(() => { // Delete modal effect
        const dialog = deleteDialogRef.current; if (dialog) { if (isDeleteModalOpen) dialog.showModal(); else dialog.close(); }
    }, [isDeleteModalOpen]);


    // --- Delivery Edit Handlers ---
    const toggleEditDeliveryMode = () => {
        if (!storeData) return;
        if (!isEditingDelivery) {
            setEditDeliveryData({
                standardPrice: storeData.store.standardPrice?.toString() ?? '',
                standardTime: storeData.store.standardTime ?? STANDARD_DELIVERY_TIMES[0],
                expressPrice: storeData.store.expressPrice?.toString() ?? '',
                expressTime: storeData.store.expressTime ?? EXPRESS_DELIVERY_TIMES[0],
            });
            setActionError(null);
            setIsEditingDelivery(true);
        } else {
            setIsEditingDelivery(false);
            setActionError(null);
        }
    };

    const handleDeliveryFieldChange = (field: keyof EditableDeliveryFields, value: string) => {
        setEditDeliveryData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveDeliveryOptions = async () => {
        if (!storeData) { setActionError("Store data not available."); return; }
        setActionError(null); setIsSavingDelivery(true);
        const token = await getToken(); if (!token) { setActionError("Authentication error."); setIsSavingDelivery(false); return; }
        const standardPriceNum = parseFloat(editDeliveryData.standardPrice); const expressPriceNum = parseFloat(editDeliveryData.expressPrice);
        if (isNaN(standardPriceNum) || standardPriceNum < 0) { setActionError("Standard price invalid."); setIsSavingDelivery(false); return; }
        if (isNaN(expressPriceNum) || expressPriceNum < 0) { setActionError("Express price invalid."); setIsSavingDelivery(false); return; }
        if (!editDeliveryData.standardTime) { setActionError("Select standard time."); setIsSavingDelivery(false); return; }
        if (!editDeliveryData.expressTime) { setActionError("Select express time."); setIsSavingDelivery(false); return; }
        const payload: Partial<Store> = {}; const originalStore = storeData.store;
        if (standardPriceNum !== originalStore.standardPrice) payload.standardPrice = standardPriceNum; if (editDeliveryData.standardTime !== originalStore.standardTime) payload.standardTime = editDeliveryData.standardTime; if (expressPriceNum !== originalStore.expressPrice) payload.expressPrice = expressPriceNum; if (editDeliveryData.expressTime !== originalStore.expressTime) payload.expressTime = editDeliveryData.expressTime;
        if (Object.keys(payload).length === 0) { setActionError("No changes made."); setIsSavingDelivery(false); setIsEditingDelivery(false); return; }
        try {
            const response = await fetch(`${baseUrl}/stores/my-store/delivery`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const e=await response.json().catch(()=>({message:'Save failed'})); throw new Error(e.message || `Error: ${response.statusText}`); }
            const updatedStore: Store = await response.json();
            setStoreData(prevData => prevData ? { ...prevData, store: updatedStore } : null); setIsEditingDelivery(false);
        } catch (err: any) { console.error("Error saving delivery options:", err); setActionError(err.message || "Unknown error saving delivery options."); }
        finally { setIsSavingDelivery(false); }
    };

    const handleCancelEditDelivery = () => {
        setIsEditingDelivery(false);
        setActionError(null);
    };
    // --- End Delivery Edit Handlers ---


    // --- Product CRUD Handlers ---
    const handleNewProductChange = (field: keyof Omit<NewProductFields, 'imageFile' | 'imagePreviewUrl'>, value: string) => {
        setNewProduct(prev => ({ ...prev, [field]: value }));
    };

    const handleNewProductImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if(file){ const r=new FileReader(); r.onloadend=()=>setNewProduct(p=>({...p, imageFile:file, imagePreviewUrl:r.result as string})); r.readAsDataURL(file); } else { setNewProduct(p=>({...p, imageFile:null, imagePreviewUrl:null})); }
    };

    const handleAddProduct = async () => {
        if (!storeData?.store) { setActionError("Store data missing."); return; } setActionError(null); setIsAddingProductLoading(true); const token = await getToken(); if (!token) { setActionError("Auth error."); setIsAddingProductLoading(false); return; } if (!newProduct.name||!newProduct.price||!newProduct.category||!newProduct.productQuantity||!newProduct.imageFile) { setActionError("Fill required fields & image."); setIsAddingProductLoading(false); return; } const priceNum=parseFloat(newProduct.price); const quantityNum=parseInt(newProduct.productQuantity,10); if(isNaN(priceNum)||priceNum<=0||isNaN(quantityNum)||quantityNum<0){ setActionError("Valid price/quantity needed."); setIsAddingProductLoading(false); return; }
        try { const imageUrl = await uploadImageToBackend(newProduct.imageFile, token); const payload={name:newProduct.name,description:newProduct.description||'',price:priceNum,category:newProduct.category,imageUrl:imageUrl,productquantity:quantityNum}; const res = await fetch(`${baseUrl}/stores/products`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!res.ok) { const e=await res.json().catch(()=>({message:'Failed to add product'})); throw new Error(e.message || `Error: ${res.statusText}`); } setNewProduct(initialNewProductState); setIsAddingProductFormVisible(false); if (addFileInputRef.current) addFileInputRef.current.value = ''; await fetchStoreData(token);
        } catch (err: any) { console.error("Error adding product:", err); setActionError(err.message || "Unknown error adding product."); } finally { setIsAddingProductLoading(false); }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product); setEditFormData({ name: product.name, description: product.description, price: product.price.toString(), category: product.category, productQuantity: product.productquantity.toString() }); setEditProductImage(null); setEditProductPreview(product.imageUrl || ''); setActionError(null); setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false); setEditingProduct(null); setEditFormData({}); setEditProductImage(null); setEditProductPreview(''); if (editFileInputRef.current) editFileInputRef.current.value = '';
    };

    const handleEditFormChange = (field: keyof EditableProductFields, value: string) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0]; if(file){ setEditProductImage(file); const r=new FileReader(); r.onloadend=()=>setEditProductPreview(r.result as string); r.readAsDataURL(file); }
    };

    const handleUpdateProduct = async () => {
         if (!editingProduct) { setActionError("No product selected."); return; } setActionError(null); setIsSavingEdit(true); const token = await getToken(); if (!token) { setActionError("Auth error."); setIsSavingEdit(false); return; } const priceNum=parseFloat(editFormData.price??''); const quantityNum=parseInt(editFormData.productQuantity??'',10); if(isNaN(priceNum)||priceNum<=0||isNaN(quantityNum)||quantityNum<0){ setActionError("Valid price/quantity."); setIsSavingEdit(false); return; }
         try { let imageUrl = editingProduct.imageUrl; if (editProductImage) { imageUrl = await uploadImageToBackend(editProductImage, token); } const payload: Partial<Product & { imageUrl?: string | null }> = {}; if (editFormData.name !== editingProduct.name) payload.name = editFormData.name; if (editFormData.description !== editingProduct.description) payload.description = editFormData.description; if (priceNum !== editingProduct.price) payload.price = priceNum; if (editFormData.category !== editingProduct.category) payload.category = editFormData.category; if (quantityNum !== editingProduct.productquantity) payload.productquantity = quantityNum; if (imageUrl !== editingProduct.imageUrl) payload.imageUrl = imageUrl; if (Object.keys(payload).length === 0) { setActionError("No changes detected."); setIsSavingEdit(false); return; } const res = await fetch(`${baseUrl}/stores/products/${editingProduct.prodId}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!res.ok) { const e=await res.json().catch(()=>({message:'Failed update'})); throw new Error(e.message || `Error: ${res.statusText}`); } closeEditModal(); await fetchStoreData(token);
         } catch (err: any) { console.error(`Error updating product ${editingProduct.prodId}:`, err); setActionError(err.message || "Unknown error saving."); } finally { setIsSavingEdit(false); }
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
        setActionError(null);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
        setActionError(null);
    };

    const executeDeleteProduct = async () => {
        if (!productToDelete) return; setActionError(null); setIsDeleting(true); const prodIdToDelete = productToDelete.prodId; const token = await getToken(); if (!token) { setActionError("Auth error."); setIsDeleting(false); return; }
        try { const response = await fetch(`${baseUrl}/stores/products/${prodIdToDelete}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (!response.ok && response.status !== 204) { const e = await response.json().catch(()=>({message:'Failed delete'})); throw new Error(e.message || `Error: ${response.statusText}`); } closeDeleteModal(); await fetchStoreData(token);
        } catch (err: any) { console.error(`Error deleting product ${prodIdToDelete}:`, err); setActionError(err.message || "Unknown error deleting."); } finally { setIsDeleting(false); }
    };
    // --- End Product CRUD Handlers ---


    // --- Render Logic ---
    if (checkingAuth) {
        // MODIFIED: Render spinner structure instead of just text
        return (
            <main className="my-store-container"> {/* Wrap in main container for consistent max-width/padding */}
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Checking Authentication...</p> {/* Spinner text */}
                </div>
            </main>
        );
    }

    // This loading state covers the data fetching *after* auth check
    if (loading) {
         // You could use the spinner here too, or keep the text
         return (
            <main className="my-store-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading Your Store...</p>
                </div>
            </main>
         );
         // return <p>Loading Your Store...</p>; // Original text option
    }

    // Handle specific error cases or missing store data
    if (error && error.includes("Store not found")) {
        return (
            <section className="my-store-container no-store">
                <h2>Store Not Found</h2>
                <p>It looks like you haven't created your store yet.</p>
                <Link to="/create-store" className="button-primary">Create Your Store</Link>
            </section>
        );
    }
    if (error) {
        return (
            <section className="my-store-container my-store-error">
                <h2>Error Loading Store</h2>
                <p>{error}</p>
                <button onClick={() => fetchStoreData()} className="button-secondary">Retry</button>
            </section>
        );
    }
    // If storeData is somehow null after loading and no errors (shouldn't happen often)
    if (!storeData) {
        return (
            <section className="my-store-container">
                <p>Store data could not be loaded.</p>
                <button onClick={() => fetchStoreData()} className="button-secondary">Retry</button>
            </section>
        );
    }

    // --- Render Main Content ---
    const { store, products } = storeData;

    return (
        <main className="my-store-container">
            <header className="store-header">
                <h1>{store.storeName}</h1>
                <section className="delivery-info-display">
                    <div className="delivery-header">
                        <h2>Delivery Settings</h2>
                        {!isEditingDelivery && (<button onClick={toggleEditDeliveryMode} className="button-edit button-small">Edit Delivery</button>)}
                    </div>
                    {!isEditingDelivery ? (
                        <Fragment>
                            <dl>
                                <Fragment> <dt>Standard Delivery:</dt> <dd> {store.standardPrice !== null ? `R${store.standardPrice.toFixed(2)}` : 'N/A'} {' / '} {store.standardTime ? `${store.standardTime} Days` : 'N/A'} </dd> </Fragment>
                                <Fragment> <dt>Express Delivery:</dt> <dd> {store.expressPrice !== null ? `R${store.expressPrice.toFixed(2)}` : 'N/A'} {' / '} {store.expressTime ? `${store.expressTime} Days` : 'N/A'} </dd> </Fragment>
                            </dl>
                            <p className="info-text">Use the 'Edit Delivery' button to modify settings.</p>
                        </Fragment>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveDeliveryOptions(); }} className="delivery-edit-form">
                            {actionError && !isSavingDelivery && <p className="error-message">{actionError}</p>}
                            <label htmlFor="editStdPrice">Standard Price (R):</label> <input id="editStdPrice" type="number" value={editDeliveryData.standardPrice} onChange={(e) => handleDeliveryFieldChange('standardPrice', e.target.value)} required min="0" step="0.01" disabled={isSavingDelivery}/>
                            <label htmlFor="editStdTime">Standard Time:</label> <select id="editStdTime" value={editDeliveryData.standardTime} onChange={(e) => handleDeliveryFieldChange('standardTime', e.target.value)} required disabled={isSavingDelivery}> {STANDARD_DELIVERY_TIMES.map(time => <option key={`std-${time}`} value={time}>{time} Days</option>)} </select>
                            <label htmlFor="editExpPrice">Express Price (R):</label> <input id="editExpPrice" type="number" value={editDeliveryData.expressPrice} onChange={(e) => handleDeliveryFieldChange('expressPrice', e.target.value)} required min="0" step="0.01" disabled={isSavingDelivery}/>
                            <label htmlFor="editExpTime">Express Time:</label> <select id="editExpTime" value={editDeliveryData.expressTime} onChange={(e) => handleDeliveryFieldChange('expressTime', e.target.value)} required disabled={isSavingDelivery}> {EXPRESS_DELIVERY_TIMES.map(time => <option key={`exp-${time}`} value={time}>{time} Days</option>)} </select>
                            <div className="delivery-edit-actions"> <button type="submit" className="button-confirm" disabled={isSavingDelivery}>{isSavingDelivery ? 'Saving...' : 'Save Delivery Options'}</button> <button type="button" className="button-cancel" onClick={handleCancelEditDelivery} disabled={isSavingDelivery}>Cancel</button> </div>
                        </form>
                    )}
                </section>
                <div className="store-actions-container">
                    <button onClick={() => setIsAddingProductFormVisible(prev => !prev)} className="button-primary add-product-toggle-btn">{isAddingProductFormVisible ? 'Cancel Add Product' : 'Add New Product'}</button>
                    <Link to="/seller-dashboard" className="button-secondary view-orders-btn">View Current Orders</Link>
                </div>
            </header>

            {isAddingProductFormVisible && (
                <section className="add-product-form-section">
                    <h2>Add New Product</h2>
                    <form onSubmit={(e)=>{e.preventDefault();handleAddProduct();}}>
                        {actionError && !isAddingProductLoading && <p className="error-message">{actionError}</p>}
                        <label htmlFor="newProdName">Product Name:</label><input id="newProdName" type="text" value={newProduct.name??''} onChange={(e)=>handleNewProductChange('name',e.target.value)} required disabled={isAddingProductLoading}/>
                        <label htmlFor="newProdDesc">Description:</label><textarea id="newProdDesc" value={newProduct.description??''} onChange={(e)=>handleNewProductChange('description',e.target.value)} disabled={isAddingProductLoading}></textarea>
                        <label htmlFor="newProdPrice">Price (R):</label><input id="newProdPrice" type="number" value={newProduct.price??''} onChange={(e)=>handleNewProductChange('price',e.target.value)} required min="0.01" step="0.01" disabled={isAddingProductLoading}/>
                        <label htmlFor="newProdQuantity">Quantity:</label><input id="newProdQuantity" type="number" value={newProduct.productQuantity??''} onChange={(e)=>handleNewProductChange('productQuantity',e.target.value)} required min="0" step="1" disabled={isAddingProductLoading}/>
                        <label htmlFor="newProdCategory">Category:</label><select id="newProdCategory" value={newProduct.category??''} onChange={(e)=>handleNewProductChange('category',e.target.value)} required disabled={isAddingProductLoading}><option value="" disabled>Select...</option>{PRODUCT_CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select>
                        <label htmlFor="newProdImage">Image:</label><input id="newProdImage" type="file" accept="image/*" ref={addFileInputRef} onChange={handleNewProductImageChange} required disabled={isAddingProductLoading}/>
                        {newProduct.imagePreviewUrl && <img src={newProduct.imagePreviewUrl} alt="Preview" className="image-preview"/>}
                        <footer className="add-form-actions">
                            <button type="submit" disabled={isAddingProductLoading} className="button-confirm">{isAddingProductLoading?'Adding...':'Confirm Add Product'}</button>
                            <button type="button" onClick={()=>{setIsAddingProductFormVisible(false); setActionError(null); setNewProduct(initialNewProductState); if (addFileInputRef.current) addFileInputRef.current.value = '';}} disabled={isAddingProductLoading} className="button-cancel">Cancel</button>
                        </footer>
                    </form>
                </section>
            )}

            <section className="products-section">
                <h2>Your Products</h2>
                {(products && products.length > 0) ? (
                    <ul className="product-list">
                        {products.map((product) => (
                            <li key={product.prodId} className="product-list-item">
                                <article className="product-card">
                                    <div className="product-image"> <img src={product.imageUrl || '/placeholder-image.png'} alt={product.name} /> </div>
                                    <div className="product-details">
                                        <h3>{product.name}</h3>
                                        <p className="product-description">{product.description}</p>
                                        <p className="product-category">Category: {product.category}</p>
                                        <p className="product-price">Price: R{product.price.toFixed(2)}</p>
                                        <p className="product-quantity">Quantity: {product.productquantity}</p>
                                    </div>
                                    <div className="product-actions">
                                        <button onClick={()=>openEditModal(product)} className="button-edit" disabled={isDeleting || isSavingEdit || isAddingProductLoading}>Edit</button>
                                        <button onClick={()=>handleDeleteClick(product)} className="button-delete" disabled={isDeleting || isSavingEdit || isAddingProductLoading}>{isDeleting && productToDelete?.prodId === product.prodId ? 'Deleting...' : 'Delete'}</button>
                                    </div>
                                </article>
                            </li>
                        ))}
                    </ul>
                ) : (<p className="no-products">You haven't added any products yet.</p>)}
            </section>

            <dialog ref={editDialogRef} onClose={closeEditModal} className="edit-product-modal">
                {editingProduct && (
                    <form onSubmit={(e)=>{e.preventDefault();handleUpdateProduct();}} method="dialog">
                        <h2>Edit: {editingProduct.name}</h2>
                        {actionError && !isSavingEdit && <p className="error-message">{actionError}</p>}
                        <label htmlFor="editProdName">Name:</label><input id="editProdName" type="text" value={editFormData.name||''} onChange={(e)=>handleEditFormChange('name',e.target.value)} required disabled={isSavingEdit}/>
                        <label htmlFor="editProdDesc">Description:</label><textarea id="editProdDesc" value={editFormData.description||''} onChange={(e)=>handleEditFormChange('description',e.target.value)} disabled={isSavingEdit}></textarea>
                        <label htmlFor="editProdPrice">Price (R):</label><input id="editProdPrice" type="number" value={editFormData.price||''} onChange={(e)=>handleEditFormChange('price',e.target.value)} required min="0.01" step="0.01" disabled={isSavingEdit}/>
                        <label htmlFor="editProdQuantity">Quantity:</label><input id="editProdQuantity" type="number" value={editFormData.productQuantity||''} onChange={(e)=>handleEditFormChange('productQuantity',e.target.value)} required min="0" step="1" disabled={isSavingEdit}/>
                        <label htmlFor="editProdCategory">Category:</label><select id="editProdCategory" value={editFormData.category||''} onChange={(e)=>handleEditFormChange('category',e.target.value)} required disabled={isSavingEdit}><option value="" disabled>Select...</option>{PRODUCT_CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select>
                        <label htmlFor="editProdImage">Replace Image (Optional):</label><input id="editProdImage" type="file" accept="image/*" ref={editFileInputRef} onChange={handleEditImageChange} disabled={isSavingEdit}/>
                        {editProductPreview && <img src={editProductPreview} alt="Preview" className="image-preview"/>}
                        <footer className="modal-actions">
                            <button type="submit" disabled={isSavingEdit} className="button-confirm">{isSavingEdit?'Saving...':'Save Changes'}</button>
                            <button type="button" onClick={closeEditModal} disabled={isSavingEdit} className="button-cancel">Cancel</button>
                        </footer>
                    </form>
                 )}
             </dialog>

            <dialog ref={deleteDialogRef} onClose={closeDeleteModal} className="delete-confirm-modal">
                 {productToDelete && (
                    <Fragment>
                        <h2>Confirm Deletion</h2>
                        <p>Are you sure you want to delete the product: <strong>{productToDelete.name}</strong>?</p>
                        <p>This action cannot be undone.</p>
                        {actionError && <p className="error-message">{actionError}</p>}
                        <footer className="modal-actions">
                            <button onClick={executeDeleteProduct} className="button-delete" disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Yes, Delete Product'}</button>
                            <button onClick={closeDeleteModal} className="button-cancel" disabled={isDeleting}>Cancel</button>
                         </footer>
                    </Fragment>
                 )}
             </dialog>
        </main>
    );
};

export default MyStore;