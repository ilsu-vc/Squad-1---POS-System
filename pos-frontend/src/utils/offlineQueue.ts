import { authFetch } from './authFetch';

/**
 * offlineQueue.ts
 * POS-S4-009-T3: Build offline action queue with reconnect sync.
 *
 * Captures shift/clock/break API actions that fail due to network issues
 * and replays them in order when connectivity is restored.
 */

export interface QueuedAction {
  id: string;
  timestamp: string;
  type: 'clock-in' | 'clock-out' | 'break-start' | 'break-end' | 'sale';
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
      console.info(`[OfflineQueue] Attempting to sync action ${action.id} to ${action.url}...`);
      const res = await authFetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      });

      if (res.ok) {
        synced++;
        console.info(`[OfflineQueue] ✅ Successfully synced: ${action.type} (${action.id})`);
      } else {
        const errorText = await res.text().catch(() => 'No error body');
        console.warn(`[OfflineQueue] ❌ Sync failed for ${action.id} (Status: ${res.status}): ${errorText}`);
        action.retries++;
        if (action.retries < MAX_RETRIES) {
          remaining.push(action);
          console.warn(`[OfflineQueue] Retry scheduled (${action.retries}/${MAX_RETRIES})`);
        } else {
          failed++;
          console.error(`[OfflineQueue] 💀 Permanently failed after ${MAX_RETRIES} retries.`);
        }
      }
    } catch (err: any) {
      console.error(`[OfflineQueue] 🚨 Network error during sync attempt for ${action.id}:`, err);
      // Network still down — keep in queue
      action.retries++;
      if (action.retries < MAX_RETRIES) {
        remaining.push(action);
      } else {
        failed++;
      }
      // Stop syncing if we're offline — no point trying the rest.
      const currentIdx = queue.indexOf(action);
      for (let i = currentIdx + 1; i < queue.length; i++) {
        remaining.push(queue[i]);
      }
      break;
    }
  }

  saveQueue(remaining);
  console.info(`[OfflineQueue] Sync finished: ${synced} synced, ${failed} failed, ${remaining.length} remaining.`);

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
