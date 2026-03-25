'use client';

import React from 'react';
import { getMethodPillClass } from '../utils/paymentHelpers';
import { Transaction } from '../utils/chartHelpers';
import searchIcon from '../assets/images/search_icon.png';

// Number format utility
import { formatCurrency } from '../utils/numberformatters';

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
    const totalRevenue = transactions.reduce((acc, curr) => acc + curr.rawAmount, 0);
    const avgTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;

    const filtered = transactions.filter(
        (t) =>
            t.id.toLowerCase().includes(historySearch.toLowerCase()) ||
            (t.receiptNumber && String(t.receiptNumber).toLowerCase().includes(historySearch.toLowerCase())) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(historySearch.toLowerCase())))
    );

    return (
        <div className="history-view">
            <div className="view-inner-container">

                {/* ── Title Row ── */}
                <div className="history-view-title-row">
                    <h2 className="view-title">Transaction History</h2>
                    <button className="reprint-trigger-btn" onClick={() => setIsReprintModalOpen(true)}>
                        🖨 Reprint Receipt
                    </button>
                </div>

                {/* ── Search ── */}
                <div className="history-search-container">
                    <img src={typeof searchIcon === 'string' ? searchIcon : (searchIcon as any).src} alt="" className="search-icon-img" />
                    <input
                        type="text"
                        className="modern-input"
                        placeholder="Search by transaction ID..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                    />
                </div>

                {/* ── Summary Stats ── */}
                <div className="history-stats-row">
                    <div className="h-stat-card">
                        <p className="h-stat-label">Total Transactions</p>
                        <h2 className="h-stat-value">{transactions.length}</h2>
                    </div>
                    <div className="h-stat-card">
                        <p className="h-stat-label">Total Revenue</p>
                        <h2 className="h-stat-value">{formatCurrency(totalRevenue)}</h2>
                    </div>
                    <div className="h-stat-card">
                        <p className="h-stat-label">Average Transaction</p>
                        <h2 className="h-stat-value">{formatCurrency(avgTransaction)}</h2>
                    </div>
                </div>

                {/* ── Transaction Accordion List ── */}
                <div className="history-scroll-area" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <div className="history-accordion">
                        {filtered.map((txn) => (
                            <div key={txn.id} className={`history-card ${expandedTxn === txn.id ? 'expanded' : ''}`}>

                                {/* Card Header */}
                                <div className="history-card-header" onClick={() => toggleHistoryItem(txn.id)}>
                                    <div className="header-left">
                                        <div className="id-badge-row">
                                            <span className="txn-id-text">{txn.id}</span>
                                            {txn.receiptNumber && (
                                                <span className="receipt-no-badge">OR: {txn.receiptNumber}</span>
                                            )}
                                            {txn.type === 'refund' ? (
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', letterSpacing: '0.03em' }}>REFUND</span>
                                            ) : (
                                                <span className={`method-pill ${getMethodPillClass(txn.method)}`}>{txn.method}</span>
                                            )}
                                        </div>
                                        <p className="txn-meta-text">
                                            {txn.date}, {txn.time} • {txn.itemsCount} items
                                        </p>
                                    </div>
                                    <div className="header-right">
                                        <span className="txn-total-text">{txn.amount}</span>
                                        <span className={`chevron-icon ${expandedTxn === txn.id ? 'open' : ''}`}>⌵</span>
                                    </div>
                                </div>

                                {/* Card Body (expanded) */}
                                {expandedTxn === txn.id && (
                                    <div className="history-card-body">
                                        <p className="body-section-title">Items</p>
                                        <div className="items-list">
                                            {txn.items.map((item, idx) => (
                                                <div key={idx} className="item-detail-row">
                                                    <div className="item-info">
                                                        <p className="item-name-text">{item.name}</p>
                                                        <p className="item-calc-text">{formatCurrency(item.price)} × {item.qty}</p>
                                                    </div>
                                                    <p className="item-price-sum">{formatCurrency(item.price * item.qty)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {txn.notes && (
                                            <div className="history-section" style={{ marginTop: '12px' }}>
                                                <p className="body-section-title">Notes</p>
                                                <p style={{ fontSize: '0.9rem', color: '#475569', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #cbd5e1' }}>
                                                    {txn.notes}
                                                </p>
                                            </div>
                                        )}

                                        {txn.tags && txn.tags.length > 0 && (
                                            <div className="history-section" style={{ marginTop: '12px' }}>
                                                <p className="body-section-title">Tags</p>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {txn.tags.map((tag, idx) => (
                                                        <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 500 }}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {txn.type === 'refund' && txn.originalTransactionId && (
                                            <div className="history-section" style={{ marginTop: '12px' }}>
                                                <p className="body-section-title">Refund Reference</p>
                                                <p style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
                                                    Original Transaction: {txn.originalTransactionId}
                                                </p>
                                            </div>
                                        )}

                                        <div className="history-financial-summary">
                                            <div className="f-row"><span>Subtotal:</span><span>{formatCurrency(txn.subtotal ?? 0)}</span></div>
                                            <div className="f-row"><span>Tax:</span><span>{formatCurrency(txn.tax ?? 0)}</span></div>
                                            {Number(txn.discountAmount) > 0 && (<div className="f-row f-discount"><span>Discount{txn.discountType && txn.discountType !== 'None' ? ` (${txn.discountType})` : ''}:</span><span>-{formatCurrency(txn.discountAmount!)}</span></div>)}
                                            <div className="f-row f-total"><span>Total:</span><span>{txn.amount}</span></div>
                                        </div>

                                        {txn.type !== 'refund' && (
                                            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => onPartialRefund(txn)}
                                                    style={{
                                                        padding: '7px 14px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #fca5a5',
                                                        background: '#fff',
                                                        color: '#dc2626',
                                                        fontWeight: 700,
                                                        fontSize: '0.82rem',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                                                >
                                                    ↩ Partial Refund
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HistoryView;
