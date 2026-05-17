'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './GiftReceiptModal.css';

interface GiftReceiptItem {
    name: string;
    qty: number;
}

interface GiftReceiptProps {
    isOpen: boolean;
    onClose: () => void;
    transactionId: string | null;
    receiptNumber: string | null;
    items: GiftReceiptItem[];
    date?: string;
    time?: string;
}

const GiftReceiptModal: React.FC<GiftReceiptProps> = ({
    isOpen,
    onClose,
    transactionId,
    receiptNumber,
    items,
    date,
    time,
}) => {

    const [customer, setCustomer] = React.useState({
        name: '',
        tin: '',
        address: ''
    });
    // Auto-trigger print dialog, then close the component when done
    useEffect(() => {
        if (!isOpen) return;

        const handleAfterPrint = () => {
            onClose();
        };

        const loadDataAndPrint = async () => {
            try {
                const res = await fetch('http://localhost:4002/receipt/info');
                const data = await res.json();

                if (data) {
                    setCustomer({
                        name: data.name || '',
                        tin: data.tin || '',
                        address: data.address || ''
                    });
                }

                // print AFTER data is set
                setTimeout(() => {
                    window.print();
                }, 300);

            } catch (err) {
                console.error('Fetch receipt info error:', err);
            }
        };

        window.addEventListener('afterprint', handleAfterPrint);

        loadDataAndPrint();

        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [isOpen, onClose]);
    // Nothing to show if not open
    if (!isOpen) return null;

    // Render directly into document.body via portal so we can target it cleanly in @media print
    return createPortal(
        <div id="gift-receipt-portal">
            <div className="gift-receipt-content">
                <h3 className="gift-store-name">PharmaCare Drugstore</h3>
                <p className="gift-store-sub">123 Sample St., Brgy. Example, City, Philippines</p>
                <p className="gift-store-sub">TIN: 000-000-000-000</p>
                <div className="gift-divider" />
                <h2 className="gift-title">OFFICIAL RECEIPT</h2>
                <p className="gift-subtitle">Name: {customer.name}</p>
                <p className="gift-subtitle">TIN: {customer.tin}</p>
                <p className="gift-subtitle">Address: {customer.address}</p>
                <div className="gift-divider dashed" />

                <div className="gift-meta-section">
                    {receiptNumber && (
                        <p className="gift-meta">Receipt #: <strong>{receiptNumber}</strong></p>
                    )}
                    <p className="gift-meta">Transaction ID: <strong>{transactionId ?? '—'}</strong></p>
                    {date && <p className="gift-meta">Date: <strong>{date}</strong></p>}
                    {time && <p className="gift-meta">Time: <strong>{time}</strong></p>}
                </div>

                <div className="gift-divider dashed" />

                <div className="gift-items-section">
                    <p className="gift-items-heading">Items Included</p>
                    {items.map((item, idx) => (
                        <div key={idx} className="gift-item-row">
                            <span className="gift-item-name">{item.name}</span>
                            <span className="gift-item-qty">×{item.qty}</span>
                        </div>
                    ))}
                </div>

                <div className="gift-divider dashed" />

                <div className="gift-policy-section">
                    <p className="gift-policy-title">Return Policy</p>
                    <p className="gift-policy-text">
                        Items may be exchanged within 7 days of purchase with the original receipt.
                        This gift receipt is linked to the original transaction for reference.
                    </p>
                    <p className="gift-disclaimer">
                        ⚠ Cannot be used for exchange or refund without the original receipt.
                    </p>
                </div>

                <div className="gift-divider" />
                <p className="gift-footer">Thank you for your purchase!</p>
                <p className="gift-footer small">This is a computer-generated gift receipt.</p>
            </div>
        </div>,
        document.body
    );
};

export default GiftReceiptModal;
