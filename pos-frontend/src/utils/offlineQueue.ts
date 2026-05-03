import { authFetch } from './authFetch';

/**
 * offlineQueue.ts
 * POS-S4-009-T3 (original): Shift action queue — clock-in/out/break replay.
 * POS-S6-008-T3 (extended): Full transaction offline queue with retry,
 *   error-flagging, and Option-A live OR# patch-back after sync.
 *
 * Two independent queues share this file:
 *   1. pharma_offline_queue  — shift/clock actions (original)
 *   2. pharma_txn_queue      — POS sales transactions (new)
 */

// ═══════════════════════════════════════════════════════════════════
// SECTION 1 — SHIFT ACTION QUEUE (original, unchanged)
// ═══════════════════════════════════════════════════════════════════

export interface QueuedAction {
  id: string;
  timestamp: string;
  type: 'clock-in' | 'clock-out' | 'break-start' | 'break-end';
  url: string;
  method: 'POST' | 'PUT';
  body: Record<string, any>;
  retries: number;
}

const QUEUE_KEY = 'pharma_offline_queue';
const MAX_RETRIES = 5;

// ── Queue persistence ──

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage unavailable
  }
}

// ── Public API ──

/**
 * Add a failed action to the offline queue.
 */
export function enqueueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): void {
  const queue = loadQueue();
  queue.push({
    ...action,
    id: `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    retries: 0,
  });
  saveQueue(queue);
  console.info(`[OfflineQueue] Queued ${action.type} action for later sync.`);
}

/**
 * Get the current offline queue (read-only).
 */
export function getQueuedActions(): QueuedAction[] {
  return loadQueue();
}

/**
 * Get count of pending actions.
 */
export function getQueueLength(): number {
  return loadQueue().length;
}

/**
 * Attempt to sync all queued actions in order.
 * Returns an object with counts of succeeded and failed actions.
 */
export async function syncOfflineQueue(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const queue = loadQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  console.info(`[OfflineQueue] Syncing ${queue.length} queued action(s)...`);

  let synced = 0;
  let failed = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    try {
      const res = await authFetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      });

      if (res.ok) {
        synced++;
        console.info(`[OfflineQueue] Synced: ${action.type} (${action.id})`);
      } else {
        action.retries++;
        if (action.retries < MAX_RETRIES) {
          remaining.push(action);
          console.warn(`[OfflineQueue] Retry ${action.retries}/${MAX_RETRIES}: ${action.type} (${action.id})`);
        } else {
          failed++;
          console.error(`[OfflineQueue] Permanently failed after ${MAX_RETRIES} retries: ${action.type} (${action.id})`);
        }
      }
    } catch (err) {
      // Network still down — keep in queue
      action.retries++;
      if (action.retries < MAX_RETRIES) {
        remaining.push(action);
      } else {
        failed++;
      }
      // Stop syncing if we're offline — no point trying the rest.
      // Push all REMAINING unprocessed items (those after current index).
      const currentIdx = queue.indexOf(action);
      for (let i = currentIdx + 1; i < queue.length; i++) {
        remaining.push(queue[i]);
      }
      break;
    }
  }

  saveQueue(remaining);
  console.info(`[OfflineQueue] Sync complete: ${synced} synced, ${failed} failed, ${remaining.length} remaining.`);

  return { synced, failed, remaining: remaining.length };
}

/**
 * Clear the entire offline queue (e.g., on logout).
 */
export function clearOfflineQueue(): void {
  saveQueue([]);
}

// ── Automatic reconnect sync ──

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isListening = false;

/**
 * Start listening for connectivity changes and auto-sync.
 * Safe to call multiple times — will not duplicate listeners.
 */
export function startOfflineSync(): void {
  if (isListening || typeof window === 'undefined') return;
  isListening = true;

  // Sync when browser comes back online
  window.addEventListener('online', handleOnline);

  // Also periodically check (every 30s) in case the 'online' event is missed
  syncIntervalId = setInterval(() => {
    if (navigator.onLine && getQueueLength() > 0) {
      syncOfflineQueue();
    }
  }, 30000);

  // Attempt an immediate sync if we're already online and have items
  if (navigator.onLine && getQueueLength() > 0) {
    syncOfflineQueue();
  }
}

/**
 * Stop listening for connectivity changes.
 */
export function stopOfflineSync(): void {
  if (!isListening) return;
  isListening = false;

  window.removeEventListener('online', handleOnline);
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

function handleOnline(): void {
  console.info('[OfflineQueue] Connectivity restored, syncing...');
  syncOfflineQueue();
}


// ═══════════════════════════════════════════════════════════════════
// SECTION 2 — TRANSACTION QUEUE (POS-S6-008-T3, new)
// ═══════════════════════════════════════════════════════════════════

const TXN_QUEUE_KEY = 'pharma_txn_queue';
const TXN_MAX_RETRIES = 5;

/** DOM event name — App.tsx listens for this to re-render the status bar */
export const TXN_QUEUE_UPDATED_EVENT = 'txnQueueUpdated';

export interface QueuedTransaction {
  /** Client-generated local ID (e.g. LOCAL-1714000000000) used before the DB assigns a real UUID */
  localId: string;
  timestamp: string;
  retries: number;
  /** true when the entry has permanently failed (retries exhausted) */
  errorFlag: boolean;
  /** human-readable error message from the last failed attempt */
  errorMessage?: string;
  /** Real server-assigned transaction UUID after a successful sync */
  syncedTransactionId?: string;
  /** Real OR# assigned by the server after sync */
  syncedReceiptNumber?: string | null;

  // ── Full payload required to replay the /transactions/complete call ──
  transactionId?: string;        // server UUID (only available when sync succeeded)
  vat: number;
  subtotal: number;
  totalAmount: number;
  amountPaid?: number;
  paymentMethod: string;
  itemsCount: number;
  items: Array<{
    product_id?: string | number;
    name: string;
    category?: string | null;
    unit_price: number;
    quantity: number;
  }>;
  discountType: string;
  discountAmount: number;
  notes?: string;
  tags?: string[];
}

// ── Internal helpers ──────────────────────────────────────────────

function loadTxnQueue(): QueuedTransaction[] {
  try {
    const raw = localStorage.getItem(TXN_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTxnQueue(queue: QueuedTransaction[]): void {
  try {
    localStorage.setItem(TXN_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage quota exceeded — log and continue
    console.error('[TxnQueue] localStorage write failed.');
  }
}

function emitQueueUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TXN_QUEUE_UPDATED_EVENT));
  }
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Add an offline transaction to the queue.
 * Called by App.tsx when the user completes a sale while offline.
 */
export function enqueueTxn(
  payload: Omit<QueuedTransaction, 'timestamp' | 'retries' | 'errorFlag'> & { localId?: string }
): QueuedTransaction {
  const queue = loadTxnQueue();
  const incomingLocalId = payload.localId;

  // Guard: prevent duplicate enqueue of the same localId (e.g. double-tap on
  // "Complete Payment" while offline). Return the existing entry unchanged.
  if (incomingLocalId && queue.some((t) => t.localId === incomingLocalId)) {
    console.warn(`[TxnQueue] Duplicate enqueue blocked for ${incomingLocalId}`);
    return queue.find((t) => t.localId === incomingLocalId)!;
  }

  const entry: QueuedTransaction = {
    ...payload,
    localId: incomingLocalId ?? `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    retries: 0,
    errorFlag: false,
  };
  queue.push(entry);
  saveTxnQueue(queue);
  emitQueueUpdated();
  console.info(`[TxnQueue] Queued offline transaction ${entry.localId}`);
  return entry;
}

/**
 * Read all queued (pending + errored) transactions.
 */
export function getQueuedTxns(): QueuedTransaction[] {
  return loadTxnQueue();
}

/**
 * Count of pending (non-errored) transactions waiting to sync.
 */
export function getTxnQueueLength(): number {
  return loadTxnQueue().filter((t) => !t.errorFlag).length;
}

/**
 * Count of permanently-failed transactions for manager review.
 */
export function getTxnErrorCount(): number {
  return loadTxnQueue().filter((t) => t.errorFlag).length;
}

/**
 * POS-S6-008-T3: Sync all pending offline transactions to the backend.
 *
 * Strategy:
 *   1. POST /api/transactions/transactions/initiate → get a real server transactionId
 *   2. POST /api/transactions/transactions/complete → with that transactionId
 *   3. On success: record the real transactionId + receiptNumber on the entry
 *      and dispatch a patch so App.tsx can update localStorage history (Option A).
 *   4. On failure: increment retries; at MAX_RETRIES set errorFlag = true.
 *
 * Returns summary counts.
 */
export async function syncTxnQueue(): Promise<{
  synced: number;
  failed: number;
  errors: number;
  remaining: number;
}> {
  const queue = loadTxnQueue();
  const pending = queue.filter((t) => !t.errorFlag);

  if (pending.length === 0) {
    return { synced: 0, failed: 0, errors: queue.filter((t) => t.errorFlag).length, remaining: 0 };
  }

  console.info(`[TxnQueue] Syncing ${pending.length} pending transaction(s)...`);

  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      // Atomic Create + Complete: prevents orphaned pending transactions
      const completeRes = await authFetch('/api/transactions/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vat: entry.vat,
          subtotal: entry.subtotal,
          totalAmount: entry.totalAmount,
          amountPaid: entry.amountPaid,
          paymentMethod: entry.paymentMethod,
          itemsCount: entry.itemsCount,
          items: entry.items,
          discountType: entry.discountType,
          discountAmount: entry.discountAmount,
          notes: entry.notes,
          tags: entry.tags,
        }),
      });

      if (!completeRes.ok) {
        const body = await completeRes.json().catch(() => ({}));
        throw new Error(body.error || `Transaction sync failed: HTTP ${completeRes.status}`);
      }

      const { transactionId: serverTxnId, receiptNumber } = await completeRes.json();

      // Mark as synced — record the real IDs
      entry.syncedTransactionId = serverTxnId;
      entry.syncedReceiptNumber = receiptNumber ?? null;
      entry.errorFlag = false;
      synced++;

      console.info(`[TxnQueue] Synced: ${entry.localId} → ${serverTxnId} (OR# ${receiptNumber})`);

      // ── Option A: Dispatch a patch event so App.tsx can update history live ──
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('txnSyncedPatch', {
            detail: {
              localId: entry.localId,
              serverTxnId,
              receiptNumber: receiptNumber ?? null,
            },
          })
        );
      }
    } catch (err: any) {
      entry.retries = (entry.retries ?? 0) + 1;
      entry.errorMessage = err?.message ?? 'Unknown error';
      failed++;

      if (entry.retries >= TXN_MAX_RETRIES) {
        entry.errorFlag = true;
        console.error(
          `[TxnQueue] Permanently failed after ${TXN_MAX_RETRIES} retries: ${entry.localId} — ${entry.errorMessage}`
        );
      } else {
        console.warn(
          `[TxnQueue] Retry ${entry.retries}/${TXN_MAX_RETRIES}: ${entry.localId} — ${entry.errorMessage}`
        );
      }

      // If it's a network error (fetch threw), stop trying the rest — still offline
      if (err instanceof TypeError && err.message.includes('fetch')) {
        // Push remaining unprocessed entries back unchanged
        break;
      }
    }
  }

  // Rebuild queue: keep error-flagged entries; remove successfully synced ones
  const updatedQueue = queue.map((t) => {
    if (t.errorFlag) return t; // permanent errors stay for manager review
    const updated = pending.find((p) => p.localId === t.localId);
    return updated ?? t;
  }).filter((t) => !t.syncedTransactionId || t.errorFlag);
  // Remove entries that have been synced successfully

  saveTxnQueue(updatedQueue);
  emitQueueUpdated();

  const errorCount = updatedQueue.filter((t) => t.errorFlag).length;
  console.info(
    `[TxnQueue] Sync complete: ${synced} synced, ${failed} failed, ${errorCount} errored, ${updatedQueue.length} remaining.`
  );

  return {
    synced,
    failed,
    errors: errorCount,
    remaining: updatedQueue.filter((t) => !t.errorFlag).length,
  };
}

