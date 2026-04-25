'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { discountApi, DiscountValidationResult, DiscountApprovalRequest } from '../services/discountApi';

// Number format utility
import { formatCurrency } from '../utils/numberformatters';
import SplitPaymentForm, { PaymentEntry } from './SplitPaymentForm';

interface PaymentIcons {
    cash_icon: any;
    card_icon: any;
    mobile_icon: any;
}

interface PaymentFormProps {
    total: number;
    paymentMethod: string | null;
    setPaymentMethod: (method: string | null) => void;
    cashReceived: string;
    setCashReceived: (value: string) => void;
    changeAmount?: number;
    handleCancelPayment: () => void;
    handleCompletePayment: (details?: any) => void;
    closePaymentModal?: () => void;
    icons: PaymentIcons;
    canApproveDiscount?: boolean;
    isSubmitting?: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
    total: initialTotal,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    handleCancelPayment,
    handleCompletePayment,
    icons: { cash_icon, card_icon, mobile_icon },
    canApproveDiscount = false,
    isSubmitting = false,
}) => {
    // --- Essential States ---
    const [customerName, setCustomerName] = useState('');
    const [discountType, setDiscountType] = useState('none'); // 'none', 'senior', 'pwd'
    const [notes, setNotes] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [refNo, setRefNo] = useState('');
    const [cardLast4, setCardLast4] = useState('');
    const [mobileProvider, setMobileProvider] = useState('GCash'); // GCash, Maya
    const [isSplitMode, setIsSplitMode] = useState(false);

    // ── POS-S4-008-T1: Discount/Promo code validation state ──
    const [promoCode, setPromoCode] = useState('');
    const [promoValidating, setPromoValidating] = useState(false);
    const [promoResult, setPromoResult] = useState<DiscountValidationResult | null>(null);

    // ── POS-S4-008-T2: Manual discount approval state ──
    const [approvalStatus, setApprovalStatus] = useState<DiscountApprovalRequest | null>(null);
    const [approvalPolling, setApprovalPolling] = useState(false);

    // T1: Validate promo/discount code via API
    const handleValidatePromoCode = useCallback(async () => {
        if (!promoCode.trim()) return;
        setPromoValidating(true);
        setPromoResult(null);
        const result = await discountApi.validateDiscountCode(promoCode);
        setPromoResult(result);
        setPromoValidating(false);
    }, [promoCode]);

    // T2: Request manual discount approval + poll for result
    const handleRequestApproval = useCallback(async (type: string) => {
        setApprovalPolling(true);
        setApprovalStatus({
            status: 'pending',
            discountType: type,
            discountPercent: 20,
            requestedBy: 'current-user',
        });

        const result = await discountApi.requestDiscountApproval({
            discountType: type,
            discountPercent: 20,
            requestedBy: 'current-user',
            reason: `Manual ${type} discount requested`,
        });

        if (result.error) {
            setApprovalStatus({ ...result, status: 'rejected' });
            setApprovalPolling(false);
            return;
        }

        if (result.id && result.status === 'pending') {
            // Poll for approval
            const finalResult = await discountApi.pollApprovalStatus(result.id, {
                intervalMs: 3000,
                timeoutMs: 120000,
                onStatusChange: (status) => {
                    setApprovalStatus((prev) => prev ? { ...prev, status: status as any } : prev);
                },
            });
            setApprovalStatus(finalResult);
            if (finalResult.status === 'approved') {
                setDiscountType(type);
            }
        } else if (result.status === 'approved') {
            setDiscountType(type);
            setApprovalStatus(result);
        } else {
            setApprovalStatus(result);
        }
        setApprovalPolling(false);
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    // --- Derived Calculations ---
    const [finalTotal, setFinalTotal] = useState(initialTotal);
    const [discountAmount, setDiscountAmount] = useState(0);

    const getImgSrc = (img: any): string => {
        return typeof img === 'string' ? img : img?.src ?? '';
    };

    useEffect(() => {
        if (discountType === 'none') {
            setFinalTotal(Number(initialTotal.toFixed(2)));
            setDiscountAmount(0);
        } else {
            // PH Logic: Remove 12% VAT, then apply 20% discount
            const vatable = initialTotal / 1.12;
            const discount = vatable * 0.20;
            const discountedTotal = vatable - discount;
            setDiscountAmount(Number(discount.toFixed(2)));
            setFinalTotal(Number(discountedTotal.toFixed(2)));
        }
    }, [discountType, initialTotal]);

    // Recalculate change based on discounted total
    const currentCashReceived = parseFloat(cashReceived) || 0;
    const currentChangeAmount = Math.max(0, currentCashReceived - finalTotal);

    // Helper to generate predicted amount buttons
    const generatePredictions = (totalAmount: number): number[] => {
        const predictions = new Set<number>();
        const exact = Math.round(totalAmount * 100) / 100;
        predictions.add(exact);
        if (exact % 1 !== 0) predictions.add(Math.ceil(exact));
        [5, 10, 20, 50, 100].forEach(inc => {
            const pred = Math.ceil(exact / inc) * inc;
            if (pred >= exact) predictions.add(pred);
        });
        const bills = [100, 200, 500, 1000];
        bills.forEach(bill => {
            if (bill >= exact) predictions.add(bill);
        });
        return Array.from(predictions)
            .filter(a => a >= exact - 0.001)
            .sort((a, b) => a - b)
            .slice(0, 6);
    };

    const getDenominationBreakdown = (amount: number): Array<{ label: string; count: number }> => {
        let totalCents = Math.round(amount * 100);
        const denoms = [
            { v: 100000, l: '1000 peso' }, { v: 50000, l: '500 peso' },
            { v: 20000, l: '200 peso' }, { v: 10000, l: '100 peso' },
            { v: 5000, l: '50 peso' }, { v: 2000, l: '20 peso' },
            { v: 1000, l: '10 peso' }, { v: 500, l: '5 peso' },
            { v: 100, l: '1 peso' }, { v: 25, l: '25 centavo' },
            { v: 10, l: '10 centavo' }, { v: 5, l: '5 centavo' },
            { v: 1, l: '1 centavo' },
        ];
        const breakdown: Array<{ label: string; count: number }> = [];
        denoms.forEach(d => {
            const count = Math.floor(totalCents / d.v);
            if (count > 0) {
                breakdown.push({ label: d.l, count });
                totalCents %= d.v;
            }
        });
        return breakdown;
    };

    const onComplete = () => {
        const details = {
            customerName,
            discountType,
            discountAmount,
            finalTotal,
            refNo,
            cardLast4,
            mobileProvider,
            tendered: cashReceived,
            notes,
            tags: selectedTags,
        };
        handleCompletePayment(details);
    };

    const onSplitComplete = (entries: PaymentEntry[]) => {
        const totalCash = entries
            .filter(e => e.method === 'cash')
            .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const totalPaid = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const change = Math.max(0, totalCash - (totalCash - Math.max(0, totalPaid - finalTotal)));

        handleCompletePayment({
            customerName,
            discountType,
            discountAmount,
            finalTotal,
            splitPayments: entries,
            changeAmount: change,
            notes,
            tags: selectedTags,
        });
    };

    // ── Split mode ──────────────────────────────────────────────────────────
    if (isSplitMode) {
        return (
            <div className="payment-view-container">
                <div className="essentials-section" style={{ marginBottom: 12 }}>
                    <div className="input-group">
                        <label className="section-label-sm">Customer Name (Optional)</label>
                        <input
                            type="text"
                            className="modern-input"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Walking Customer"
                        />
                    </div>

                    <div className="input-group" style={{ marginTop: '15px' }}>
                        <label className="section-label-sm">Transaction Tags</label>
                        <div className="discount-grid">
                            {['Bulk Order', 'Delivery', 'Special Request'].map(tag => (
                                <button
                                    key={tag}
                                    className={`discount-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                                    onClick={() => toggleTag(tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="input-group" style={{ marginTop: '15px' }}>
                        <label className="section-label-sm">Transaction Notes ({notes.length}/500)</label>
                        <textarea
                            className="modern-input"
                            style={{ height: '60px', resize: 'none', paddingTop: '10px' }}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                            placeholder="Add special instructions..."
                        />
                    </div>

                    <div className="discount-section">
                        <label className="section-label-sm">Applied Discount</label>
                        <div className="discount-grid">
                            {(['none', 'senior', 'pwd'] as const).map(type => (
                                <button
                                    key={type}
                                    className={`discount-btn ${discountType === type ? 'active' : ''}`}
                                    onClick={() => setDiscountType(type)}
                                    disabled={!canApproveDiscount && type !== 'none'}
                                >
                                    {type === 'none' ? 'No Discount' : type.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <SplitPaymentForm
                            finalTotal={finalTotal}
                            icons={{ cash_icon, card_icon, mobile_icon }}
                            onComplete={onSplitComplete}
                            onCancel={handleCancelPayment}
                            onBack={() => setIsSplitMode(false)}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ── Single method selection ──────────────────────────────────────────────
    if (!paymentMethod) {
        return (
            <div className="payment-options">
                <p className="section-label">Select Payment Method</p>
                <div className="method-grid">
                    <button className="method-item" onClick={() => setPaymentMethod('cash')}>
                        <img src={getImgSrc(cash_icon)} alt="" className="method-img-icon" />
                        <span>Cash</span>
                    </button>
                    <button className="method-item" onClick={() => setPaymentMethod('card')}>
                        <img src={getImgSrc(card_icon)} alt="" className="method-img-icon" />
                        <span>Card</span>
                    </button>
                    <button className="method-item" onClick={() => setPaymentMethod('mobile')}>
                        <img src={getImgSrc(mobile_icon)} alt="" className="method-img-icon" />
                        <span>Mobile</span>
                    </button>
                    <button className="method-item split-method-item" onClick={() => setIsSplitMode(true)}>
                        <span className="split-method-icon-badge">⊕</span>
                        <span>Split Payment</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-view-container">
            <div className="payment-layout">
                {/* Left Column: Universal Info & Inputs */}
                <div className="payment-main">
                    <div className="view-header">
                        <p className="section-label" style={{ textTransform: 'capitalize' }}>{paymentMethod} Payment</p>
                        <button className="change-method" onClick={() => setPaymentMethod(null)}>Change Method</button>
                    </div>

                    <div className="essentials-section">
                        <div className="input-group">
                            <label className="section-label-sm">Customer Name (Optional)</label>
                            <input
                                type="text"
                                className="modern-input"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Walking Customer"
                            />
                        </div>

                        <div className="input-group" style={{ marginTop: '15px' }}>
                            <label className="section-label-sm">Transaction Tags</label>
                            <div className="discount-grid">
                                {['Bulk Order', 'Delivery', 'Special Request'].map(tag => (
                                    <button
                                        key={tag}
                                        className={`discount-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                                        onClick={() => toggleTag(tag)}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '15px' }}>
                            <label className="section-label-sm">Transaction Notes ({notes.length}/500)</label>
                            <textarea
                                className="modern-input"
                                style={{ height: '80px', resize: 'none', paddingTop: '10px' }}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                                placeholder="Add special instructions or customer requests..."
                            />
                        </div>

                        <div className="discount-section">
                            <label className="section-label-sm">Applied Discount</label>
                            <div className="discount-grid">
                                {(['none', 'senior', 'pwd'] as const).map(type => (
                                    <button
                                        key={type}
                                        className={`discount-btn ${discountType === type ? 'active' : ''}`}
                                        onClick={() => {
                                            if (canApproveDiscount || type === 'none') {
                                                setDiscountType(type);
                                            } else {
                                                handleRequestApproval(type);
                                            }
                                        }}
                                        disabled={approvalPolling && !canApproveDiscount && type !== 'none'}
                                        title={!canApproveDiscount && type !== 'none' ? 'Requires supervisor approval — will request' : undefined}
                                    >
                                        {type === 'none' ? 'No Discount' : type.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* T2: Approval status indicator */}
                            {approvalStatus && (
                                <div style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.82rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: approvalStatus.status === 'approved' ? '#d4edda'
                                        : approvalStatus.status === 'rejected' ? '#f8d7da'
                                        : '#fff3cd',
                                    color: approvalStatus.status === 'approved' ? '#155724'
                                        : approvalStatus.status === 'rejected' ? '#721c24'
                                        : '#856404',
                                    border: `1px solid ${approvalStatus.status === 'approved' ? '#c3e6cb'
                                        : approvalStatus.status === 'rejected' ? '#f5c6cb'
                                        : '#ffc107'}`,
                                }}>
                                    {approvalPolling && (
                                        <div style={{
                                            width: '14px', height: '14px',
                                            border: '2px solid currentColor',
                                            borderTopColor: 'transparent',
                                            borderRadius: '50%',
                                            animation: 'spin 0.6s linear infinite',
                                        }} />
                                    )}
                                    <span>
                                        {approvalStatus.status === 'pending' && 'Waiting for supervisor approval...'}
                                        {approvalStatus.status === 'approved' && `✓ ${approvalStatus.discountType} discount approved`}
                                        {approvalStatus.status === 'rejected' && `✗ ${approvalStatus.error || 'Discount request rejected'}`}
                                    </span>
                                </div>
                            )}

                            {/* T1: Promo/Discount code input */}
                            <div style={{ marginTop: '12px' }}>
                                <label className="section-label-sm">Promo Code</label>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <input
                                        type="text"
                                        className="modern-input"
                                        placeholder="Enter promo code"
                                        value={promoCode}
                                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleValidatePromoCode(); }}
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="discount-btn active"
                                        onClick={handleValidatePromoCode}
                                        disabled={promoValidating || !promoCode.trim()}
                                        style={{
                                            padding: '0 16px',
                                            opacity: promoValidating || !promoCode.trim() ? 0.6 : 1,
                                            minWidth: '80px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        }}
                                    >
                                        {promoValidating ? (
                                            <div style={{
                                                width: '14px', height: '14px',
                                                border: '2px solid #fff',
                                                borderTopColor: 'transparent',
                                                borderRadius: '50%',
                                                animation: 'spin 0.6s linear infinite',
                                            }} />
                                        ) : 'Apply'}
                                    </button>
                                </div>
                                {promoResult && (
                                    <div style={{
                                        marginTop: '6px',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        background: promoResult.valid ? '#d4edda' : '#f8d7da',
                                        color: promoResult.valid ? '#155724' : '#721c24',
                                        border: `1px solid ${promoResult.valid ? '#c3e6cb' : '#f5c6cb'}`,
                                    }}>
                                        {promoResult.valid
                                            ? `✓ ${promoResult.description || `${promoResult.discountPercent}% off applied`}`
                                            : `✗ ${promoResult.error || 'Invalid code'}`
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Conditional Payment Method Fields */}
                    <div className="method-specific-section">
                        {paymentMethod === 'cash' && (
                            <>
                                <div className="prediction-section">
                                    <p className="section-label-sm">Suggested Amounts</p>
                                    <div className="prediction-grid">
                                        {generatePredictions(finalTotal).map(pred => (
                                            <button
                                                key={pred}
                                                className={`prediction-btn ${parseFloat(cashReceived) === pred ? 'active' : ''}`}
                                                onClick={() => setCashReceived(pred.toString())}
                                            >
                                                {formatCurrency(pred)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="modern-label">Tendered Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="modern-input-lg"
                                        placeholder="0.00"
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value)}
                                        autoFocus
                                    />
                                    {cashReceived && parseFloat(cashReceived) < finalTotal - 0.001 && (
                                        <span className="error-text">Insufficient amount</span>
                                    )}
                                </div>
                            </>
                        )}

                        {paymentMethod === 'mobile' && (
                            <div className="mobile-payment-form">
                                <div className="provider-selection">
                                    <p className="section-label-sm">Mobile Provider</p>
                                    <div className="discount-grid">
                                        {['GCash', 'Maya'].map(p => (
                                            <button
                                                key={p}
                                                className={`discount-btn ${mobileProvider === p ? 'active' : ''}`}
                                                onClick={() => setMobileProvider(p)}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="input-group" style={{ marginTop: '15px' }}>
                                    <label className="modern-label">Reference Number</label>
                                    <input
                                        type="text"
                                        className="modern-input-lg"
                                        placeholder="Ref #"
                                        value={refNo}
                                        onChange={(e) => setRefNo(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'card' && (
                            <div className="card-payment-form">
                                <div className="input-row" style={{ display: 'flex', gap: '10px' }}>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label className="modern-label">Reference Number</label>
                                        <input
                                            type="text"
                                            className="modern-input"
                                            style={{ height: '45px', fontSize: '1.2rem' }}
                                            placeholder="Ref #"
                                            value={refNo}
                                            onChange={(e) => setRefNo(e.target.value)}
                                        />
                                    </div>
                                    <div className="input-group" style={{ width: '120px' }}>
                                        <label className="modern-label">Last 4 Digits</label>
                                        <input
                                            type="text"
                                            className="modern-input"
                                            style={{ height: '45px', fontSize: '1.2rem' }}
                                            placeholder="0000"
                                            maxLength={4}
                                            value={cardLast4}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 4) setCardLast4(val);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Breakdown & Summary */}
                <div className="payment-sidebar">
                    <div className="summary-card">
                        <div className="summary-row">
                            <span>Original Total:</span>
                            <span>{formatCurrency(initialTotal)}</span>
                        </div>
                        {discountType !== 'none' && (
                            <>
                                <div className="summary-row discount">
                                    <span>Discount ({discountType.toUpperCase()}):</span>
                                    <span>-{formatCurrency(discountAmount)}</span>
                                </div>
                            </>
                        )}
                        <div className="summary-total">
                            <p className="section-label-sm">Final Amount</p>
                            <h2>{formatCurrency(finalTotal)}</h2>
                        </div>
                    </div>

                    <div className="change-display">
                        <p className="section-label-sm">Change Due</p>
                        <h2 style={{ fontSize: '2rem', margin: '5px 0' }}>{formatCurrency(currentChangeAmount)}</h2>
                    </div>

                    {currentChangeAmount > 0.001 && (
                        <div className="breakdown-section">
                            <p className="section-label-sm">Denomination Breakdown</p>
                            <div className="breakdown-list">
                                {getDenominationBreakdown(currentChangeAmount).map((item, idx) => (
                                    <div key={idx} className="breakdown-chip">
                                        <span className="breakdown-count">{item.count}×</span>
                                        <span className="breakdown-label">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="modal-actions">
                <button className="cancel-btn" onClick={handleCancelPayment}>Cancel</button>
                <button
                    className={`complete-btn ${(() => {
                        if (paymentMethod === 'cash') return (parseFloat(cashReceived) >= finalTotal - 0.001) ? 'active' : '';
                        if (paymentMethod === 'card') return (refNo.trim() !== '' && cardLast4.length === 4) ? 'active' : '';
                        if (paymentMethod === 'mobile') return (refNo.trim() !== '') ? 'active' : '';
                        return '';
                    })()}`}
                    disabled={(() => {
                        if (paymentMethod === 'cash') return (parseFloat(cashReceived) < finalTotal - 0.001 || !cashReceived);
                        if (paymentMethod === 'card') return (refNo.trim() === '' || cardLast4.length !== 4);
                        if (paymentMethod === 'mobile') return (refNo.trim() === '');
                        return true;
                    })() || isSubmitting}
                    onClick={onComplete}
                >
                    Complete Payment
                </button>
            </div>
        </div>
    );
};

export default PaymentForm;
