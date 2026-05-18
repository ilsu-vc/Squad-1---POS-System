'use client';

import React from 'react';
import { formatCurrency } from '../utils/numberformatters';
import { calculateTaxDiscountBreakdown, TaxDiscountBreakdown } from '../utils/vatCalculator';
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
  taxBreakdown?: TaxDiscountBreakdown;
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
  isReprint?: boolean;
  orFields?: {
    name: string;
    tin: string;
    address: string;
  };
}

const ItemizedReceipt: React.FC<ItemizedReceiptProps> = ({
  receiptNumber,
  transactionId,
  items,
  subtotal,
  tax,
  discountAmount = 0,
  discountType,
  taxBreakdown,
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
  isReprint = false,
  orFields,
}) => {
  const formatReceiptDate = (value?: string): string => {
    const parsed = value ? new Date(value) : new Date();
    if (Number.isNaN(parsed.getTime())) return value || '';

    return parsed.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatReceiptTime = (value?: string): string => {
    const parsed = value ? new Date(`January 1, 2000 ${value}`) : new Date();
    if (Number.isNaN(parsed.getTime())) return value || '';

    return parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getPaymentMethodDisplay = (method: string): string => {
    if (method === 'mobile') return 'Mobile Wallet';
    if (method === 'card') return 'Card Payment';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const receiptTaxBreakdown = taxBreakdown || calculateTaxDiscountBreakdown({
    subtotal,
    vat: tax,
    discountType,
    discountAmount,
  });
  const displayDate = formatReceiptDate(date);
  const displayTime = formatReceiptTime(time);

  return (
    <div className={`itemized-receipt${isReprint ? ' reprint-receipt' : ''}`}>
      {isReprint && <div className="receipt-reprint-watermark">REPRINT</div>}

      {/* Store Header */}
      <div className="receipt-header">
        {isReprint ? (
          <h3 className="receipt-type-label" style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>*** REPRINT ***</h3>
        ) : orFields ? (
          <h3 className="receipt-type-label" style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>OFFICIAL RECEIPT</h3>
        ) : null}
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

        {orFields && (
          <>
            <div className="or-details-section" style={{ fontSize: '11px', margin: '4px 0', padding: '2px 0' }}>
              <div className="meta-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span className="meta-label">Name:</span>
                <span className="meta-value" style={{ fontWeight: 'bold' }}>{orFields.name}</span>
              </div>
              <div className="meta-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span className="meta-label">TIN:</span>
                <span className="meta-value" style={{ fontWeight: 'bold' }}>{orFields.tin}</span>
              </div>
              <div className="meta-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span className="meta-label">Address:</span>
                <span className="meta-value" style={{ fontWeight: 'bold' }}>{orFields.address}</span>
              </div>
            </div>
            <div className="receipt-divider dashed" />
          </>
        )}
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
          <span className="summary-label">VATable Sales:</span>
          <span className="summary-value">{formatCurrency(receiptTaxBreakdown.vatableSales)}</span>
        </div>
        {receiptTaxBreakdown.isVatExempt && (
          <div className="summary-row">
            <span className="summary-label">VAT-Exempt Sales:</span>
            <span className="summary-value">{formatCurrency(receiptTaxBreakdown.vatExemptSales)}</span>
          </div>
        )}
        <div className="summary-row">
          <span className="summary-label">VAT (12%):</span>
          <span className="summary-value">{formatCurrency(receiptTaxBreakdown.vatAmount)}</span>
        </div>

        {receiptTaxBreakdown.vatDeduction > 0 && (
          <div className="summary-row discount">
            <span className="summary-label">VAT Discount/Deduction:</span>
            <span className="summary-value">-{formatCurrency(receiptTaxBreakdown.vatDeduction)}</span>
          </div>
        )}

        {receiptTaxBreakdown.discountAmount > 0 && (
          <div className="summary-row discount">
            <span className="summary-label">
              Discount {discountType ? `(${discountType.toUpperCase()})` : ''}:
            </span>
            <span className="summary-value">-{formatCurrency(receiptTaxBreakdown.discountAmount)}</span>
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
        <p className="footer-text small">THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP</p>
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
            {isPrinting ? 'Printing...' : '🖨 Print Receipt'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemizedReceipt;
