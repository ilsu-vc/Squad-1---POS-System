'use client';

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

const RESERVED_TRANSFER_STATUSES = ['Pending', 'Approved', 'In-Transit'];

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

  const getOnHold = (product: any) => {
    if (Array.isArray(product?.transfer_requests)) {
      return product.transfer_requests
        .filter((req: any) =>
          RESERVED_TRANSFER_STATUSES.includes(req?.transfer_status)
        )
        .reduce((sum: number, req: any) => sum + (Number(req?.quantity_transfer) || 0), 0);
    }

    if (typeof product?.reserved_transfer_qty !== 'undefined') {
      return Number(product.reserved_transfer_qty) || 0;
    }

    return 0;
  };

  const getAvailableStock = (product: any) => {
    const stock = Number(product?.stock) || 0;
    const onHold = getOnHold(product);
    return Math.max(0, stock - onHold);
  };

  const getStockStatus = (product: any) => {
    const availableStock = getAvailableStock(product);
    const threshold = getThreshold(product);

    if (availableStock === 0) return 'Out of Stock';
    if (availableStock <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  const getStatusClass = (product: any) => {
    const availableStock = getAvailableStock(product);
    const threshold = getThreshold(product);

    if (availableStock === 0) return 'out-stock';
    if (availableStock <= threshold) return 'low-stock';
    return 'in-stock';
  };

  const getStatusOrder = (product: any) => {
    const availableStock = getAvailableStock(product);
    const threshold = getThreshold(product);

    if (availableStock === 0) return 0;
    if (availableStock <= threshold) return 1;
    return 2;
  };

  const totalProducts = safeProducts.length;
  const totalStock = safeProducts.reduce(
    (sum, product) => sum + (Number(product?.stock) || 0),
    0
  );

  const totalOnHold = safeProducts.reduce(
    (sum, product) => sum + getOnHold(product),
    0
  );

  const lowStockProducts = safeProducts.filter((product) => {
    const availableStock = getAvailableStock(product);
    const threshold = getThreshold(product);
    return availableStock > 0 && availableStock <= threshold;
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
    <div className="inventory-view inventory-rise-up">
      <div className="inventory-shell">
        <div className="inventory-topbar">
          <div>
            <p className="inventory-eyebrow">INVENTORY</p>
            <h2 className="inventory-title">Inventory</h2>
          </div>
        </div>

        <div className="inventory-stats-grid">
          <div className="inventory-stat-card inventory-surface inventory-interactive">
            <p className="inventory-stat-label">Total Products</p>
            <h2 className="inventory-stat-value">{totalProducts}</h2>
          </div>

          <div className="inventory-stat-card inventory-surface inventory-interactive">
            <p className="inventory-stat-label">Total Stock Units</p>
            <h2 className="inventory-stat-value">{totalStock}</h2>
          </div>

          <div className="inventory-stat-card inventory-surface inventory-interactive">
            <p className="inventory-stat-label">Total On Hold</p>
            <h2 className="inventory-stat-value">{totalOnHold}</h2>
          </div>

          <div className="inventory-stat-card inventory-surface inventory-interactive">
            <p className="inventory-stat-label">Low Stock Items</p>
            <h2 className="inventory-stat-value">{lowStockProducts.length}</h2>
          </div>
        </div>

        <div className="inventory-toolbar inventory-surface">
          <div className="inventory-search-wrap">
            <input
              type="text"
              className="inventory-search-input"
              placeholder="Search products by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="inventory-category-bar">
            {categories.map((cat) => (
              <button
                key={cat}
                className={activeCategory === cat ? 'inventory-cat-btn active' : 'inventory-cat-btn'}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="inventory-table-card inventory-surface">
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Total Stock</th>
                  <th>On Hold</th>
                  <th>Available</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="inventory-empty-cell">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const stock = Number(product?.stock) || 0;
                    const onHold = getOnHold(product);
                    const availableStock = getAvailableStock(product);
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
                        <td className="inventory-product-name">{product?.name || '-'}</td>
                        <td>{product?.category || '-'}</td>
                        <td>{formatCurrency(Number(product?.price) || 0)}</td>
                        <td>{stock}</td>
                        <td>{onHold}</td>
                        <td>{availableStock}</td>
                        <td>{threshold}</td>
                        <td>
                          <span className={`inventory-stock-badge ${statusClass}`}>
                            {status}
                          </span>
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
                            <span className="inventory-action-placeholder">-</span>
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