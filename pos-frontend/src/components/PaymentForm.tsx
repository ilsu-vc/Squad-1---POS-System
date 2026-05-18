'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { discountApi, DiscountValidationResult, DiscountApprovalRequest } from '../services/discountApi';

// Number format utility
import { formatCurrency } from '../utils/numberformatters';
import SplitPaymentForm, { PaymentEntry } from './SplitPaymentForm';
import GCashQRPanel from './GCashQRPanel';
import { calculateTaxDiscountBreakdown, TaxDiscountBreakdown } from '../utils/vatCalculator';

interface PaymentIcons {
    cash_icon: any;
    card_icon: any;
    mobile_icon: any;
}

interface PaymentFormProps {
    total: number;
    subtotal?: number;
    tax?: number;
    taxBreakdown?: TaxDiscountBreakdown;
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
    preAppliedDiscountAmount?: number;
    preAppliedDiscountType?: string;
    preAppliedDiscountPercent?: number;
}

const toTitleCase = (value: string): string =>
    value
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const toSentenceCase = (value: string): string => {
    const lower = value.toLowerCase();
    return lower.replace(/(^\s*[a-z])|([.!?]\s*[a-z])/g, (match) => match.toUpperCase());
};

const PaymentForm: React.FC<PaymentFormProps> = ({
    total: initialTotal,
    subtotal = 0,
    tax = 0,
    taxBreakdown: preAppliedTaxBreakdown,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    handleCancelPayment,
    handleCompletePayment,
    icons: { cash_icon, card_icon, mobile_icon },
    canApproveDiscount = false,
    isSubmitting = false,
    preAppliedDiscountAmount = 0,
    preAppliedDiscountType = 'none',
    preAppliedDiscountPercent = 0,
}) => {
    const isPromoApplied = !!(preAppliedDiscountType && !['none', 'senior', 'pwd'].includes(preAppliedDiscountType.toLowerCase()));
    // --- Essential States ---
    const [customerName, setCustomerName] = useState('');
    const [discountType, setDiscountType] = useState(preAppliedDiscountType || 'none'); // 'none', 'senior', 'pwd'
    const [notes, setNotes] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [refNo, setRefNo] = useState('');
    const [cardLast4, setCardLast4] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [mobileProvider, setMobileProvider] = useState<'gcash' | 'maya' | 'qrph'>('gcash');
    const [isSplitMode, setIsSplitMode] = useState(false);
    // ── OR (Official Receipt) Fields ---
    const [orFields, setOrFields] = useState({
        name: '',
        tin: '',
        address: '',
    });
    const [customDiscountPercent, setCustomDiscountPercent] = useState(preAppliedDiscountPercent || 0);

    // ── POS-S4-008-T2: Manual discount approval state ──
    const [approvalStatus, setApprovalStatus] = useState<DiscountApprovalRequest | null>(null);
    const [approvalPolling, setApprovalPolling] = useState(false);

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
    const [discountAmount, setDiscountAmount] = useState(preAppliedDiscountAmount || 0);
    const [taxBreakdown, setTaxBreakdown] = useState<TaxDiscountBreakdown>(
        preAppliedTaxBreakdown || calculateTaxDiscountBreakdown({
            subtotal: subtotal || Math.max(0, initialTotal - tax),
            vat: tax,
            discountType: preAppliedDiscountType,
            discountAmount: preAppliedDiscountAmount,
        })
    );

    const getImgSrc = (img: any): string => {
        return typeof img === 'string' ? img : img?.src ?? '';
    };

    useEffect(() => {
        const shouldUsePreAppliedBreakdown =
            preAppliedTaxBreakdown &&
            preAppliedDiscountAmount > 0 &&
            String(discountType || '').toLowerCase() === String(preAppliedDiscountType || '').toLowerCase();
        
        let percent = 0;
        const normType = String(discountType || '').toLowerCase();
        if (normType === 'senior' || normType === 'pwd') {
            percent = 20;
        } else if (normType !== 'none') {
            percent = customDiscountPercent;
        }

        const nextBreakdown = shouldUsePreAppliedBreakdown
            ? preAppliedTaxBreakdown
            : calculateTaxDiscountBreakdown({
                subtotal: subtotal || Math.max(0, initialTotal - tax),
                vat: tax,
                discountType,
                discountPercent: percent,
            });

        setDiscountAmount(nextBreakdown.discountAmount);
        setFinalTotal(nextBreakdown.totalDue);
        setTaxBreakdown(nextBreakdown);
    }, [discountType, initialTotal, preAppliedDiscountAmount, preAppliedDiscountType, preAppliedTaxBreakdown, subtotal, tax, customDiscountPercent]);

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

    const onComplete = async () => {
        try {
            // ✅ Only send if OR is requested
            if (selectedTags.includes('Request for Official Receipt (OR)')) {
                await fetch('http://localhost:4002/receipt/info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...orFields, name: toTitleCase(orFields.name) }),
                });
            }

            const details = {
                customerName: toTitleCase(customerName),
                discountType,
                discountAmount,
                finalTotal,
                refNo: paymentMethod === 'card' ? 'CARD-ONLINE' : paymentMethod === 'mobile' ? `${mobileProvider.toUpperCase()}-ONLINE` : refNo,
                cardLast4: paymentMethod === 'card' ? '0000' : cardLast4,
                cardNumber: '',
                mobileNumber: '',
                mobileProvider,
                tendered: cashReceived,
                notes,
                tags: selectedTags,
                taxBreakdown,
                orFields: selectedTags.includes('Request for Official Receipt (OR)')
                    ? { ...orFields, name: toTitleCase(orFields.name) }
                    : undefined,
            };

            handleCompletePayment(details);

        } catch (err) {
            console.error('Failed to save OR info:', err);
            alert('Failed to save receipt details.');
        }
    };

    const onSplitComplete = (entries: PaymentEntry[]) => {
        const totalCash = entries
            .filter(e => e.method === 'cash')
            .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const totalPaid = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const change = Math.max(0, totalCash - (totalCash - Math.max(0, totalPaid - finalTotal)));

        handleCompletePayment({
            customerName: toTitleCase(customerName),
            discountType,
            discountAmount,
            finalTotal,
            splitPayments: entries,
            changeAmount: change,
            notes,
            tags: selectedTags,
            taxBreakdown,
            orFields: selectedTags.includes('Request for Official Receipt (OR)')
                ? { ...orFields, name: toTitleCase(orFields.name) }
                : undefined,
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
                            onChange={(e) => setCustomerName(toTitleCase(e.target.value))}
                            placeholder="Walking Customer"
                        />
                    </div>

                    {/* Applied Discount moved up */}
                    <div className="discount-section" style={{ marginTop: '15px' }}>
                        <label className="section-label-sm">Applied Discount</label>
                        <div className="discount-grid">
                            {(['none', 'senior', 'pwd'] as const).map(type => (
                                <button
                                    key={type}
                                    className={`discount-btn ${
                                        (type === 'none' && !['senior', 'pwd'].includes(discountType.toLowerCase())) || 
                                        discountType.toLowerCase() === type 
                                            ? 'active' : ''
                                    }`}
                                    onClick={() => {
                                        setDiscountType(type);
                                        setCustomDiscountPercent(0);
                                    }}
                                    disabled={(!canApproveDiscount && type !== 'none') || (type !== 'none' && isPromoApplied)}
                                >
                                    {type === 'none' ? 'No Discount' : type.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        {isPromoApplied && (
                            <div style={{ color: '#0284c7', background: '#e0f2fe', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', marginTop: '10px', lineHeight: '1.4' }}>
                                ℹ️ Promo code <strong>{preAppliedDiscountType}</strong> applied from the main screen. To use Senior Citizen or PWD discount, please clear the discount code on the main screen.
                            </div>
                        )}
                    </div>

                    <div className="input-group" style={{ marginTop: '15px' }}>
                        <label className="section-label-sm">Transaction Tags</label>
                        <div className="discount-grid">
                            {['Request for Official Receipt (OR)'].map(tag => (
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


                    {/* Dynamic OR Fields */}
                    {selectedTags.includes('Request for Official Receipt (OR)') && (
                        <div className="input-group" style={{ marginTop: '15px', padding: '12px', borderLeft: '4px solid #007bff', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                            <label className="section-label-sm">Official Receipt Details</label>
                            <div style={{ marginTop: '12px' }}>
                                <label className="section-label-sm">Name</label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    value={orFields.name}
                                    onChange={(e) => setOrFields({ ...orFields, name: toTitleCase(e.target.value) })}
                                    placeholder="Full Name"
                                />
                            </div>
                            <div style={{ marginTop: '12px' }}>
                                <label className="section-label-sm">TIN (Taxpayer Identification Number)</label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    value={orFields.tin}
                                    onChange={(e) => setOrFields({ ...orFields, tin: e.target.value })}
                                    placeholder="000-000-000-000"
                                />
                            </div>
                            <div style={{ marginTop: '12px' }}>
                                <label className="section-label-sm">Address</label>
                                <textarea
                                    className="modern-input"
                                    style={{ height: '60px', resize: 'none', paddingTop: '10px' }}
                                    value={orFields.address}
                                    onChange={(e) => setOrFields({ ...orFields, address: e.target.value })}
                                    placeholder="Full Address"
                                />
                            </div>
                        </div>
                    )}

                    <div className="input-group" style={{ marginTop: '15px' }}>
                        <label className="section-label-sm">Transaction Notes ({notes.length}/500)</label>
                        <textarea
                            className="modern-input"
                            style={{ height: '60px', resize: 'none', paddingTop: '10px' }}
                            value={notes}
                            onChange={(e) => setNotes(toSentenceCase(e.target.value).slice(0, 500))}
                            placeholder="Add special instructions..."
                        />
                    </div>

                    {/* SplitPaymentForm remains at the bottom */}
                    <div style={{ marginTop: '15px' }}>
                        <SplitPaymentForm
                            finalTotal={finalTotal}
                            icons={{ cash_icon, card_icon, mobile_icon }}
                            onComplete={onSplitComplete}
                            onCancel={handleCancelPayment}
                            onBack={() => {
                                setIsSplitMode(false);
                                setPaymentMethod(null);
                            }}
                            isSubmitting={isSubmitting}
                            isValid={!selectedTags.includes('Request for Official Receipt (OR)') || (orFields.name.trim() !== '' && orFields.tin.trim() !== '' && orFields.address.trim() !== '')}
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
                    <button className="method-item split-method-item" onClick={() => {
                        setPaymentMethod('split');
                        setIsSplitMode(true);
                    }}>
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
                            onChange={(e) => setCustomerName(toTitleCase(e.target.value))}
                            placeholder="Walking Customer"
                        />
                        </div>

                        <div className="input-group" style={{ marginTop: '15px' }}>
                            <label className="section-label-sm">Transaction Tags</label>
                            <div className="discount-grid">
                                {['Request for Official Receipt (OR)'].map(tag => (
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
                                onChange={(e) => setNotes(toSentenceCase(e.target.value).slice(0, 500))}
                                placeholder="Add special instructions or customer requests..."
                            />
                        </div>

                        {/* Dynamic OR Fields */}
                        {selectedTags.includes('Request for Official Receipt (OR)') && (
                            <div className="input-group" style={{ marginTop: '15px', padding: '12px', borderLeft: '4px solid #007bff', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                <label className="section-label-sm">Official Receipt Details</label>
                                <div style={{ marginTop: '12px' }}>
                                    <label className="section-label-sm">Name</label>
                                    <input
                                        type="text"
                                        className="modern-input"
                                        value={orFields.name}
                                        onChange={(e) => setOrFields({ ...orFields, name: toTitleCase(e.target.value) })}
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <label className="section-label-sm">TIN (Taxpayer Identification Number)</label>
                                    <input
                                        type="text"
                                        className="modern-input"
                                        value={orFields.tin}
                                        onChange={(e) => setOrFields({ ...orFields, tin: e.target.value })}
                                        placeholder="000-000-000-000"
                                    />
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <label className="section-label-sm">Address</label>
                                    <textarea
                                        className="modern-input"
                                        style={{ height: '60px', resize: 'none', paddingTop: '10px' }}
                                        value={orFields.address}
                                        onChange={(e) => setOrFields({ ...orFields, address: e.target.value })}
                                        placeholder="Full Address"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="discount-section">
                            <label className="section-label-sm">Applied Discount</label>
                            <div className="discount-grid">
                                {(['none', 'senior', 'pwd'] as const).map(type => (
                                    <button
                                        key={type}
                                        className={`discount-btn ${
                                            (type === 'none' && !['senior', 'pwd'].includes(discountType.toLowerCase())) || 
                                            discountType.toLowerCase() === type 
                                                ? 'active' : ''
                                        }`}
                                        onClick={() => {
                                            if (canApproveDiscount || type === 'none') {
                                                setDiscountType(type);
                                            } else {
                                                handleRequestApproval(type);
                                            }
                                        }}
                                        disabled={(approvalPolling && !canApproveDiscount && type !== 'none') || (type !== 'none' && isPromoApplied)}
                                        title={!canApproveDiscount && type !== 'none' ? 'Requires supervisor approval — will request' : undefined}
                                    >
                                        {type === 'none' ? 'No Discount' : type.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            {isPromoApplied && (
                                <div style={{ color: '#0284c7', background: '#e0f2fe', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', marginTop: '10px', lineHeight: '1.4' }}>
                                    ℹ️ Promo code <strong>{preAppliedDiscountType}</strong> applied from the main screen. To use Senior Citizen or PWD discount, please clear the discount code on the main screen.
                                </div>
                            )}

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
                                    <p className="section-label-sm">Select Mobile Payment Method</p>
                                    <div className="discount-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                                        <button
                                            className={`discount-btn ${mobileProvider === 'gcash' ? 'active' : ''}`}
                                            onClick={() => setMobileProvider('gcash')}
                                            style={{ padding: '15px', fontSize: '1rem', fontWeight: 'bold' }}
                                        >
                                            GCash
                                        </button>
                                        <button
                                            className={`discount-btn ${mobileProvider === 'maya' ? 'active' : ''}`}
                                            onClick={() => setMobileProvider('maya')}
                                            style={{ padding: '15px', fontSize: '1rem', fontWeight: 'bold' }}
                                        >
                                            Maya
                                        </button>
                                        <button
                                            className={`discount-btn ${mobileProvider === 'qrph' ? 'active' : ''}`}
                                            onClick={() => setMobileProvider('qrph')}
                                            style={{ padding: '15px', fontSize: '1rem', fontWeight: 'bold' }}
                                        >
                                            QRPh (QR)
                                        </button>
                                    </div>
                                </div>
                                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                    ℹ️ <strong>API Payment Gateway Enabled</strong>:
                                    <br />
                                    Clicking <strong>Complete Payment</strong> below will direct this tab to the secure PayMongo checkout screen for <strong>{mobileProvider === 'qrph' ? 'QRPh' : mobileProvider === 'gcash' ? 'GCash' : 'Maya'}</strong> where you can authorize the payment.
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'card' && (
                            <div className="card-payment-form">
                                <div style={{ marginTop: '15px', padding: '12px 15px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                    ℹ️ <strong>Card Checkout Session Enabled</strong>:
                                    <br />
                                    Clicking <strong>Complete Payment</strong> will direct this tab to the secure credit card checkout.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Breakdown & Summary */}
                <div className="payment-sidebar">
                    <div className="summary-card">
                        <div className="summary-row">
                            <span>Gross Sales:</span>
                            <span>{formatCurrency(taxBreakdown.grossVatableSales + tax)}</span>
                        </div>
                        <div className="summary-row">
                            <span>VATable Sales:</span>
                            <span>{formatCurrency(taxBreakdown.vatableSales)}</span>
                        </div>
                        {taxBreakdown.isVatExempt && (
                            <div className="summary-row">
                                <span>VAT-Exempt Sales:</span>
                                <span>{formatCurrency(taxBreakdown.vatExemptSales)}</span>
                            </div>
                        )}
                        <div className="summary-row">
                            <span>VAT (12%):</span>
                            <span>{formatCurrency(taxBreakdown.vatAmount)}</span>
                        </div>
                        {discountType !== 'none' && (
                            <>
                                {taxBreakdown.vatDeduction > 0 && (
                                    <div className="summary-row discount">
                                        <span>VAT Discount/Deduction:</span>
                                        <span>-{formatCurrency(taxBreakdown.vatDeduction)}</span>
                                    </div>
                                )}
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
                                    <div key={idx} className="breakdown-chip" style={{
                                        backgroundColor: item.label === '1 centavo' ? '#ffebee' : undefined,
                                        borderColor: item.label === '1 centavo' ? '#ff5252' : undefined,
                                    }}>
                                        <span className="breakdown-count">{item.count}×</span>
                                        <span className="breakdown-label" style={{
                                            color: item.label === '1 centavo' ? '#d32f2f' : undefined,
                                            fontWeight: item.label === '1 centavo' ? '600' : undefined,
                                        }}>{item.label}</span>
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
                        const isOrRequired = selectedTags.includes('Request for Official Receipt (OR)');
                        const isOrValid = !isOrRequired || (orFields.name.trim() && orFields.tin.trim() && orFields.address.trim());
                        
                        if (!isOrValid) return '';
                        
                        if (paymentMethod === 'cash') return (cashReceived && parseFloat(cashReceived) >= finalTotal - 0.001) ? 'active' : '';
                        if (paymentMethod === 'card') return 'active';
                        if (paymentMethod === 'mobile') return 'active';
                        return '';
                    })()}`}
                    disabled={(() => {
                        const isOrRequired = selectedTags.includes('Request for Official Receipt (OR)');
                        const isOrInvalid = isOrRequired && (!orFields.name.trim() || !orFields.tin.trim() || !orFields.address.trim());
                        
                        if (isOrInvalid) return true;
                        
                        if (paymentMethod === 'cash') return (parseFloat(cashReceived) < finalTotal - 0.001 || !cashReceived);
                        if (paymentMethod === 'card') return false;
                        if (paymentMethod === 'mobile') return false;
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
