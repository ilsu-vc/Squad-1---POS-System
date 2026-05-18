'use client';

import React from 'react';
import { getMethodPillClass } from '../utils/paymentHelpers';
import { Transaction } from '../utils/chartHelpers';
import searchIcon from '../assets/images/search_icon.png';

// Number format utility
import { formatCurrency } from '../utils/numberformatters';
import CustomDatePicker from './CustomDatePicker';
import './HistoryView.css';

interface HistoryViewProps {
  transactions: Transaction[];
  historySearch: string;
  setHistorySearch: (value: string) => void;
  expandedTxn: string | null;
  toggleHistoryItem: (id: string) => void;
  setIsReprintModalOpen: (value: boolean) => void;
  onPartialRefund: (txn: Transaction) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  historySearch,
  setHistorySearch,
  expandedTxn,
  toggleHistoryItem,
  setIsReprintModalOpen,
  onPartialRefund,
}) => {
  const [dateFilter, setDateFilter] = React.useState('');

  const totalRevenue = transactions.reduce((acc, curr) => acc + curr.rawAmount, 0);
  const avgTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const filtered = transactions.filter(
    (t) => {
      const matchesSearch = 
        t.id.toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.receiptNumber &&
          String(t.receiptNumber).toLowerCase().includes(historySearch.toLowerCase())) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(historySearch.toLowerCase())));
      
      const matchesDate = !dateFilter || t.date === new Date(dateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      return matchesSearch && matchesDate;
    }
  );

  return (
    <div className="history-view history-rise-up">
      <div className="history-shell">
        {/* ── Header ── */}
        <div className="history-topbar">
          <div className="history-header-block">
            <p className="history-eyebrow">POS RECORDS</p>
            <h2 className="history-header-title">Transaction History</h2>
          </div>

          <button
            className="history-action-btn"
            onClick={() => setIsReprintModalOpen(true)}
          >
            🖨 Reprint Receipt
          </button>
        </div>

        {/* ── Search ── */}
        <div className="history-toolbar">
          <div className="history-search-container">
            <img
              src={typeof searchIcon === 'string' ? searchIcon : (searchIcon as any).src}
              alt=""
              className="search-icon-img"
            />
            <input
              type="text"
              className="history-modern-input"
              /* UPDATED PLACEHOLDER TO MATCH IMAGE */
              placeholder="Search transactions..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>

          <div className="history-filter-date">
            <CustomDatePicker 
              value={dateFilter} 
              onChange={setDateFilter}
              placeholder="All Dates"
            />
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="history-stats-grid">
          <div className="history-stat-card history-surface history-interactive-surface">
            <div className="history-stat-info">
              <h3>Total Transactions</h3>
              <p className="history-stat-value">{transactions.length}</p>
              <p className="history-stat-subtext">All recorded orders</p>
            </div>
          </div>

          <div className="history-stat-card history-surface history-interactive-surface">
            <div className="history-stat-info">
              <h3>Total Revenue</h3>
              <p className="history-stat-value">{formatCurrency(totalRevenue)}</p>
              <p className="history-stat-subtext positive">↗ Recorded sales</p>
            </div>
          </div>

          <div className="history-stat-card history-surface history-interactive-surface">
            <div className="history-stat-info">
              <h3>Average Transaction</h3>
              <p className="history-stat-value">{formatCurrency(avgTransaction)}</p>
              <p className="history-stat-subtext">Per order value</p>
            </div>
          </div>
        </div>

        {/* ── Transaction Accordion List ── */}
        <div className="history-list-card history-surface">
          <div className="history-card-head">
            <h3 className="history-card-title">Transactions</h3>
          </div>

          <div className="history-scroll-area">
            <div className="history-accordion">
              {filtered.length === 0 ? (
                <div className="history-empty-state">
                  <h3>No transactions found</h3>
                  <p>Try a different transaction ID, receipt number, or tag.</p>
                </div>
              ) : (
                filtered.map((txn) => (
                  <div
                    key={txn.id}
                    className={`history-card ${expandedTxn === txn.id ? 'expanded' : ''}`}
                  >
                    <button
                      type="button"
                      className="history-card-header"
                      onClick={() => toggleHistoryItem(txn.id)}
                    >
                      <div className="history-header-left">
                        <div className="history-id-badge-row">
                          <span className="history-txn-id-text">{txn.id}</span>

                          {txn.receiptNumber && (
                            <span className="history-receipt-no-badge">
                              OR: {txn.receiptNumber}
                            </span>
                          )}

                          {txn.type === 'refund' ? (
                            <span className="history-refund-badge">REFUND</span>
                          ) : (
                            <span
                              className={`history-method-pill ${getMethodPillClass(txn.method)}`}
                            >
                              {txn.cashierName?.toLowerCase() === 'ecommerce' ? 'Online Order' : txn.method}
                            </span>
                          )}
                        </div>

                        <p className="history-txn-meta-text">
                          {txn.date}, {txn.time} • {txn.itemsCount} items
                        </p>
                      </div>

                      <div className="history-header-right">
                        <span className="history-txn-total-text">{txn.amount}</span>
                        <span
                          className={`history-chevron-icon ${
                            expandedTxn === txn.id ? 'open' : ''
                          }`}
                        >
                          ⌵
                        </span>
                      </div>
                    </button>

                    {expandedTxn === txn.id && (
                      <div className="history-card-body">
                        <p className="history-body-section-title">Items</p>

                        <div className="history-items-list">
                          {txn.items.map((item, idx) => (
                            <div key={idx} className="history-item-detail-row">
                              <div className="history-item-info">
                                <p className="history-item-name-text">{item.name}</p>
                                <p className="history-item-calc-text">
                                  {formatCurrency(item.price)} × {item.qty}
                                </p>
                              </div>
                              <p className="history-item-price-sum">
                                {formatCurrency(item.price * item.qty)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {txn.notes && (
                          <div className="history-section">
                            <p className="history-body-section-title">Notes</p>
                            <p className="history-note-box">{txn.notes}</p>
                          </div>
                        )}

                        {txn.tags && txn.tags.length > 0 && (
                          <div className="history-section">
                            <p className="history-body-section-title">Tags</p>
                            <div className="history-tags-wrap">
                              {txn.tags.map((tag, idx) => (
                                <span key={idx} className="history-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {txn.type === 'refund' && txn.originalTransactionId && (
                          <div className="history-section">
                            <p className="history-body-section-title">Refund Reference</p>
                            <p className="history-refund-reference-text">
                              Original Transaction: {txn.originalTransactionId}
                            </p>
                          </div>
                        )}

                        <div className="history-financial-summary">
                          <div className="history-f-row">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(txn.subtotal ?? 0)}</span>
                          </div>

                          <div className="history-f-row">
                            <span>Tax:</span>
                            <span>{formatCurrency(txn.tax ?? 0)}</span>
                          </div>

                          {Number(txn.discountAmount) > 0 && (
                            <div className="history-f-row history-f-discount">
                              <span>
                                Discount
                                {txn.discountType && txn.discountType !== 'None'
                                  ? ` (${txn.discountType})`
                                  : ''}
                                :
                              </span>
                              <span>-{formatCurrency(txn.discountAmount!)}</span>
                            </div>
                          )}

                          <div className="history-f-row history-f-total">
                            <span>Total:</span>
                            <span>{txn.amount}</span>
                          </div>
                        </div>

                        {txn.type !== 'refund' && (
                          <div className="history-actions-row">
                            <button
                              onClick={() => onPartialRefund(txn)}
                              className="history-partial-refund-btn"
                            >
                              ↩ Partial Refund
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;