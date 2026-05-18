'use client';

import React, { useState } from 'react';
import PaymentForm from './PaymentForm';
import ItemizedReceipt, { ReceiptItem } from './ItemizedReceipt';

// Number format utility
import { formatCurrency } from '../utils/numberformatters';
import { printReceipt } from '../utils/printUtils';
import { TaxDiscountBreakdown } from '../utils/vatCalculator';

interface PaymentIcons {
    cash_icon: any;
    card_icon: any;
    mobile_icon: any;
}

interface PaymentModalProps {
    isOpen: boolean;
    total: number;
    subtotal?: number;
    tax?: number;
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
    apiChangeAmount?: number;
    isSubmitting?: boolean;
    discountAmount?: number;
    discountType?: string;
    preAppliedDiscountPercent?: number;
    receiptItems?: ReceiptItem[];
    customerName?: string;
    taxBreakdown?: TaxDiscountBreakdown;
    onOpenGiftReceipt?: () => void;
    orFields?: {
        name: string;
        tin: string;
        address: string;
    };
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    total,
    subtotal = 0,
    tax = 0,
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
    apiChangeAmount,
    isSubmitting = false,
    discountAmount,
    discountType,
    preAppliedDiscountPercent = 0,
    receiptItems = [],
    customerName,
    taxBreakdown,
    orFields,
}) => {
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrintReceipt = async () => {
        setIsPrinting(true);
        try {
            await printReceipt({
                receiptNumber: dbReceiptNumber,
                transactionId: dbTransactionId,
                items: receiptItems,
                subtotal,
                tax,
                discountAmount,
                discountType,
                taxBreakdown,
                total,
                paymentMethod: paymentMethod || 'cash',
                changeAmount: apiChangeAmount || changeAmount,
                customerName,
                orFields,
            });
        } catch (error) {
            console.error('Print error:', error);
        } finally {
            setIsPrinting(false);
        }
    };
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            {paymentStatus === 'success' ? (
                <div className="success-modal">
                    <div className="success-modal-body">
                    {receiptItems && receiptItems.length > 0 ? (
                        <>
                            <ItemizedReceipt
                                receiptNumber={dbReceiptNumber}
                                transactionId={dbTransactionId}
                                items={receiptItems}
                                subtotal={subtotal}
                                tax={tax}
                                discountAmount={discountAmount}
                                discountType={discountType}
                                taxBreakdown={taxBreakdown}
                                total={total}
                                paymentMethod={paymentMethod || 'cash'}
                                changeAmount={apiChangeAmount !== undefined ? apiChangeAmount : changeAmount}
                                customerName={customerName}
                                orFields={orFields}
                            />
                        </>
                    ) : (
                        <div>
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
                        </div>
                    )}
                    </div>

                    <div className="success-modal-actions">
                        <button className="success-modal-action-btn" onClick={closePaymentModal}>Back to POS</button>
                        <button
                            className="success-modal-action-btn"
                            onClick={handlePrintReceipt}
                            disabled={isPrinting}
                        >
                            {isPrinting ? 'Printing...' : '🖨 Print Receipt'}
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
                        {!paymentMethod && (
                            <button className="close-modal" onClick={closePaymentModal}>X</button>
                        )}
                    </div>

                    <div className="amount-display">
                        <p>Total Amount</p>
                        <h1 className="total-h1">{formatCurrency(total)}</h1>
                    </div>

                    <PaymentForm
                        total={total}
                        subtotal={subtotal}
                        tax={tax}
                        taxBreakdown={taxBreakdown}
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
                        preAppliedDiscountAmount={discountAmount}
                        preAppliedDiscountType={discountType}
                        preAppliedDiscountPercent={preAppliedDiscountPercent}
                    />
                </div>
            )}
        </div>
    );
};

export default PaymentModal;
