'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Product } from '../data/products';
import searchIcon from '../assets/images/search_icon.png';
import deleteIcon from '../assets/images/delete_icon.png';
import cartIcon from '../assets/images/cart.png';
import StockAlert from './StockAlert';
import ScannedItemRow from './ScannedItemRow';
import { formatCurrency } from '../utils/numberformatters';
import { productApi } from '../services/productApi';
import { DiscountValidationResult } from '../services/discountApi';
import { TaxDiscountBreakdown } from '../utils/vatCalculator';
import { SuggestedAddonsWidget } from './SuggestedAddonsWidget';

interface CartItem extends Product {
  quantity: number;
}

interface POSViewProps {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  filteredProducts: (Product & {
    available_stock?: number;
    reserved_transfer_qty?: number;
  })[];
  allProducts: Product[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  addToCart: (product: Product) => void;
  updateQty: (id: number, delta: number) => void;
  subtotal: number;
  tax: number;
  total: number;
  finalTotal: number;
  taxBreakdown: TaxDiscountBreakdown;
  discountCode: string;
  setDiscountCode: (value: string) => void;
  discountResult: DiscountValidationResult | null;
  discountError: string | null;
  isDiscountValidating: boolean;
  validateDiscountCode: () => Promise<void>;
  resetDiscount: () => void;
  handleProceedToPayment: () => void;
  onHoldCart: () => void;
  onViewHeld: () => void;
  heldCount: number;
  stockAlert: {
    isOpen: boolean;
    type: 'no-stock' | 'low-stock';
    productName: string;
    stock: number;
    threshold: number;
    onHold: number;
  };
  onCloseStockAlert: () => void;
}

const POSView: React.FC<POSViewProps> = ({
  cart,
  setCart,
  filteredProducts,
  allProducts,
  searchQuery,
  setSearchQuery,
  categories,
  activeCategory,
  setActiveCategory,
  addToCart,
  updateQty,
  subtotal,
  total,
  finalTotal,
  taxBreakdown,
  discountCode,
  setDiscountCode,
  discountResult,
  discountError,
  isDiscountValidating,
  validateDiscountCode,
  resetDiscount,
  handleProceedToPayment,
  onHoldCart,
  onViewHeld,
  heldCount,
  stockAlert,
  onCloseStockAlert,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('Confirm');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});
  const [showCategoryPage, setShowCategoryPage] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // ── T1: Debounced search state ──
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── T2: Stock fetch loading state ──
  const [stockFetchingId, setStockFetchingId] = useState<number | string | null>(null);

  // ── Task 1: Category search and All Products ──
  const [categorySearch, setCategorySearch] = useState('');
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Helper to format text to Capital Each Word
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const openConfirm = ({
    title,
    message,
    confirmAction,
  }: {
    title: string;
    message: string;
    confirmAction: () => void;
  }) => {
    setConfirmTitle(title || 'Confirm');
    setConfirmMessage(message || 'Are you sure?');
    setOnConfirm(() => confirmAction);
    setConfirmOpen(true);
  };

  const closeConfirm = () => setConfirmOpen(false);

  const getImgSrc = (img: any): string | null => {
    if (!img) return null;
    if (typeof img === 'string' && img.trim() !== '') return img;
    if (img?.src) return img.src;
    return null;
  };

  const categoryButtons = useMemo(
    () => categories
      .filter((cat) => cat.toLowerCase() !== 'all')
      .filter((cat) => cat.toLowerCase().includes(categorySearch.toLowerCase())),
    [categories, categorySearch]
  );

  // ── T1: Debounced product search with API integration ──
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    const result = await productApi.searchProducts(trimmed);

