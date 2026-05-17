import React from 'react';
import './StockAlert.css';

type StockAlertProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'no-stock' | 'low-stock';
  productName: string;
  stock: number;
  threshold: number;
  onHold?: number;
};

const StockAlert = ({
  isOpen,
  onClose,
  type,
  productName,
  stock,
  threshold,
  onHold = 0,
}: StockAlertProps) => {
  if (!isOpen) return null;

  const isNoStock = type === 'no-stock';

  const currentStock = Number(stock) || 0;
  const currentThreshold = Number(threshold) || 0;
  const currentOnHold = Number(onHold) || 0;

  const suggestedRestockAmount = Math.max(
    0,
    Math.ceil((currentThreshold - currentStock) + (currentThreshold * 0.2))
  );

  return (
    <div className="modal-overlay">
      <div className={`payment-modal stock-alert-shell ${isNoStock ? 'no-stock' : 'low-stock'}`}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {isNoStock ? 'Out of Stock' : 'Low Stock Alert'}
            </h2>
            <p className="txn-id-line">
              <span className="txn-id-label">Product:</span>{' '}
              <span className="txn-id-value">{productName}</span>
            </p>
          </div>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        <div className={`stock-alert-status-banner ${isNoStock ? 'no-stock' : 'low-stock'}`}>
          <p className="stock-alert-status-label">
            {isNoStock ? 'Cannot Add to Cart' : 'Added to Cart but with Warning'}
          </p>
          <h1 className="stock-alert-status-text">
            {isNoStock ? 'No Stock' : 'Low Stock'}
          </h1>
        </div>

        <div className="stock-alert-body">
          <div className="stock-alert-info-row">
            <span>Current Stock</span>
            <strong>{currentStock}</strong>
          </div>

          <div className="stock-alert-info-row">
            <span>On Hold / Reserved</span>
            <strong>{currentOnHold}</strong>
          </div>

          <div className="stock-alert-info-row">
            <span>Threshold</span>
            <strong>{currentThreshold}</strong>
          </div>

          <div className="stock-alert-info-row">
            <span>Suggested Restock</span>
            <strong>{suggestedRestockAmount}</strong>
          </div>

          <p className="stock-alert-text">
            {isNoStock
              ? 'This product has no remaining sellable stock, so it was not added to the cart.'
              : 'This product is at or below its low stock threshold.'}
          </p>

          <div className="stock-alert-actions">
            <button
              className={`stock-alert-ok-btn ${isNoStock ? 'no-stock' : 'low-stock'}`}
              onClick={onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAlert;