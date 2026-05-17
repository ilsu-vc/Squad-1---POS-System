'use client';

import React, { useMemo } from 'react';
import QRCode from 'qrcode.react';
import { formatCurrency } from '../utils/numberformatters';
import './ReceiptStyles.css';

interface GCashQRPanelProps {
  provider: 'GCash' | 'Maya';
  amount: number;
  referenceNumber?: string;
  transactionId?: string;
  showDetails?: boolean;
}

const GCashQRPanel: React.FC<GCashQRPanelProps> = ({
  provider,
  amount,
  referenceNumber,
  transactionId,
  showDetails = true,
}) => {
  // Generate QR code data payload
  // Format: merchant|amount|reference|provider
  const qrData = useMemo(() => {
    const payload = {
      provider,
      amount: amount.toFixed(2),
      reference: referenceNumber || 'N/A',
      transactionId: transactionId || 'N/A',
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(payload);
  }, [provider, amount, referenceNumber, transactionId]);

  return (
    <div className="gcash-qr-panel">
      <div className="qr-container">
        <div className="qr-box">
          <QRCode
            value={qrData}
            size={200}
            level="H"
            includeMargin={true}
            renderAs="canvas"
          />
        </div>
        <p className="qr-label">Scan to pay with {provider}</p>
      </div>

      {showDetails && (
        <div className="qr-details">
          <div className="detail-row">
            <span className="detail-label">Payment Method:</span>
            <span className="detail-value">{provider}</span>
          </div>
          <div className="detail-row highlight">
            <span className="detail-label">Amount:</span>
            <span className="detail-value amount">{formatCurrency(amount)}</span>
          </div>
          {referenceNumber && (
            <div className="detail-row">
              <span className="detail-label">Ref #:</span>
              <span className="detail-value">{referenceNumber}</span>
            </div>
          )}
          {transactionId && (
            <div className="detail-row">
              <span className="detail-label">Transaction ID:</span>
              <span className="detail-value txn-id">{transactionId}</span>
            </div>
          )}
        </div>
      )}

      <div className="qr-instructions">
        <h4>Instructions:</h4>
        <ol>
          <li>Open {provider} app on your phone</li>
          <li>Select "Scan QR Code"</li>
          <li>Point camera at the QR code above</li>
          <li>Confirm payment amount: <strong>{formatCurrency(amount)}</strong></li>
          <li>Complete the transaction</li>
        </ol>
      </div>
    </div>
  );
};

export default GCashQRPanel;
