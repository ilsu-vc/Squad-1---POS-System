import React from 'react';
import PaymentForm from './PaymentForm';

const PaymentModal = ({
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
  icons
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
          <p>Transaction completed</p>
          <button className="close-success-btn" onClick={closePaymentModal}>Back to POS</button>
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
            <h1 className="total-h1">₱{total.toFixed(2)}</h1>
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
          />
        </div>
      )}
    </div>
  );
};

export default PaymentModal;
