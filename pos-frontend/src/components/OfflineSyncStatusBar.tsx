'use client';

/**
 * OfflineSyncStatusBar.tsx
 * POS-S6-008-T4: Persistent sync-status banner rendered at the top of the app.
 *
 * States:
 *  • Offline             → amber banner with warning
 *  • Online + syncing    → blue animated badge
 *  • Online + errors     → red badge (click to open SyncErrorsModal)
 *  • Online + queue > 0  → blue info badge (pending)
 *  • All clear           → renders nothing
 */

import React from 'react';

interface OfflineSyncStatusBarProps {
  isOnline: boolean;
  pendingCount: number;
  errorCount: number;
  isSyncing: boolean;
  onViewErrors: () => void;
}

const OfflineSyncStatusBar: React.FC<OfflineSyncStatusBarProps> = ({
  isOnline,
  pendingCount,
  errorCount,
  isSyncing,
  onViewErrors,
}) => {
  // ── Offline state ─────────────────────────────────────────────
  if (!isOnline) {
    return (
      <div
        id="offline-status-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 20px',
          background: 'linear-gradient(90deg, #92400e 0%, #b45309 100%)',
          color: '#fffbeb',
          fontSize: '0.875rem',
          fontWeight: 600,
          borderBottom: '1px solid #d97706',
          userSelect: 'none',
          zIndex: 9999,
          position: 'relative',
        }}
      >
        {/* Pulsing dot */}
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#fbbf24',
            flexShrink: 0,
            animation: 'offlinePulse 1.5s ease-in-out infinite',
          }}
        />
        <span style={{ fontSize: '1rem' }}>📶</span>
        <span>
          You&rsquo;re offline — sales are being saved locally and will sync automatically when
          connectivity is restored.
        </span>
        {pendingCount > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            {pendingCount} pending
          </span>
        )}
        <style>{`
          @keyframes offlinePulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
        `}</style>
      </div>
    );
  }

  // ── Error state (online but some txns permanently failed) ─────
  if (errorCount > 0) {
    return (
      <div
        id="sync-error-status-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '9px 20px',
          background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)',
          color: '#fef2f2',
          fontSize: '0.875rem',
          fontWeight: 600,
          borderBottom: '1px solid #dc2626',
          cursor: 'pointer',
          userSelect: 'none',
          zIndex: 9999,
          position: 'relative',
          transition: 'opacity 0.15s',
        }}
        onClick={onViewErrors}
        title="Click to review sync errors"
        role="button"
      >
        <span style={{ fontSize: '1rem' }}>⚠️</span>
        <span>
          {errorCount} transaction{errorCount !== 1 ? 's' : ''} failed to sync and require
          manager review.
        </span>
        <span
          style={{
            marginLeft: 'auto',
            background: '#dc2626',
            border: '1px solid #fca5a5',
            borderRadius: '20px',
            padding: '2px 12px',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
          }}
        >
          Review errors →
        </span>
      </div>
    );
  }

  // ── Syncing state ─────────────────────────────────────────────
  if (isSyncing && pendingCount > 0) {
    return (
      <div
        id="syncing-status-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '9px 20px',
          background: 'linear-gradient(90deg, #1e3a5f 0%, #1d4ed8 100%)',
          color: '#eff6ff',
          fontSize: '0.875rem',
          fontWeight: 600,
          borderBottom: '1px solid #3b82f6',
          userSelect: 'none',
          zIndex: 9999,
          position: 'relative',
        }}
      >
        {/* Spinning sync icon */}
        <span
          style={{
            display: 'inline-block',
            fontSize: '1rem',
            animation: 'syncSpin 1s linear infinite',
          }}
        >
          ⟳
        </span>
        <span>
          Syncing {pendingCount} offline transaction{pendingCount !== 1 ? 's' : ''}…
        </span>
        <style>{`
          @keyframes syncSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ── Pending (online but not yet syncing) ──────────────────────
  if (pendingCount > 0) {
    return (
      <div
        id="pending-sync-status-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '9px 20px',
          background: 'linear-gradient(90deg, #1e3a5f 0%, #0369a1 100%)',
          color: '#e0f2fe',
          fontSize: '0.875rem',
          fontWeight: 600,
          borderBottom: '1px solid #0ea5e9',
          userSelect: 'none',
          zIndex: 9999,
          position: 'relative',
        }}
      >
        <span style={{ fontSize: '1rem' }}>🔄</span>
        <span>
          {pendingCount} offline transaction{pendingCount !== 1 ? 's' : ''} queued — will sync
          shortly.
        </span>
      </div>
    );
  }

  // ── All clear — render nothing ────────────────────────────────
  return null;
};

export default OfflineSyncStatusBar;
