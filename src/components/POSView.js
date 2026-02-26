import React from 'react';
import searchIcon from '../assets/images/search_icon.png';
import deleteIcon  from '../assets/images/delete_icon.png';

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
}) => (
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
          <div key={product.id} className="product-card">
            <div className="img-container">
              <img src={product.image} alt={product.name} />
            </div>
            <h3 className="product-name">{product.name}</h3>
            <p className="cat-label">{product.category}</p>
            <div className="card-footer">
              <div>
                <span className="price">₱{product.price.toFixed(2)}</span>
                <span className="stock">Stock: {product.stock}</span>
              </div>
              <button className="add-btn" onClick={() => addToCart(product)}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ── Order Sidebar ── */}
    <aside className="order-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Current Order</h2>
        <button className="clear-all" onClick={() => setCart([])}>Clear All</button>
      </div>

      <p className="item-count">{cart.length} items</p>

      <div className="cart-list">
        {cart.map((item) => (
          <div key={item.id} className="cart-item">
            <div className="item-details">
              <h4 className="cart-item-name">{item.name}</h4>
              <p className="item-price-each">₱{item.price.toFixed(2)} each</p>
              <div className="qty-controls">
                <button onClick={() => updateQty(item.id, -1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.id, 1)}>+</button>
              </div>
            </div>
            <div className="item-total-section">
              <button
                className="delete-item"
                onClick={() => setCart(cart.filter((i) => i.id !== item.id))}
              >
                <img src={deleteIcon} alt="Delete" />
              </button>
              <p className="item-total">₱{(item.price * item.quantity).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="billing-summary">
        <div className="bill-row">
          <span>Subtotal:</span>
          <span id="display-subtotal">₱{subtotal.toFixed(2)}</span>
        </div>
        <div className="bill-row">
          <span>Tax (12%):</span>
          <span id="display-vat">₱{tax.toFixed(2)}</span>
        </div>
        <hr />
        <div className="bill-row total">
          <span>Total:</span>
          <span id="display-grand-total">₱{total.toFixed(2)}</span>
        </div>
        <button className="pay-btn" onClick={handleProceedToPayment}>
          Proceed to Payment
        </button>
      </div>
    </aside>

  </main>
);

export default POSView;
