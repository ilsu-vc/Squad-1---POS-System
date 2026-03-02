import { useState, useRef } from 'react';
import { calculateReceiptVAT } from '../utils/vatCalculator'; // Added the new VAT service
import './ReprintModal.css';

const SUPERVISOR_PIN = '1234';

const ReprintModal = ({ isOpen, onClose, transactions }) => {
  const [step, setStep] = useState('pin'); // 'pin' | 'search'
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const printRef = useRef(null);

  if (!isOpen) return null;

  // --- PIN Step ---
  const handlePinDigit = (digit) => {
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

  // --- Search Step ---
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

  return (
    <div className="reprint-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>

      {/* ── STEP 1: SUPERVISOR PIN ── */}
      {step === 'pin' && (
        <div className="reprint-modal pin-modal">
          <div className="reprint-modal-header">
            <div>
              <h2 className="reprint-title">Supervisor Approval</h2>
              <p className="reprint-subtitle">Enter supervisor PIN to continue</p>
            </div>
            <button className="reprint-close-btn" onClick={handleClose}>✕</button>
          </div>

          <div className="pin-dots-row">
            {[0,1,2,3].map(i => (
              <div key={i} className={`pin-dot ${pinInput.length > i ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
            ))}
          </div>

          {pinError && <p className="pin-error-msg">{pinError}</p>}

          <div className="pin-pad">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, idx) => (
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

      {/* ── STEP 2: SEARCH & PRINT ── */}
      {step === 'search' && (
        <div className="reprint-modal search-modal">
          <div className="reprint-modal-header">
            <div>
              <h2 className="reprint-title">Reprint Receipt</h2>
              <p className="reprint-subtitle">Search by receipt number or transaction ID</p>
            </div>
            <button className="reprint-close-btn" onClick={handleClose}>✕</button>
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

          {/* Receipt Card */}
          {q && matchedTxn ? (
            <>
              <div className="receipt-print-area" ref={printRef}>
                {/* REPRINT watermark */}
                <div className="reprint-watermark">REPRINT</div>

                <div className="receipt-header">
                  <h3 className="receipt-store-name">PharmaCare Drugstore</h3>

                  {/* NEW: Address + TIN */}
                  <p className="receipt-store-sub receipt-store-line">123 Sample St., Brgy. Example, City, Philippines</p>
                  <p className="receipt-store-sub receipt-store-line">TIN: 000-000-000-000</p>

                  <p className="receipt-store-sub">Official Receipt</p>
                  <div className="receipt-divider" />
                  <p className="receipt-meta">Receipt #: <strong>{matchedTxn.receiptNumber ?? '—'}</strong></p>
                  <p className="receipt-meta">Transaction ID: <strong>{matchedTxn.id}</strong></p>
                  <p className="receipt-meta">Date: <strong>{matchedTxn.date}</strong></p>
                  <p className="receipt-meta">Time: <strong>{matchedTxn.time}</strong></p>
                  <p className="receipt-meta">Payment: <strong>{matchedTxn.method}</strong></p>
                  {matchedTxn.customerName && (
                    <p className="receipt-meta">Customer: <strong>{matchedTxn.customerName}</strong></p>
                  )}
                </div>

                <div className="receipt-divider dashed" />

                <div className="receipt-items">
                  {matchedTxn.items.map((item, idx) => (
                    <div key={idx} className="receipt-item-row">
                      <div>
                        <span className="receipt-item-name">{item.name}</span>
                        <span className="receipt-item-calc"> ×{item.qty} @ ₱{item.price.toFixed(2)}</span>
                      </div>
                      <span className="receipt-item-total">₱{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="receipt-divider dashed" />

                {/* UPDATED: New VAT Breakdown for POS-008 */}
                <div className="receipt-summary">
                  {(() => {
                    // Extract the final total amount properly
                    const finalTotal = typeof matchedTxn.amount === 'number' 
                      ? matchedTxn.amount 
                      : (matchedTxn.subtotal + matchedTxn.tax - (matchedTxn.discountAmount || 0));
                    
                    const taxDetails = calculateReceiptVAT(finalTotal);

                    return (
                      <>
                        <div className="receipt-summary-row">
                          <span>VAT-Exclusive Amount</span>
                          <span>₱{taxDetails.vatExclusive.toFixed(2)}</span>
                        </div>
                        <div className="receipt-summary-row">
                          <span>VAT Amount (12%)</span>
                          <span>₱{taxDetails.vatAmount.toFixed(2)}</span>
                        </div>
                        
                        {matchedTxn.discountType && matchedTxn.discountType !== 'none' && (
                          <div className="receipt-summary-row discount">
                            <span>Discount ({matchedTxn.discountType.toUpperCase()})</span>
                            <span>-₱{(matchedTxn.discountAmount ?? 0).toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="receipt-divider" />
                        <div className="receipt-summary-row total-row">
                          <span>Total (VAT-Inclusive)</span>
                          <span>₱{taxDetails.totalInclusive.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="receipt-divider dashed" />
                <p className="receipt-footer">Thank you for your purchase!</p>

                {/* NEW: BIR required validity line */}
                <p className="receipt-footer bir-line">
                  THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP
                </p>

                <p className="receipt-footer small">This is a computer-generated receipt.</p>
              </div>

              <div className="reprint-actions no-print">
                <button className="reprint-cancel-btn" onClick={handleClose}>Close</button>
                <button className="reprint-print-btn" onClick={handlePrint}>🖨 Print Receipt</button>
              </div>
            </>
          ) : q && !matchedTxn ? (
            <div className="reprint-not-found">
              <p>No transaction found for "<strong>{searchQuery}</strong>"</p>
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
