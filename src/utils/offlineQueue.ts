export interface QueuedAction {
  id: string;
  timestamp: string;
  type: 'sale' | 'clock-in' | 'clock-out' | 'break-start' | 'break-end';
  payload: Record<string, unknown>;
  retries: number;
}

const QUEUE_KEY = 'pharma_offline_queue';

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function pushOfflineAction(
  action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>
): QueuedAction {
  const queuedAction: QueuedAction = {
    ...action,
    id: `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    retries: 0,
  };

  saveQueue([...loadQueue(), queuedAction]);
  return queuedAction;
}

export function popOfflineAction(): QueuedAction | null {
  const queue = loadQueue();
  const [nextAction, ...remaining] = queue;
  saveQueue(remaining);
  return nextAction ?? null;
}

export function peekOfflineAction(): QueuedAction | null {
  return loadQueue()[0] ?? null;
}

export function getOfflineQueue(): QueuedAction[] {
  return loadQueue();
}

export function getOfflineQueueLength(): number {
  return loadQueue().length;
}

export function clearOfflineQueue(): void {
  saveQueue([]);
}
