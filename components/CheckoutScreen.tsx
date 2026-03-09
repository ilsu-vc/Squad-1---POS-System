'use client';

import React, { useState } from 'react';
import './CheckoutScreen.css';

interface CheckoutItem {
    name: string;
    price: number;
}

// Basic Checkout UI Component
const CheckoutScreen: React.FC = () => {
    const [items] = useState<CheckoutItem[]>([
        { name: 'Product 1', price: 100 },
        { name: 'Product 2', price: 200 },
        { name: 'Product 3', price: 150 },
    ]);

    const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

    const total = items.reduce((sum, item) => sum + item.price, 0);

    const handleCompleteSale = () => {
        const receipt = `#${Math.random().toString().slice(2, 8)}`;
        setReceiptNumber(receipt);
    };

    return (
        <div className="checkout-container">
            <h1>Checkout</h1>

            {/* Item List */}
            <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
                {items.map((item, index) => (
                    <li key={index} className="checkout-item">
                        <span>{item.name} - ₱{item.price}</span>
                    </li>
                ))}
            </ul>

            {/* Subtotal */}
            <h3>Subtotal: ₱{total}</h3>

            {/* Complete Sale Button */}
            <button
                onClick={handleCompleteSale}
                className="complete-sale-button"
            >
                Complete Sale
            </button>

            {/* Success Message */}
            {receiptNumber && (
                <div className="success-message">
                    <h4>Sale Completed!</h4>
                    <p>Receipt Number: {receiptNumber}</p>
                </div>
            )}
        </div>
    );
};

export default CheckoutScreen;
