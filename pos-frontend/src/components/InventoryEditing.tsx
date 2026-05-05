import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import './InventoryEditing.css';

const InventoryEditing = ({
  isOpen,
  onClose,
  product,
  onUpdated,
}) => {
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [stockAmount, setStockAmount] = useState('');
  const [threshold, setThreshold] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentStock = Number(product?.stock) || 0;
  const currentThreshold = Number(product?.low_stock_threshold) || 0;

  useEffect(() => {
    if (product && isOpen) {
      setAdjustmentType('add');
      setStockAmount('');
      setThreshold(String(currentThreshold));
      setNotes('');
      setError('');
    }
  }, [product, isOpen, currentThreshold]);

  const parsedAmount = Number(stockAmount) || 0;
  const parsedThreshold = Number(threshold) || 0;

  const updatedStockPreview = useMemo(() => {
    if (adjustmentType === 'add') return currentStock + parsedAmount;
    return currentStock - parsedAmount;
  }, [adjustmentType, currentStock, parsedAmount]);

  const suggestedRestockAmount = useMemo(() => {
    return Math.max(
      0,
      Math.ceil((parsedThreshold - updatedStockPreview) + (parsedThreshold * 0.2))
    );
  }, [parsedThreshold, updatedStockPreview]);

  const isInvalid =
    !product ||
    parsedAmount < 0 ||
    parsedThreshold < 0 ||
    (adjustmentType === 'subtract' && updatedStockPreview < 0);

  const handleSave = async () => {
    if (!product) return;

    setError('');

    if (stockAmount === '' || Number.isNaN(Number(stockAmount))) {
      setError('Please enter a valid stock amount.');
      return;
    }

    if (threshold === '' || Number.isNaN(Number(threshold))) {
      setError('Please enter a valid stock threshold.');
      return;
    }

    if (parsedAmount < 0) {
      setError('Stock amount cannot be negative.');
      return;
    }

    if (parsedThreshold < 0) {
      setError('Threshold cannot be negative.');
      return;
    }

    if (adjustmentType === 'subtract' && updatedStockPreview < 0) {
      setError('Cannot subtract more than the current stock.');
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock: updatedStockPreview,
          low_stock_threshold: parsedThreshold,
        })
        .eq('id', product.id);

      if (updateError) throw updateError;
      if (typeof onUpdated === 'function') {
        await onUpdated();
      }

      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update inventory.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="modal-overlay">
      <div className="payment-modal inventory-edit-shell">
        <div className="payment-view-container">
          <div className="payment-layout">
            <div className="payment-main">
              <div className="view-header">
                <p className="section-label">Edit Inventory</p>
                <button className="change-method" onClick={onClose}>
                  Close
                </button>
              </div>

              <div className="essentials-section">
                <div className="input-group">
                  <label className="section-label-sm">Product</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={product.name || ''}
                    disabled
                  />
                </div>

                <div className="discount-section">
                  <label className="section-label-sm">Stock Adjustment</label>
                  <div className="discount-grid">
                    <button
                      className={`discount-btn ${adjustmentType === 'add' ? 'active' : ''}`}
                      onClick={() => setAdjustmentType('add')}
                    >
                      Add Stock
                    </button>
                    <button
                      className={`discount-btn ${adjustmentType === 'subtract' ? 'active' : ''}`}
                      onClick={() => setAdjustmentType('subtract')}
                    >
                      Subtract Stock
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="modern-label">Stock Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="modern-input-lg"
                    placeholder="0"
                    value={stockAmount}
                    onChange={(e) => setStockAmount(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="modern-label">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    className="modern-input-lg"
                    placeholder="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="modern-label">Notes (Optional)</label>
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="Reason for adjustment"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {error && <span className="error-text">{error}</span>}
              </div>
            </div>

            <div className="payment-sidebar">
              <div className="summary-card">
                <div className="summary-row">
                  <span>Current Stock:</span>
                  <span>{currentStock}</span>
                </div>
                <div className="summary-row">
                  <span>Current Threshold:</span>
                  <span>{currentThreshold}</span>
                </div>
                <div className="summary-row">
                  <span>Adjustment Type:</span>
                  <span>{adjustmentType === 'add' ? 'Add' : 'Subtract'}</span>
                </div>
                <div className="summary-row">
                  <span>Adjustment Amount:</span>
                  <span>{parsedAmount}</span>
                </div>
                <div className="summary-row">
                  <span>Suggested Restock:</span>
                  <span>{suggestedRestockAmount}</span>
                </div>
                <div className="summary-total">
                  <p className="section-label-sm">Updated Stock</p>
                  <h2>{updatedStockPreview}</h2>
                </div>
              </div>

              <div className="change-display">
                <p className="section-label-sm">Updated Threshold</p>
                <h2 style={{ fontSize: '2rem', margin: '5px 0' }}>
                  {parsedThreshold}
                </h2>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className={`complete-btn ${!isInvalid && !saving ? 'active' : ''}`}
              onClick={handleSave}
              disabled={isInvalid || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div> 
      </div>
    </div>
  );
};

export default InventoryEditing;