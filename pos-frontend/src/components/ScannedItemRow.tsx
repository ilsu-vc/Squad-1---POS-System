import React from 'react';
import { formatCurrency } from '../utils/numberformatters';

interface CartItemShape {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface ScannedItemRowProps {
  item: CartItemShape;
  updateQty: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
}

const ScannedItemRow: React.FC<ScannedItemRowProps> = ({ item, updateQty, removeItem }) => {
  return (
    <div className="scanned-item-row">
      <div className="scanned-item-meta">
        <div className="scanned-item-name">{item.name}</div>
        <div className="scanned-item-detail">{item.category} · {formatCurrency(item.price)} each</div>
      </div>

      <div className="scanned-item-controls">
        <div className="qty-control">
          <button type="button" onClick={() => updateQty(item.id, -1)} aria-label="Decrease quantity">-</button>
          <span>{item.quantity}</span>
          <button type="button" onClick={() => updateQty(item.id, 1)} aria-label="Increase quantity">+</button>
        </div>
        <div className="scanned-item-total">{formatCurrency(item.price * item.quantity)}</div>
        <button type="button" className="remove-line-item" onClick={() => removeItem(item.id)} aria-label="Remove item">×</button>
      </div>
    </div>
  );
};

export default ScannedItemRow;