/**
 * Re-queue all error-flagged transactions for another sync attempt.
 * Called by the manager via the SyncErrorsModal "Retry All" button.
 */
export function retryErroredTxns(): void {
  const queue = loadTxnQueue();
  const reset = queue.map((t) =>
    t.errorFlag
      ? { ...t, errorFlag: false, retries: 0, errorMessage: undefined }
      : t
  );
  saveTxnQueue(reset);
  emitQueueUpdated();
  console.info(`[TxnQueue] Reset ${reset.filter((t) => !t.errorFlag).length} errored transactions for retry.`);
}

/**
 * Dismiss (permanently delete) all error-flagged transactions.
 * Called by the manager from the SyncErrorsModal.
 */
export function dismissErroredTxns(): void {
  const queue = loadTxnQueue();
  saveTxnQueue(queue.filter((t) => !t.errorFlag));
  emitQueueUpdated();
}

/**
 * Clear the entire transaction queue (e.g., on logout).
 */
export function clearTxnQueue(): void {
  saveTxnQueue([]);
  emitQueueUpdated();
}

// ── Auto-sync on reconnect ────────────────────────────────────────

let txnSyncIntervalId: ReturnType<typeof setInterval> | null = null;
let txnSyncListening = false;

/**
 * Start listening for connectivity changes and auto-sync transactions.
 * Safe to call multiple times.
 */
export function startTxnSync(): void {
  if (txnSyncListening || typeof window === 'undefined') return;
  txnSyncListening = true;

  window.addEventListener('online', handleTxnOnline);

  txnSyncIntervalId = setInterval(() => {
    if (navigator.onLine && getTxnQueueLength() > 0) {
      syncTxnQueue();
    }
  }, 30000);

  // Immediate sync if already online and queue is non-empty
  if (navigator.onLine && getTxnQueueLength() > 0) {
    syncTxnQueue();
  }
}

/**
 * Stop listening for connectivity changes (on logout).
 */
export function stopTxnSync(): void {
  if (!txnSyncListening) return;
  txnSyncListening = false;

  window.removeEventListener('online', handleTxnOnline);
  if (txnSyncIntervalId) {
    clearInterval(txnSyncIntervalId);
    txnSyncIntervalId = null;
  }
}

function handleTxnOnline(): void {
  console.info('[TxnQueue] Connectivity restored — auto-syncing offline transactions...');
  syncTxnQueue();
}
