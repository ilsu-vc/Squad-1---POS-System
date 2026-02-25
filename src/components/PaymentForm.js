import React, { useState, useEffect } from 'react';

const PaymentForm = ({
  total: initialTotal,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  changeAmount: initialChangeAmount,
  handleCancelPayment,
  handleCompletePayment,
  closePaymentModal,
  icons: { cash_icon, card_icon, mobile_icon }
}) => {
  // --- Essential States ---
  const [customerName, setCustomerName] = useState('');
  const [discountType, setDiscountType] = useState('none'); // 'none', 'senior', 'pwd'
  const [refNo, setRefNo] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [mobileProvider, setMobileProvider] = useState('GCash'); // GCash, Maya, GrabPay

  // --- Derived Calculations ---
  const [finalTotal, setFinalTotal] = useState(initialTotal);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    if (discountType === 'none') {
      setFinalTotal(initialTotal);
      setDiscountAmount(0);
    } else {
      // PH Logic: Remove 12% VAT, then apply 20% discount
      const vatable = initialTotal / 1.12;
      const discount = vatable * 0.20;
      setDiscountAmount(discount);
      setFinalTotal(initialTotal - (initialTotal - vatable) - discount);
    }
  }, [discountType, initialTotal]);

  // Recalculate change based on discounted total
  const currentCashReceived = parseFloat(cashReceived) || 0;
  const currentChangeAmount = Math.max(0, currentCashReceived - finalTotal);

  // Helper to generate predicted amount buttons
  const generatePredictions = (totalAmount) => {
    const predictions = new Set();
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

  const getDenominationBreakdown = (amount) => {
    let totalCents = Math.round(amount * 100);
    const denoms = [
      { v: 100000, l: '1000 peso' }, { v: 50000, l: '500 peso' },
      { v: 20000, l: '200 peso' }, { v: 10000, l: '100 peso' },
      { v: 5000, l: '50 peso' }, { v: 2000, l: '20 peso' },
      { v: 1000, l: '10 peso' }, { v: 500, l: '5 peso' },
      { v: 100, l: '1 peso' }, { v: 25, l: '25 centavo' },
      { v: 10, l: '10 centavo' }, { v: 5, l: '5 centavo' },
      { v: 1, l: '1 centavo' }
    ];
    const breakdown = [];
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
      tendered: cashReceived
    };
    handleCompletePayment(details);
  };

  if (!paymentMethod) {
    return (
      <div className="payment-options">
        <p className="section-label">Select Payment Method</p>
        <div className="method-grid">
          <button className="method-item" onClick={() => setPaymentMethod('cash')}>
            <img src={cash_icon} alt="" className="method-img-icon" />
            <span>Cash</span>
          </button>
          <button className="method-item" onClick={() => setPaymentMethod('card')}>
            <img src={card_icon} alt="" className="method-img-icon" />
            <span>Card</span>
          </button>
          <button className="method-item" onClick={() => setPaymentMethod('mobile')}>
            <img src={mobile_icon} alt="" className="method-img-icon" />
            <span>Mobile</span>
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

            <div className="discount-section">
              <label className="section-label-sm">Applied Discount</label>
              <div className="discount-grid">
                {['none', 'senior', 'pwd'].map(type => (
                  <button 
                    key={type}
                    className={`discount-btn ${discountType === type ? 'active' : ''}`}
                    onClick={() => setDiscountType(type)}
                  >
                    {type === 'none' ? 'No Discount' : type.toUpperCase()}
                  </button>
                ))}
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
                        ₱{pred.toLocaleString(undefined, { minimumFractionDigits: finalTotal % 1 === 0 ? 0 : 2 })}
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
                    {['GCash', 'Maya',].map(p => (
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
                      maxLength="4"
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
              <span>₱{initialTotal.toFixed(2)}</span>
            </div>
            {discountType !== 'none' && (
              <>
                <div className="summary-row discount">
                  <span>Discount ({discountType.toUpperCase()}):</span>
                  <span>-₱{discountAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="summary-total">
              <p className="section-label-sm">Final Amount</p>
              <h2>₱{finalTotal.toFixed(2)}</h2>
            </div>
          </div>

          <div className="change-display">
            <p className="section-label-sm">Change Due</p>
            <h2 style={{ fontSize: '2rem', margin: '5px 0' }}>₱{currentChangeAmount.toFixed(2)}</h2>
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
          })()}
          onClick={onComplete}
        >
          Complete Payment
        </button>
      </div>
    </div>
  );
};

export default PaymentForm;
