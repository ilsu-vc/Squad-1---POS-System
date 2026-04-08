'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/numberformatters';

export interface PaymentEntry {
  id: number;
  method: 'cash' | 'card' | 'mobile' | '';
  amount: string;
  refNo: string;
  cardLast4: string;
  mobileProvider: string;
}

interface PaymentIcons {
  cash_icon: any;
  card_icon: any;
  mobile_icon: any;
}

interface SplitPaymentFormProps {
  finalTotal: number;
  icons: PaymentIcons;
  onComplete: (entries: PaymentEntry[]) => void;
  onCancel: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const getImgSrc = (img: any): string =>
  typeof img === 'string' ? img : img?.src ?? '';

const createEntry = (id: number): PaymentEntry => ({
  id,
  method: '',
  amount: '',
  refNo: '',
  cardLast4: '',
  mobileProvider: 'GCash',
});

const SplitPaymentForm: React.FC<SplitPaymentFormProps> = ({
  finalTotal,
  icons,
  onComplete,
  onCancel,
  onBack,
  isSubmitting = false,
}) => {
  const [entries, setEntries] = useState<PaymentEntry[]>([
    createEntry(1),
    createEntry(2),
  ]);

  // Sum of amounts entered so far
  const totalEntered = entries.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );
  const remaining = Math.max(0, finalTotal - totalEntered);
  const overpaid = Math.max(0, totalEntered - finalTotal);

  // Change = sum of (cash tendered - its allocated amount), capped at 0
  const cashChange = entries.reduce((sum, e) => {
    if (e.method !== 'cash') return sum;
    const tendered = parseFloat(e.amount) || 0;
    return sum + tendered;
  }, 0) - (entries.filter(e => e.method === 'cash').length > 0 ? Math.min(totalEntered, finalTotal) : 0);

  const exactChange = Math.max(0, cashChange);