    if (result.error) {
      setSearchError(result.error);
      // T4: On API failure, fall back to local filtering (don't clear results)
      setSearchResults(null);
    } else {
      setSearchResults(result.products);
      setSearchError(null);
    }
    setSearchLoading(false);
  }, []);

  // Debounce search input by 300ms
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // ── T2: Fetch stock level on item selection and then add to cart ──
  const handleProductClick = useCallback(async (product: any) => {
    setStockFetchingId(product.id);

    try {
      const stockData = await productApi.getStockLevel(product.id);

      if (stockData.error) {
        // T4: Fallback — use whatever stock data is already on the product
        console.warn(`Stock fetch failed for ${product.name}, using existing data`);
        addToCart(product);
      } else {
        // Only merge fields that the API actually returned (non-null).
        // NEVER overwrite existing good stock data with null/zero from a bad response.
        const merged = { ...product };
        if (stockData.stock !== null && stockData.stock !== undefined) {
          merged.stock = stockData.stock;
        }
        if (stockData.available_stock !== null && stockData.available_stock !== undefined) {
          merged.available_stock = stockData.available_stock;
        }
        if (stockData.reserved_transfer_qty) {
          merged.reserved_transfer_qty = stockData.reserved_transfer_qty;
        }
        if (stockData.low_stock_threshold) {
          merged.low_stock_threshold = stockData.low_stock_threshold;
        }
        addToCart(merged);
      }
    } catch {
      // T4: Graceful fallback — add with existing data
      addToCart(product);
    } finally {
      setStockFetchingId(null);
    }
  }, [addToCart]);

  const handleScanSubmit = () => {
    const trimmed = scanInput.trim();
    if (!trimmed) {
      setScanMessage('Enter a product code or name to scan.');
      return;
    }

    const scannedProduct = filteredProducts.find(
      (product) => product.barcode === trimmed || product.name.toLowerCase() === trimmed.toLowerCase() || String(product.id) === trimmed
    );

    if (scannedProduct) {
      addToCart(scannedProduct);
      setScanMessage(`Added ${scannedProduct.name} to cart.`);
      setScanInput('');
      return;
    }

    setScanMessage('No matching item for the scanned code.');
  };

  // Determine which products to display:
  // If search returned API results, show those (filtered by category if active).
  // If search had an error, fall back to the local filteredProducts.
  // If no search query, use local filteredProducts.
  const visibleProducts = useMemo(() => {
    // If showing all products, ignore activeCategory filter
    if (showAllProducts) {
      // If we have API search results, use them
      if (searchResults !== null && searchQuery.trim()) {
        // Build a lookup from local products so we can restore images
        const localProductMap = new Map(
          filteredProducts.map((p) => [String(p.id), p])
        );

        return searchResults
          .filter((product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((product) => {
            // Merge image from local data since API results don't include it
            const localProduct = localProductMap.get(String(product.id));
            return {
              ...product,
              image: product.image || localProduct?.image || null,
            };
          });
      }

      // Local fallback - show all products
      return filteredProducts.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Normal category filtering
    if (!activeCategory) return [];

    // If we have API search results, use them (filtered by active category)
    if (searchResults !== null && searchQuery.trim()) {
      // Build a lookup from local products so we can restore images
      const localProductMap = new Map(
        filteredProducts.map((p) => [String(p.id), p])
      );

      return searchResults
        .filter((product) => product.category === activeCategory)
        .filter((product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((product) => {
          // Merge image from local data since API results don't include it
          const localProduct = localProductMap.get(String(product.id));
          return {
            ...product,
            image: product.image || localProduct?.image || null,
          };
        });
    }

    // Local fallback (including when API failed)
    return filteredProducts
      .filter((product) => product.category === activeCategory)
      .filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [filteredProducts, activeCategory, searchQuery, searchResults, showAllProducts]);

  return (
    <main className="pos-content">
      <div className="inventory-section">
        {showCategoryPage ? (
          <div
            style={{
              minHeight: '100%',
              padding: '40px',
              background: '#f8fafc',
              borderRadius: '16px',
            }}
          >
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', color: '#1b2a47', fontWeight: '700' }}>
                Medicine Categories
              </h1>
              <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                Select a category to view available medicine items.
              </p>
            </div>

            {/* Task 1: Category Search Bar */}
            <div
              style={{
                marginBottom: '24px',
                height: '48px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <img 
                src={getImgSrc(searchIcon) || ''} 
                alt="" 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  width: '18px', 
                  height: '18px', 
                  opacity: 0.4,
                  transition: 'opacity 0.2s',
                  pointerEvents: 'none' 
                }} 
              />
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                style={{ 
                  height: '100%', 
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none',
                  padding: '0 16px 0 44px',
                  fontSize: '0.95rem',
                  outline: 'none',
                  background: '#ffffff',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#01a2ad';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(1, 162, 173, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Task 1: All Products Button */}
            <div
              style={{
                marginBottom: '24px',
              }}
            >
              <button
                onClick={() => {
                  setShowAllProducts(true);
                  setActiveCategory('All');
                  setShowCategoryPage(false);
                }}
                style={{
                  padding: '16px 24px',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #01a2ad 0%, #008a96 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(1, 162, 173, 0.3)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(1, 162, 173, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(1, 162, 173, 0.3)';
                }}
              >
                All Products
              </button>
            </div>

            <div
              className="category-grid-container"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '20px',
              }}
            >
              {categoryButtons.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                  <p style={{ fontSize: '1rem', margin: 0 }}>No categories match your search.</p>
                </div>
              ) : (
                categoryButtons.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setShowCategoryPage(false);
                      setShowAllProducts(false);
                    }}
                    className={`category-card-btn ${activeCategory === cat ? 'active' : ''}`}
                    style={{
                      padding: '30px 20px',
                      borderRadius: '16px',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: activeCategory === cat ? '2px solid #01a2ad' : '1px solid #e2e8f0',
                      background: activeCategory === cat ? '#01a2ad' : '#ffffff',
                      color: activeCategory === cat ? '#ffffff' : '#1b2a47',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      letterSpacing: '0.5px'
                    }}
                    onMouseEnter={(e) => {
                      if (activeCategory !== cat) {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.borderColor = '#01a2ad';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeCategory !== cat) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }
                    }}
                  >
                    {toTitleCase(cat)}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                marginBottom: '16px',
                height: '48px'
              }}
            >
              <button
                onClick={() => {
                  setShowCategoryPage(true);
                  setShowAllProducts(false);
                  setActiveCategory('');
                  setSearchQuery('');
                  setSearchResults(null);
                  setSearchError(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 24px',
                  borderRadius: '12px',
                  background: '#01a2ad',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  height: '100%',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <ArrowLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                <span>Back to Categories</span>
              </button>

              <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <img 
                  src={getImgSrc(searchIcon) || ''} 
                  alt="" 
                  style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    width: '18px', 
                    height: '18px', 
                    opacity: isSearchFocused ? 0.8 : 0.4,
                    transition: 'opacity 0.2s',
                    pointerEvents: 'none' 
                  }} 
                />
                <input
                  type="text"
                  placeholder={`Search in ${showAllProducts ? 'All Products' : toTitleCase(activeCategory)}...`}
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ 
                    height: '100%', 
                    width: '100%',
                    borderRadius: '12px',
                    border: `1px solid ${isSearchFocused ? '#01a2ad' : '#e2e8f0'}`,
                    boxShadow: isSearchFocused ? '0 0 0 3px rgba(1, 162, 173, 0.1)' : 'none',
                    padding: '0 16px 0 44px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    background: '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                />
                {searchLoading && (
                  <div style={{
                    position: 'absolute',
                    right: '14px',
                    width: '18px',
                    height: '18px',
                    border: '2px solid #e2e8f0',
                    borderTopColor: '#01a2ad',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                )}
              </div>
            </div>

            <div className="scan-panel">
              <div className="scan-panel-header">
                <h3>Scan / Add Item</h3>
                <p>Use barcode entry or item code for fast checkout.</p>
              </div>
              <div className="scan-panel-controls">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleScanSubmit();
                    }
                  }}
                  placeholder="Scan barcode, enter item name or ID"
                />
                <button type="button" className="scan-btn" onClick={handleScanSubmit}>
                  Add Item
                </button>
              </div>
              {scanMessage && (
                <p className="scan-message">{scanMessage}</p>
              )}
            </div>

            {/* T4: API failure fallback banner */}
            {searchError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                marginBottom: '12px',
                background: '#fef3cd',
                border: '1px solid #ffc107',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#856404',
              }}>
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <span>Search service unavailable — showing local results instead.</span>
                <button
                  onClick={() => { setSearchError(null); performSearch(searchQuery); }}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: '1px solid #856404',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.8rem',
                    color: '#856404',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!activeCategory && !showAllProducts ? (
              <div className="empty-cart-state" style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 5px 0' }}>No category selected</h3>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>Click a category to show its medicine items.</p>
              </div>
            ) : (
              <div className="product-grid">
                {visibleProducts.length === 0 ? (
                  <div className="empty-cart-state" style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: '0 0 5px 0' }}>No products found</h3>
                    <p style={{ fontSize: '0.9rem', margin: 0 }}>
                      {showAllProducts ? 'No available medicine products match your search.' : `No items available under ${toTitleCase(activeCategory)}.`}
                    </p>
                  </div>
                ) : (
                  visibleProducts.map((product) => (
                    <div
                      key={product.id}
                      className="product-card"
                      onClick={() => handleProductClick(product)}
                      style={{ 
                        cursor: stockFetchingId === product.id ? 'wait' : 'pointer', 
                        userSelect: 'none',
                        transition: 'transform 0.1s active',
                        opacity: stockFetchingId === product.id ? 0.7 : 1,
                      }}
                    >
                      <div className="img-container">
                        <img src={getImgSrc(product.image) || ''} alt={product.name} />
                        {/* T2: Stock fetch loading overlay */}
                        {stockFetchingId === product.id && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.6)',
                            borderRadius: 'inherit',
                          }}>
                            <div style={{
                              width: '22px',
                              height: '22px',
                              border: '2.5px solid #e2e8f0',
                              borderTopColor: '#01a2ad',
                              borderRadius: '50%',
                              animation: 'spin 0.6s linear infinite',
                            }} />
                          </div>
                        )}
                      </div>
                      <h3 className="product-name">{product.name}</h3>
                      <p className="cat-label">{toTitleCase(product.category)}</p>
                      <div className="card-footer">
                        <div>
                          <span className="price">{formatCurrency(product.price)}</span>
                          <span className="stock">
                            Available: {product.available_stock ?? product.stock}{' '}
                            {(product.reserved_transfer_qty ?? 0) > 0 ? `(Res: ${product.reserved_transfer_qty})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      <aside className="order-sidebar">
        <div className="order-sidebar-header">
          <h2 className="sidebar-title">Current Order</h2>

          <div className="order-sidebar-actions">
            <button
              className="clear-all"
              style={{ background: '#e0f2fe', color: '#0284c7', borderColor: 'transparent' }}
              onClick={onViewHeld}
            >
              Held ({heldCount})
            </button>

            <button
              className="clear-all"
              onClick={() => {
                if (cart.length === 0) return;
                openConfirm({
                  title: 'Clear Cart',
                  message: 'Are you sure you want to clear all items from the cart?',
                  confirmAction: () => setCart([]),
                });
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <p className="item-count">{cart.length} items</p>

        <div className="cart-list">
          {cart.length === 0 ? (
            <div className="empty-cart-state" style={{ textAlign: 'center', padding: '40px 20px', color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={getImgSrc(cartIcon) || ''} alt="Cart" style={{ width: '60px', marginBottom: '15px', opacity: 0.4 }} />
              <h3 style={{ fontSize: '1rem', margin: '0' }}>Cart is empty</h3>
            </div>
          ) : (
            cart.map((item) => (
              <ScannedItemRow
                key={item.id}
                item={item}
                updateQty={updateQty}
                removeItem={(id) => setCart(cart.filter((i) => i.id !== id))}
              />
            ))
          )}
        </div>

        <SuggestedAddonsWidget 
          cart={cart} 
          allProducts={allProducts} 
          onAddToCart={addToCart} 
        />

        <div className="discount-card">
          <div className="discount-header">
            <h3>Discount / Compliance</h3>
            <p>Apply promotion or compliance discounts before payment.</p>
          </div>
          <div className="discount-input-row">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Enter discount code"
              className="discount-input"
            />
            <button
              type="button"
              className="discount-action-btn"
              onClick={validateDiscountCode}
              disabled={isDiscountValidating || !discountCode.trim()}
            >
              {isDiscountValidating ? 'Validating...' : 'Apply'}
            </button>
          </div>
          {discountError && <p className="discount-error">{discountError}</p>}
          {discountResult?.valid && (
            <div className="discount-summary">
              <span>{discountResult.discountType || 'Discount'}</span>
              <strong>{discountResult.discountPercent ? `${discountResult.discountPercent}% off` : 'Discount applied'}</strong>
              <button type="button" className="discount-clear" onClick={resetDiscount}>Clear</button>
            </div>
          )}
        </div>

        <div className="billing-summary">
          <div className="bill-row">
            <span>VATable Sales:</span>
            <span>{formatCurrency(taxBreakdown.vatableSales)}</span>
          </div>
          {taxBreakdown.isVatExempt && (
            <div className="bill-row">
              <span>VAT-Exempt Sales:</span>
              <span>{formatCurrency(taxBreakdown.vatExemptSales)}</span>
            </div>
          )}
          <div className="bill-row">
            <span>VAT (12%):</span>
            <span>{formatCurrency(taxBreakdown.vatAmount)}</span>
          </div>
          {discountResult?.valid && discountResult.discountPercent ? (
            <>
              {taxBreakdown.vatDeduction > 0 && (
                <div className="bill-row discount-row">
                  <span>VAT Discount/Deduction:</span>
                  <span>-{formatCurrency(taxBreakdown.vatDeduction)}</span>
                </div>
              )}
              <div className="bill-row discount-row">
                <span>Discount:</span>
                <span>-{formatCurrency(taxBreakdown.discountAmount)}</span>
              </div>
            </>
          ) : null}
          <hr />
          <div className="bill-row total">
            <span>Payable Total:</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
          <button
            className="pay-btn"
            onClick={handleProceedToPayment}
            disabled={cart.length === 0}
            style={{
              background: '#01a2ad',
              opacity: cart.length === 0 ? 0.5 : 1,
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              marginBottom: '10px'
            }}
          >
            Proceed to Payment
          </button>
          <button
            className="pay-btn secondary"
            onClick={onHoldCart}
            disabled={cart.length === 0}
          >
            Hold Order
          </button>
        </div>
      </aside>

      {confirmOpen && (
        <div className="confirm-overlay" onClick={closeConfirm}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">{confirmTitle}</h3>
            <p className="confirm-message">{confirmMessage}</p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={closeConfirm}>Cancel</button>
              <button className="confirm-btn confirm" onClick={() => { onConfirm(); closeConfirm(); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <StockAlert
        isOpen={stockAlert.isOpen}
        onClose={onCloseStockAlert}
        type={stockAlert.type}
        productName={stockAlert.productName}
        stock={stockAlert.stock}
        threshold={stockAlert.threshold}
        onHold={stockAlert.onHold}
      />

      {/* T1: Spinner keyframes for search and stock loading indicators */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
};

export default POSView;
