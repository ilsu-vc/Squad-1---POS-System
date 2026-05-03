'use client';

import React from 'react';
import { formatCurrency } from '../utils/numberformatters';
import './ReceiptStyles.css';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface SplitPaymentEntry {
  method: string;
  amount: number;
  refNo?: string;
  cardLast4?: string;
  mobileProvider?: string;
}

interface ItemizedReceiptProps {
  receiptNumber: string | null;
  transactionId: string | null;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discountAmount?: number;
  discountType?: string;
  total: number;
  paymentMethod?: string;
  splitPayments?: SplitPaymentEntry[];
  changeAmount?: number;
  customerName?: string;
  date?: string;
  time?: string;
  storeName?: string;
  storeAddress?: string;
  storeTin?: string;
  storePtin?: string;
  onPrint?: () => void;
  isPrinting?: boolean;
}

const ItemizedReceipt: React.FC<ItemizedReceiptProps> = ({
  receiptNumber,
  transactionId,
  items,
  subtotal,
  tax,
  discountAmount = 0,
  discountType,
  total,
  paymentMethod,
  splitPayments,
  changeAmount = 0,
  customerName,
  date,
  time,
  storeName = 'PharmaCare Drugstore',
  storeAddress = '123 Sample St., Brgy. Example, City, Philippines',
  storeTin = '000-000-000-000',
  storePtin = '12-345-678-901-001',
  onPrint,
  isPrinting = false,
}) => {
  const getPaymentMethodDisplay = (method: string): string => {
    if (method === 'mobile') return 'Mobile Wallet';
    if (method === 'card') return 'Card Payment';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const now = new Date();
  const displayDate = date || now.toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  const displayTime = time || now.toLocaleTimeString('en-PH', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="itemized-receipt">
      {/* Store Header */}
      <div className="receipt-header">
        <h2 className="store-name">{storeName}</h2>
        <p className="store-address">{storeAddress}</p>
        <p className="store-info">TIN: {storeTin}</p>
        <p className="store-info">PTIN: {storePtin}</p>
        <div className="receipt-divider" />
      </div>

      {/* Receipt Meta */}
      <div className="receipt-meta">
        <div className="meta-row">
          <span className="meta-label">Receipt #:</span>
          <span className="meta-value">{receiptNumber || 'N/A'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Transaction ID:</span>
          <span className="meta-value txn-id">{transactionId || 'N/A'}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Date:</span>
          <span className="meta-value">{displayDate}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Time:</span>
          <span className="meta-value">{displayTime}</span>
        </div>
        {customerName && (
          <div className="meta-row">
            <span className="meta-label">Customer:</span>
            <span className="meta-value">{customerName}</span>
          </div>
        )}
        <div className="receipt-divider" />
      </div>

      {/* Items */}
      <div className="receipt-items">
        <div className="items-header">
          <span className="col-item">Item</span>
          <span className="col-qty">Qty</span>
          <span className="col-price">Price</span>
          <span className="col-subtotal">Subtotal</span>
        </div>
        <div className="receipt-divider dashed" />

        {items.map((item, idx) => (
          <div key={idx} className="receipt-item-row">
            <div className="col-item">
              <span className="item-name">{item.name}</span>
              {item.category && <span className="item-category">{item.category}</span>}
            </div>
            <span className="col-qty">{item.quantity}</span>
            <span className="col-price">{formatCurrency(item.price)}</span>
            <span className="col-subtotal">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}

        <div className="receipt-divider dashed" />
      </div>

      {/* Summary */}
      <div className="receipt-summary">
        <div className="summary-row">
          <span className="summary-label">Subtotal (Vatable):</span>
          <span className="summary-value">{formatCurrency(subtotal)}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">VAT (12%):</span>
          <span className="summary-value">{formatCurrency(tax)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="summary-row discount">
            <span className="summary-label">
              Discount {discountType ? `(${discountType.toUpperCase()})` : ''}:
            </span>
            <span className="summary-value">−{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="receipt-divider" />

        <div className="summary-row total">
          <span className="summary-label">TOTAL AMOUNT DUE:</span>
          <span className="summary-value total-amount">{formatCurrency(total)}</span>
        </div>

        <div className="receipt-divider" />
      </div>

      {/* Payment Details */}
      <div className="payment-details">
        <p className="payment-label">Payment Method</p>
        {splitPayments && splitPayments.length > 1 ? (
          <div className="split-payment-list">
            {splitPayments.map((payment, idx) => (
              <div key={idx} className="split-payment-row">
                <span className="split-method">{getPaymentMethodDisplay(payment.method)}</span>
                <span className="split-amount">{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="single-payment">
            <p className="payment-method">{getPaymentMethodDisplay(paymentMethod || 'cash')}</p>
            {paymentMethod === 'card' && (
              <p className="payment-ref">Card Ref: ••••••••••••••••</p>
            )}
            {paymentMethod === 'mobile' && (
              <p className="payment-ref">Mobile Ref: [See QR Code]</p>
            )}
          </div>
        )}

        {changeAmount > 0 && (
          <div className="change-row">
            <span className="change-label">Change Due:</span>
            <span className="change-amount">{formatCurrency(changeAmount)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="receipt-footer">
        <div className="receipt-divider" />
        <p className="footer-text">Thank you for your purchase!</p>
        <p className="footer-text small">Please keep this receipt for your records.</p>
        <p className="footer-text small">BIR-Compliant Receipt - Official Record</p>
        <div className="receipt-divider" />
      </div>

      {/* Print Button */}
      {onPrint && (
        <div className="receipt-actions">
          <button
            className="print-receipt-btn"
            onClick={onPrint}
            disabled={isPrinting}
          >
            {isPrinting ? 'Printing...' : '🖨️ Print Receipt'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemizedReceipt;
