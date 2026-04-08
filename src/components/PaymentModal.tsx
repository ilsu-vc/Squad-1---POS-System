'use client';

import React from 'react';
import PaymentForm from './PaymentForm';

// Number format utility
import { formatCurrency } from '../utils/numberformatters';

interface PaymentIcons {
    cash_icon: any;
    card_icon: any;
    mobile_icon: any;
}

interface PaymentModalProps {
    isOpen: boolean;
    total: number;
    paymentMethod: string | null;
    setPaymentMethod: (method: string | null) => void;
    cashReceived: string;
    setCashReceived: (value: string) => void;
    changeAmount: number;
    paymentStatus: string;
    dbTransactionId: string | null;
    dbReceiptNumber: string | null;
    handleCancelPayment: () => void;
    handleCompletePayment: (details?: any) => void;
    closePaymentModal: () => void;
    icons: PaymentIcons;
    canApproveDiscount: boolean;
    onOpenGiftReceipt?: () => void;
    apiChangeAmount?: number;
    isSubmitting?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    total,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    changeAmount,
    paymentStatus,
    dbTransactionId,
    dbReceiptNumber,
    handleCancelPayment,
    handleCompletePayment,
    closePaymentModal,
    icons,
    canApproveDiscount,
    onOpenGiftReceipt,
    apiChangeAmount,
    isSubmitting = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            {paymentStatus === 'success' ? (
                <div className="success-modal">
                    <div className="success-icon">✓</div>
                    <h2 className="modal-title">Payment Successful!</h2>
                    <p>
                        Receipt Number:{" "}
                        <strong>{dbReceiptNumber ? dbReceiptNumber : "Generating..."}</strong>
                    </p>
                    {apiChangeAmount !== undefined && apiChangeAmount > 0 && (
                        <p style={{ fontSize: '1.2rem', margin: '10px 0' }}>
                            Change Amount: <strong>{formatCurrency(apiChangeAmount)}</strong>
                        </p>
                    )}
                    <p>Transaction completed</p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                        <button className="close-success-btn" onClick={closePaymentModal}>Back to POS</button>
                        <button
                            className="close-success-btn"
                            style={{ background: '#01a2ad', color: 'white', border: 'none' }}
                            onClick={onOpenGiftReceipt}
                        >
                        Print Gift Receipt
                        </button>
                    </div>
                </div>
            ) : (
                <div className="payment-modal">
                    <div className="modal-header">
                        <div>
                            <h2 className="modal-title">Payment</h2>
                            <p className="txn-id-line">
                                <span className="txn-id-label">Transaction ID:</span>{" "}
                                <span className="txn-id-value">{dbTransactionId ? dbTransactionId : "Generating..."}</span>
                            </p>
                        </div>
                        <button className="close-modal" onClick={closePaymentModal}>✕</button>
                    </div>

                    <div className="amount-display">
                        <p>Total Amount</p>
                        <h1 className="total-h1">{formatCurrency(total)}</h1>
                    </div>

                    <PaymentForm
                        total={total}
                        paymentMethod={paymentMethod}
                        setPaymentMethod={setPaymentMethod}
                        cashReceived={cashReceived}
                        setCashReceived={setCashReceived}
                        changeAmount={changeAmount}
                        handleCancelPayment={handleCancelPayment}
                        handleCompletePayment={handleCompletePayment}
                        closePaymentModal={closePaymentModal}
                        icons={icons}
                        canApproveDiscount={canApproveDiscount}
                        isSubmitting={isSubmitting}
                    />
                </div>
            )}
        </div>
    );
};

export default PaymentModal;
