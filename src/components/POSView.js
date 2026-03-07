import React, { useState } from 'react';
import searchIcon from '../assets/images/search_icon.png';
import deleteIcon from '../assets/images/delete_icon.png';
import cartIcon from '../assets/images/cart.png'; // Added cart icon import

// Number format utility
import { formatCurrency } from '../utils/numberformatters.js';

const POSView = ({
  cart,
  setCart,
  filteredProducts,
  searchQuery,
  setSearchQuery,
  categories,
  activeCategory,
  setActiveCategory,
  addToCart,
  updateQty,
  subtotal,
  tax,
  total,
  handleProceedToPayment,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('Confirm');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirm, setOnConfirm] = useState(() => () => {});

  const openConfirm = ({ title, message, confirmAction }) => {
    setConfirmTitle(title || 'Confirm');
    setConfirmMessage(message || 'Are you sure?');
    setOnConfirm(() => confirmAction);
    setConfirmOpen(true);
  };

  const closeConfirm = () => setConfirmOpen(false);

  return (
    <main className="pos-content">

      {/* ── Product Inventory Panel ── */}
      <div className="inventory-section">
        <div className="search-box">
          <img src={searchIcon} alt="" className="search-icon-img" />
          <input
            type="text"
            className="modern-input"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={activeCategory === cat ? 'cat-btn active' : 'cat-btn'}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => addToCart(product)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <div className="img-container">
                <img src={product.image} alt={product.name} />
              </div>
              <h3 className="product-name">{product.name}</h3>
              <p className="cat-label">{product.category}</p>
              <div className="card-footer">
                <div>
                  <span className="price">{formatCurrency(product.price)}</span>
                  <span className="stock">Stock: {product.stock}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Order Sidebar ── */}
      <aside className="order-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Current Order</h2>
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
            Clear All
          </button>
        </div>

        <p className="item-count">{cart.length} items</p>

        <div className="cart-list">
          {cart.length === 0 ? (
            /* ── Empty Cart View ── */
            <div className="empty-cart-state" style={{ 
              textAlign: 'center', 
              padding: '40px 20px', 
              color: '#888',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <img 
                src={cartIcon} 
                alt="Cart is empty" 
                style={{ width: '80px', marginBottom: '15px', opacity: 0.6 }} 
              />
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 5px 0' }}>Cart is empty</h3>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Add items to get started</p>
            </div>
          ) : (
            /* ── Active Cart Items ── */
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-details">
                  <h4 className="cart-item-name">{item.name}</h4>
                  <p className="item-price-each">{formatCurrency(item.price)} each</p>
                  <div className="qty-controls">
                    <button onClick={() => updateQty(item.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                </div>
                <div className="item-total-section">
                  <button
                    className="delete-item"
                    onClick={() => {
                      openConfirm({
                        title: 'Remove Item',
                        message: `Remove "${item.name}" from the cart?`,
                        confirmAction: () => setCart(cart.filter((i) => i.id !== item.id)),
                      });
                    }}
                  >
                    <img src={deleteIcon} alt="Delete" />
                  </button>
                  <p className="item-total">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="billing-summary">
          <div className="bill-row">
            <span>Subtotal:</span>
            <span id="display-subtotal">{formatCurrency(subtotal)}</span>
          </div>
          <div className="bill-row">
            <span>Tax (12%):</span>
            <span id="display-vat">{formatCurrency(tax)}</span>
          </div>
          <hr />
          <div className="bill-row total">
            <span>Total:</span>
            <span id="display-grand-total">{formatCurrency(total)}</span>
          </div>
          <button 
            className="pay-btn" 
            onClick={handleProceedToPayment}
            disabled={cart.length === 0}
            style={{ opacity: cart.length === 0 ? 0.5 : 1, cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            Proceed to Payment
          </button>
        </div>
      </aside>

      {/* ── Confirmation Popup Modal ── */}
      {confirmOpen && (
        <div className="confirm-overlay" onClick={closeConfirm}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">{confirmTitle}</h3>
            <p className="confirm-message">{confirmMessage}</p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={closeConfirm}>
                Cancel
              </button>
              <button
                className="confirm-btn confirm"
                onClick={() => {
                  onConfirm();
                  closeConfirm();
                }}
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
};

export default POSView;
