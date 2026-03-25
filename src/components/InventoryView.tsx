import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../utils/numberformatters';
import InventoryEditing from './InventoryEditing';
import medicineImg from '../assets/images/medicine.png';
import './InventoryView.css';

interface InventoryViewProps {
  products?: any[];
  onInventoryUpdated?: () => Promise<void> | void;
  canEdit: boolean;
}

const InventoryView: React.FC<InventoryViewProps> = ({
  products = [],
  onInventoryUpdated,
  canEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  const getThreshold = (product: any) => {
    const parsed = Number(product?.low_stock_threshold);
    return Number.isNaN(parsed) ? 50 : parsed;
  };

  const getStockStatus = (product: any) => {
    const stock = Number(product?.stock) || 0;
    const threshold = getThreshold(product);

    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  const getStatusClass = (product: any) => {
    const stock = Number(product?.stock) || 0;
    const threshold = getThreshold(product);

    if (stock === 0) return 'out-stock';
    if (stock <= threshold) return 'low-stock';
    return 'in-stock';
  };

  const getStatusOrder = (product: any) => {
    const stock = Number(product?.stock) || 0;
    const threshold = getThreshold(product);

    if (stock === 0) return 0;
    if (stock <= threshold) return 1;
    return 2;
  };

  const totalProducts = safeProducts.length;
  const totalStock = safeProducts.reduce(
    (sum, product) => sum + (Number(product?.stock) || 0),
    0
  );

  const lowStockProducts = safeProducts.filter((product) => {
    const stock = Number(product?.stock) || 0;
    const threshold = getThreshold(product);
    return stock > 0 && stock <= threshold;
  });

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        safeProducts
          .map((product) => product?.category?.trim())
          .filter((category) => category && category.toLowerCase() !== 'all')
      ),
    ];
    return ['All', ...uniqueCategories];
  }, [safeProducts]);

  const filteredProducts = useMemo(() => {
    return safeProducts
      .filter((product) => {
        const name = product?.name?.toLowerCase() || '';
        const category = product?.category?.trim() || '';

        const matchesSearch = name.includes(searchQuery.toLowerCase());
        const matchesCategory =
          activeCategory === 'All' || category === activeCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const statusDiff = getStatusOrder(a) - getStatusOrder(b);
        if (statusDiff !== 0) return statusDiff;
        return (a?.name || '').localeCompare(b?.name || '');
      });
  }, [safeProducts, searchQuery, activeCategory]);

  const openEditModal = (product: any) => {
    setSelectedProduct(product);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setSelectedProduct(null);
    setIsEditOpen(false);
  };

  return (
    <div className="inventory-view">
      <div className="view-inner-container">
        <h2 className="view-title">Inventory</h2>

        <div className="history-stats-row">
          <div className="h-stat-card">
            <p className="h-stat-label">Total Products</p>
            <h2 className="h-stat-value">{totalProducts}</h2>
          </div>

          <div className="h-stat-card">
            <p className="h-stat-label">Total Stock Units</p>
            <h2 className="h-stat-value">{totalStock}</h2>
          </div>

          <div className="h-stat-card">
            <p className="h-stat-label">Low Stock Items</p>
            <h2 className="h-stat-value">{lowStockProducts.length}</h2>
          </div>
        </div>

        <div className="search-box">
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

        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stock = Number(product?.stock) || 0;
                  const threshold = getThreshold(product);
                  const status = getStockStatus(product);
                  const statusClass = getStatusClass(product);

                  return (
                    <tr key={product.id}>
                      <td>
                        <img
                          src={product?.image || medicineImg.src}
                          alt={product?.name || 'Product'}
                          className="inventory-product-img"
                        />
                      </td>
                      <td>{product?.name || '-'}</td>
                      <td>{product?.category || '-'}</td>
                      <td>{formatCurrency(Number(product?.price) || 0)}</td>
                      <td>{stock}</td>
                      <td>{threshold}</td>
                      <td className={`status-cell ${statusClass}`}>
                        <span className={`stock-badge ${statusClass}`}>{status}</span>
                      </td>
                      <td>
                        {canEdit ? (
                          <button
                            className="inventory-edit-btn"
                            onClick={() => openEditModal(product)}
                          >
                            Edit
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InventoryEditing
        isOpen={isEditOpen}
        onClose={closeEditModal}
        product={selectedProduct}
        onUpdated={onInventoryUpdated}
      />
    </div>
  );
};

export default InventoryView;