'use client';

import React, { useState, useEffect } from 'react';
import { Transaction } from '../utils/chartHelpers';
import { formatCurrency } from '../utils/numberformatters';
import './PartialRefundModal.css';

interface RefundItem {
    name: string;
    price: number;
    originalQty: number;
    maxRefundable: number;
    selectedQty: number;
    selected: boolean;
    category?: string;
}

interface PartialRefundModalProps {
    isOpen: boolean;
    transaction: Transaction | null;
    allTransactions: Transaction[];
    onClose: () => void;
    onProcessRefund: (
        originalTxn: Transaction,
        refundItems: Array<{ name: string; qty: number; price: number; category?: string }>,
        refundSubtotal: number,
        refundTax: number,
        refundTotal: number
    ) => void;
}

const PartialRefundModal: React.FC<PartialRefundModalProps> = ({
    isOpen,
    transaction,
    allTransactions,
    onClose,
    onProcessRefund,
}) => {
    const [items, setItems] = useState<RefundItem[]>([]);

    // Initialise item list whenever the modal opens with a new transaction
    useEffect(() => {
        if (transaction && isOpen) {
            // Find past refunds for this specific transaction
            const previousRefunds = allTransactions.filter(
                (t) => t.type === 'refund' && t.originalTransactionId === transaction.id
            );

            // Calculate how many of each item have already been refunded
            const refundedQtyMap: Record<string, number> = {};
            previousRefunds.forEach(refundTxn => {
                refundTxn.items.forEach(item => {
                    refundedQtyMap[item.name] = (refundedQtyMap[item.name] || 0) + item.qty;
                });
            });

            // Build item selection list capped at maxRefundable
            setItems(
                transaction.items.map((item) => {
                    const alreadyRefunded = refundedQtyMap[item.name] || 0;
                    const maxRefundable = Math.max(0, item.qty - alreadyRefunded);
                    return {
                        name: item.name,
                        price: item.price,
                        originalQty: item.qty,
                        maxRefundable,
                        selectedQty: maxRefundable > 0 ? 1 : 0,
                        selected: maxRefundable > 0, // auto-select if eligible, else disable
                        category: item.category,
                    };
                }).filter(it => it.maxRefundable > 0) // Hide items that are fully refunded
            );
        }
    }, [transaction, isOpen, allTransactions]);

    if (!isOpen || !transaction) return null;

    const toggleItem = (idx: number) => {
        setItems((prev) =>
            prev.map((it, i) =>
                i === idx ? { ...it, selected: !it.selected } : it
            )
        );
    };

    const changeQty = (idx: number, delta: number) => {
        setItems((prev) =>
            prev.map((it, i) => {
                if (i !== idx) return it;
                const next = Math.min(
                    it.maxRefundable,
                    Math.max(1, it.selectedQty + delta)
                );
                return { ...it, selectedQty: next };
            })
        );
    };

    const handleQtyInput = (idx: number, val: string) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) return;
        setItems((prev) =>
            prev.map((it, i) => {
                if (i !== idx) return it;
                const clamped = Math.min(it.maxRefundable, Math.max(1, parsed));
                return { ...it, selectedQty: clamped };
            })
        );
    };

    // --- Calculations ---
    const selectedItems = items.filter((it) => it.selected);
    const refundSubtotal = selectedItems.reduce(
        (acc, it) => acc + it.price * it.selectedQty,
        0
    );
    const refundTax = Math.round(refundSubtotal * 0.12 * 100) / 100;
    const refundTotal = Math.round((refundSubtotal + refundTax) * 100) / 100;

    const canProcess = selectedItems.length > 0;

    const handleProcess = () => {
        if (!canProcess || !transaction) return;
        const payload = selectedItems.map((it) => ({
            name: it.name,
            qty: it.selectedQty,
            price: it.price,
            category: it.category,
        }));
        onProcessRefund(transaction, payload, refundSubtotal, refundTax, refundTotal);
    };

    return (
        <div className="refund-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="refund-modal">

                {/* Header */}
                <div className="refund-modal-header">
                    <div>
                        <h2 className="refund-modal-title">↩ Partial Refund</h2>
                        <p className="refund-modal-subtitle">
                            Select items and quantities to refund from transaction{' '}
                            <strong>{transaction.id}</strong>
                        </p>
                    </div>
                    <button className="refund-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className="refund-modal-body">

                    {/* Items */}
                    <p className="refund-section-label">Items to Refund</p>
                    <div className="refund-items-list">
                        {items.length === 0 ? (
                            <p className="refund-no-items">No items found in this transaction.</p>
                        ) : (
                            items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`refund-item-row${item.selected ? ' selected' : ''}${!item.selected ? ' disabled-row' : ''}`}
                                >
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        className="refund-item-checkbox"
                                        checked={item.selected}
                                        onChange={() => toggleItem(idx)}
                                    />

                                    {/* Info */}
                                    <div className="refund-item-info">
                                        <p className="refund-item-name">{item.name}</p>
                                        <p className="refund-item-price">
                                            {formatCurrency(item.price)} each &nbsp;·&nbsp; Originally: ×{item.originalQty} &nbsp;·&nbsp; Max Refundable: ×{item.maxRefundable}
                                        </p>
                                    </div>

                                    {/* Qty control */}
                                    <div className="refund-qty-control">
                                        <button
                                            className="refund-qty-btn"
                                            onClick={() => changeQty(idx, -1)}
                                            disabled={!item.selected || item.selectedQty <= 1}
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            className="refund-qty-input"
                                            min={1}
                                            max={item.maxRefundable}
                                            value={item.selectedQty}
                                            disabled={!item.selected}
                                            onChange={(e) => handleQtyInput(idx, e.target.value)}
                                        />
                                        <button
                                            className="refund-qty-btn"
                                            onClick={() => changeQty(idx, 1)}
                                            disabled={!item.selected || item.selectedQty >= item.maxRefundable}
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Row subtotal */}
                                    <span className="refund-item-subtotal">
                                        {item.selected
                                            ? formatCurrency(item.price * item.selectedQty)
                                            : '—'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary */}
                    <div className="refund-summary">
                        <div className="refund-summary-row">
                            <span>Refund Subtotal</span>
                            <span>{formatCurrency(refundSubtotal)}</span>
                        </div>
                        <div className="refund-summary-row">
                            <span>VAT (12%)</span>
                            <span>{formatCurrency(refundTax)}</span>
                        </div>
                        <div className="refund-summary-row total">
                            <span>Total Refund Amount</span>
                            <span>−{formatCurrency(refundTotal)}</span>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="refund-modal-footer">
                    <button className="refund-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="refund-process-btn"
                        onClick={handleProcess}
                        disabled={!canProcess}
                    >
                        Process Refund
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PartialRefundModal;
