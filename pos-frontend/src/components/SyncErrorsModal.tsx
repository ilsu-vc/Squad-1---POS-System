'use client';

/**
 * SyncErrorsModal.tsx
 * POS-S6-008-T4: Manager-facing modal for reviewing offline transactions
 * that permanently failed to sync after max retries.
 *
 * Access: requires reports.view permission (Supervisor / Manager / Admin).
 * Features:
 *  • Table of failed transactions with local ID, time, total, items, error reason
 *  • "Retry All" — resets error flag so syncTxnQueue() will attempt them again
 *  • "Dismiss All" — removes acknowledged failures from storage
 */

import React from 'react';
import { QueuedTransaction, retryErroredTxns, dismissErroredTxns } from '../utils/offlineQueue';
import { formatCurrency } from '../utils/numberformatters';

interface SyncErrorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  erroredTxns: QueuedTransaction[];
  onQueueChanged: () => void;   // tells App.tsx to re-read the queue
}

const SyncErrorsModal: React.FC<SyncErrorsModalProps> = ({
  isOpen,
  onClose,
  erroredTxns,
  onQueueChanged,
}) => {
  if (!isOpen) return null;

  const handleRetryAll = () => {
    retryErroredTxns();
    onQueueChanged();
    onClose();
  };

  const handleDismissAll = () => {
    if (
      window.confirm(
        `Permanently delete ${erroredTxns.length} failed transaction record(s)? This cannot be undone.`
      )
    ) {
      dismissErroredTxns();
      onQueueChanged();
      onClose();
    }
  };

  return (
    <div
      id="sync-errors-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
      }}
    >
      <div
        id="sync-errors-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
              ⚠️ Offline Sync Errors
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.85 }}>
              {erroredTxns.length} transaction{erroredTxns.length !== 1 ? 's' : ''} failed to
              sync after {5} attempts and require manager review.
            </p>
          </div>
          <button
            id="sync-errors-modal-close"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '6px 12px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
          {erroredTxns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
              <p style={{ fontWeight: 600, margin: 0 }}>No sync errors. All clear!</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    position: 'sticky',
                    top: 0,
                  }}
                >
                  {['Local ID', 'Time', 'Method', 'Total', 'Items', 'Retries', 'Error'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {erroredTxns.map((txn, idx) => (
                  <tr
                    key={txn.localId}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    {/* Local ID */}
                    <td style={{ padding: '12px 16px' }}>
                      <code
                        style={{
                          background: '#fef2f2',
                          color: '#991b1b',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '0.78rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {txn.localId}
                      </code>
                    </td>
                    {/* Time */}
                    <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {new Date(txn.timestamp).toLocaleString()}
                    </td>
                    {/* Method */}
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#1b2a47' }}>
                      {txn.paymentMethod}
                    </td>
                    {/* Total */}
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1b2a47' }}>
                      {formatCurrency(txn.totalAmount)}
                    </td>
                    {/* Items */}
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      <div style={{ maxWidth: '180px' }}>
                        {txn.items.slice(0, 3).map((item, i) => (
                          <div key={i} style={{ fontSize: '0.78rem', marginBottom: '2px' }}>
                            {item.quantity}× {item.name}
                          </div>
                        ))}
                        {txn.items.length > 3 && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            +{txn.items.length - 3} more
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Retries */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        {txn.retries}/{5}
                      </span>
                    </td>
                    {/* Error */}
                    <td style={{ padding: '12px 16px', color: '#dc2626', maxWidth: '200px' }}>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={txn.errorMessage}
                      >
                        {txn.errorMessage || 'Unknown error'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: '#f8fafc',
          }}
        >
          <button
            id="sync-errors-dismiss-all"
            onClick={handleDismissAll}
            disabled={erroredTxns.length === 0}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: erroredTxns.length === 0 ? 'not-allowed' : 'pointer',
              opacity: erroredTxns.length === 0 ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            Dismiss All
          </button>
          <button
            id="sync-errors-retry-all"
            onClick={handleRetryAll}
            disabled={erroredTxns.length === 0}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: erroredTxns.length === 0
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #01a2ad 0%, #0891b2 100%)',
              color: erroredTxns.length === 0 ? '#94a3b8' : '#fff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: erroredTxns.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: erroredTxns.length > 0 ? '0 4px 12px rgba(1,162,173,0.35)' : 'none',
            }}
          >
            ⟳ Retry All ({erroredTxns.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncErrorsModal;