  const updateEntry = (id: number, field: keyof PaymentEntry, value: string) => {
    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const addEntry = () => {
    if (entries.length >= 3) return;
    setEntries(prev => [...prev, createEntry(Date.now())]);
  };

  const removeEntry = (id: number) => {
    if (entries.length <= 2) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const isEntryValid = (e: PaymentEntry): boolean => {
    if (!e.method || !(parseFloat(e.amount) > 0)) return false;
    if (e.method === 'card') return e.refNo.trim() !== '' && e.cardLast4.length === 4;
    if (e.method === 'mobile') return e.refNo.trim() !== '';
    return true; // cash
  };

  const allValid =
    entries.every(isEntryValid) &&
    Math.abs(totalEntered - finalTotal) < 0.01;

  const handleComplete = () => {
    if (!allValid) return;
    onComplete(entries);
  };

  return (
    <div className="split-payment-container">
      {/* Balance Bar */}
      <div className="split-balance-bar">
        <div className="split-balance-item">
          <span className="split-balance-label">Total</span>
          <span className="split-balance-value">{formatCurrency(finalTotal)}</span>
        </div>
        <div className="split-balance-item">
          <span className="split-balance-label">Paid</span>
          <span className="split-balance-value paid">{formatCurrency(totalEntered)}</span>
        </div>
        <div className="split-balance-item">
          <span className="split-balance-label">{remaining > 0 ? 'Remaining' : 'Change Due'}</span>
          <span className={`split-balance-value ${remaining > 0 ? 'remaining' : 'change'}`}>
            {remaining > 0 ? formatCurrency(remaining) : formatCurrency(exactChange)}
          </span>
        </div>
      </div>

      {/* Payment Entries */}
      <div className="split-entries-list">
        {entries.map((entry, index) => (
          <div key={entry.id} className="split-entry-card">
            <div className="split-entry-header">
              <span className="split-entry-label">Payment {index + 1}</span>
              {entries.length > 2 && (
                <button
                  className="split-remove-btn"
                  onClick={() => removeEntry(entry.id)}
                  title="Remove this entry"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Method Selector */}
            <div className="split-method-row">
              {(['cash', 'card', 'mobile'] as const).map(method => (
                <button
                  key={method}
                  className={`split-method-btn ${entry.method === method ? 'selected' : ''}`}
                  onClick={() => updateEntry(entry.id, 'method', method)}
                >
                  <img
                    src={getImgSrc(
                      method === 'cash'
                        ? icons.cash_icon
                        : method === 'card'
                        ? icons.card_icon
                        : icons.mobile_icon
                    )}
                    alt=""
                    className="split-method-icon"
                  />
                  <span>{method.charAt(0).toUpperCase() + method.slice(1)}</span>
                </button>
              ))}
            </div>

            {/* Amount Field */}
            {entry.method && (
              <div className="split-amount-row">
                <div className="split-input-group">
                  <label className="split-input-label">Amount</label>
                  <div className="split-amount-input-wrapper">
                    <span className="split-peso-sign">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      className="split-amount-input"
                      placeholder="0.00"
                      value={entry.amount}
                      onChange={e => updateEntry(entry.id, 'amount', e.target.value)}
                    />
                    {remaining > 0.001 && (
                      <button
                        className="split-fill-btn"
                        onClick={() =>
                          updateEntry(entry.id, 'amount', remaining.toFixed(2))
                        }
                        title="Fill remaining balance"
                      >
                        Fill ₱{remaining.toFixed(2)}
                      </button>
                    )}
                  </div>
                </div>

                {/* Card-specific fields */}
                {entry.method === 'card' && (
                  <div className="split-extra-fields">
                    <div className="split-input-group" style={{ flex: 1 }}>
                      <label className="split-input-label">Reference #</label>
                      <input
                        type="text"
                        className="split-text-input"
                        placeholder="Ref #"
                        value={entry.refNo}
                        onChange={e => updateEntry(entry.id, 'refNo', e.target.value)}
                      />
                    </div>
                    <div className="split-input-group" style={{ width: 100 }}>
                      <label className="split-input-label">Last 4 Digits</label>
                      <input
                        type="text"
                        className="split-text-input"
                        placeholder="0000"
                        maxLength={4}
                        value={entry.cardLast4}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 4) updateEntry(entry.id, 'cardLast4', val);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Mobile-specific fields */}
                {entry.method === 'mobile' && (
                  <div className="split-extra-fields">
                    <div className="split-input-group" style={{ flex: 1 }}>
                      <label className="split-input-label">Provider</label>
                      <div className="split-provider-row">
                        {['GCash', 'Maya'].map(p => (
                          <button
                            key={p}
                            className={`split-provider-btn ${entry.mobileProvider === p ? 'selected' : ''}`}
                            onClick={() => updateEntry(entry.id, 'mobileProvider', p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="split-input-group" style={{ flex: 1 }}>
                      <label className="split-input-label">Reference #</label>
                      <input
                        type="text"
                        className="split-text-input"
                        placeholder="Ref #"
                        value={entry.refNo}
                        onChange={e => updateEntry(entry.id, 'refNo', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Entry */}
      {entries.length < 3 && (
        <button className="split-add-btn" onClick={addEntry}>
          + Add payment method
        </button>
      )}

      {/* Validation hint */}
      {entries.every(e => e.method && parseFloat(e.amount) > 0) &&
        Math.abs(totalEntered - finalTotal) > 0.01 && (
          <p className="split-error-text">
            {totalEntered < finalTotal
              ? `Still need ${formatCurrency(remaining)} more to complete payment.`
              : `Overpaid by ${formatCurrency(overpaid)}. Adjust amounts.`}
          </p>
        )}

      {/* Actions */}
      <div className="split-actions">
        <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button className="change-method" onClick={onBack} style={{ marginLeft: 8 }}>← Back</button>
        <button
          className={`complete-btn ${allValid ? 'active' : ''}`}
          disabled={!allValid || isSubmitting}
          onClick={handleComplete}
        >
          Complete Split Payment
        </button>
      </div>
    </div>
  );
};

export default SplitPaymentForm;
