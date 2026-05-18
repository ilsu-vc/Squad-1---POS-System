'use client';

import React, { useState } from 'react';
import { Transaction } from '../utils/chartHelpers';
import { formatCurrency } from '../utils/numberformatters';
import { calculateTaxDiscountBreakdown } from '../utils/vatCalculator';
import './ReprintModal.css';

const SUPERVISOR_PIN = '1234';

interface ReprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
}

const ReprintModal: React.FC<ReprintModalProps> = ({ isOpen, onClose, transactions }) => {
    const [step, setStep] = useState<'pin' | 'search'>('pin');
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const handlePinDigit = (digit: string) => {
        if (pinInput.length >= 4) return;
        const next = pinInput + digit;
        setPinInput(next);
        if (next.length === 4) {
            if (next === SUPERVISOR_PIN) {
                setPinError('');
                setStep('search');
            } else {
                setPinError('Incorrect PIN. Try again.');
                setTimeout(() => {
                    setPinInput('');
                    setPinError('');
                }, 1000);
            }
        }
    };

    const handlePinClear = () => {
        setPinInput('');
        setPinError('');
    };

    const q = searchQuery.trim().toLowerCase();
    const matchedTxn = transactions.find(t =>
        (t.receiptNumber && String(t.receiptNumber).toLowerCase().includes(q)) ||
        t.id.toLowerCase().includes(q)
    );

    const handlePrint = () => {
        window.print();
    };

    const handleClose = () => {
        setStep('pin');
        setPinInput('');
        setPinError('');
        setSearchQuery('');
        onClose();
    };

    const formatReceiptTimestamp = (date: string, time: string) => {
        const parsed = new Date(`${date} ${time}`);
        if (Number.isNaN(parsed.getTime())) return `${date} ${time}`;

        const formattedDate = parsed.toLocaleDateString('en-US', {
            month: 'long',
            day: '2-digit',
            year: 'numeric',
        });
        const formattedTime = parsed.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });

        return `${formattedDate} ${formattedTime}`;
    };

    const getPaymentMethodDisplay = (txn: Transaction) => {
        if (txn.cashierName && txn.cashierName.toLowerCase() === 'ecommerce') {
            return 'ONLINE ORDER';
        }
        const method = txn.method;
        const normalized = (method || 'cash').trim().toLowerCase();
        if (normalized === 'cash' || normalized === 'cash payment') return 'CASH';
        if (normalized === 'card' || normalized === 'card payment') return 'CARD';
        if (normalized === 'mobile' || normalized === 'mobile payment' || normalized === 'gcash') return 'MOBILE';
        return (method || 'CASH').toUpperCase();
    };

    const renderReprintReceipt = (txn: Transaction) => {
        const amountPaid = Number(txn.amountPaid ?? txn.amount_paid ?? 0);
        const changeAmount = Number(
            txn.changeAmount ??
            txn.change_amount ??
            (amountPaid > 0 ? Math.max(0, amountPaid - txn.rawAmount) : 0)
        );
        const receiptTaxBreakdown = calculateTaxDiscountBreakdown({
            subtotal: txn.subtotal,
            vat: txn.tax,
            discountType: txn.discountType,
            discountAmount: txn.discountAmount,
        });

        return (
            <div className="print-style-receipt">
                <div className="print-reprint-watermark">REPRINT</div>

                <div className="print-receipt-header">
                    <h2>PharmaCare Drugstore</h2>
                    <p>123 Sample St., Brgy. Example, City, Philippines</p>
                    <p>TIN: 000-000-000-000</p>
                    <p>PTIN: 12-345-678-901-001</p>
                </div>

                <div className="print-line" />

                <div className="print-receipt-meta">
                    <p>Receipt #: <strong>{txn.receiptNumber || 'N/A'}</strong></p>
                    <p>Txn ID: <strong>{txn.id}</strong></p>
                    <p>{formatReceiptTimestamp(txn.date, txn.time)}</p>
                    {txn.customerName && <p>Customer: <strong>{txn.customerName}</strong></p>}
                </div>

                <div className="print-line" />

                <table className="print-items-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {txn.items.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.name}</td>
                                <td>{item.qty}</td>
                                <td>{formatCurrency(item.price)}</td>
                                <td>{formatCurrency(item.price * item.qty)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="print-line dashed" />

                <div className="print-summary">
                    <div>
                        <span>VATable Sales:</span>
                        <span>{formatCurrency(receiptTaxBreakdown.vatableSales)}</span>
                    </div>
                    {receiptTaxBreakdown.isVatExempt && (
                        <div>
                            <span>VAT-Exempt Sales:</span>
                            <span>{formatCurrency(receiptTaxBreakdown.vatExemptSales)}</span>
                        </div>
                    )}
                    <div>
                        <span>VAT (12%):</span>
                        <span>{formatCurrency(receiptTaxBreakdown.vatAmount)}</span>
                    </div>
                    {receiptTaxBreakdown.vatDeduction > 0 && (
                        <div>
                            <span>VAT Discount/Deduction:</span>
                            <span>-{formatCurrency(receiptTaxBreakdown.vatDeduction)}</span>
                        </div>
                    )}
                    {receiptTaxBreakdown.discountAmount > 0 && (
                        <div>
                            <span>Discount {txn.discountType ? `(${txn.discountType.toUpperCase()})` : ''}:</span>
                            <span>-{formatCurrency(receiptTaxBreakdown.discountAmount)}</span>
                        </div>
                    )}
                </div>

                <div className="print-line" />

                <div className="print-total-row">
                    <span>TOTAL DUE:</span>
                    <span>{formatCurrency(txn.rawAmount)}</span>
                </div>

                <div className="print-line" />

                <div className="print-payment-section">
                    <p><strong>Payment:</strong></p>
                    <p>{getPaymentMethodDisplay(txn)}</p>
                    <div className="print-change-row">
                        <span>Change:</span>
                        <span>{formatCurrency(changeAmount)}</span>
                    </div>
                </div>

                <div className="print-line" />

                <div className="print-receipt-footer">
                    <p>Thank you for your purchase!</p>
                    <p>Please keep this receipt for your records.</p>
                    <p>THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP</p>
                </div>
            </div>
        );
    };

    return (
        <div className="reprint-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
            {step === 'pin' && (
                <div className="reprint-modal pin-modal">
                    <div className="reprint-modal-header">
                        <div>
                            <h2 className="reprint-title">Supervisor Approval</h2>
                            <p className="reprint-subtitle">Enter supervisor PIN to continue</p>
                        </div>
                    </div>

                    <div className="pin-dots-row">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`pin-dot ${pinInput.length > i ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
                        ))}
                    </div>

                    {pinError && <p className="pin-error-msg">{pinError}</p>}

                    <div className="pin-pad">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, idx) => (
                            <button
                                key={idx}
                                className={`pin-key ${d === '' ? 'pin-key-empty' : ''}`}
                                onClick={() => {
                                    if (d === '⌫') handlePinClear();
                                    else if (d !== '') handlePinDigit(d);
                                }}
                                disabled={d === ''}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                    <button className="reprint-cancel-btn" onClick={handleClose}>Cancel</button>
                </div>
            )}

            {step === 'search' && (
                <div className="reprint-modal search-modal">
                    <div className="reprint-modal-header">
                        <div>
                            <h2 className="reprint-title">Reprint Receipt</h2>
                            <p className="reprint-subtitle">Search by receipt number or transaction ID</p>
                        </div>
                    </div>

                    <div className="reprint-search-row">
                        <input
                            type="text"
                            className="reprint-search-input"
                            placeholder="Enter receipt # or transaction ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {q && matchedTxn ? (
                        <>
                            <div className="receipt-print-area">
                                {renderReprintReceipt(matchedTxn)}
                            </div>

                            <div className="reprint-actions no-print">
                                <button className="reprint-cancel-btn" onClick={handleClose}>Close</button>
                                <button className="reprint-print-btn" onClick={handlePrint}>🖨 Print Receipt</button>
                            </div>
                        </>
                    ) : q && !matchedTxn ? (
                        <div className="reprint-not-found">
                            <p>No transaction found for &quot;<strong>{searchQuery}</strong>&quot;</p>
                            <p className="reprint-not-found-sub">Try a different receipt number or transaction ID</p>
                        </div>
                    ) : (
                        <div className="reprint-empty-state">
                            <p>Enter a receipt number or transaction ID above to find the receipt</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReprintModal;
