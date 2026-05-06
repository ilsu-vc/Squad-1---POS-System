/**
 * @jest-environment jsdom
 */

import {
  clearOfflineQueue,
  getOfflineQueue,
  getOfflineQueueLength,
  peekOfflineAction,
  popOfflineAction,
  pushOfflineAction,
} from './offlineQueue';

describe('offline queue push/pop functions', () => {
  it('pushes sale actions with generated metadata', () => {
    const queued = pushOfflineAction({
      type: 'sale',
      payload: { total: 112, items: [{ sku: 'MED-001', qty: 1 }] },
    });

    expect(getOfflineQueueLength()).toBe(1);
    expect(queued).toMatchObject({
      type: 'sale',
      payload: { total: 112, items: [{ sku: 'MED-001', qty: 1 }] },
      retries: 0,
    });
    expect(queued.id).toMatch(/^oq_/);
    expect(queued.timestamp).toEqual(expect.any(String));
  });

  it('pops queued actions in FIFO order', () => {
    const first = pushOfflineAction({ type: 'clock-in', payload: { userId: 'cashier-1' } });
    const second = pushOfflineAction({ type: 'sale', payload: { total: 224 } });

    expect(popOfflineAction()).toEqual(first);
    expect(popOfflineAction()).toEqual(second);
    expect(popOfflineAction()).toBeNull();
    expect(getOfflineQueueLength()).toBe(0);
  });

  it('peeks without removing the next action', () => {
    const queued = pushOfflineAction({ type: 'break-start', payload: { userId: 'cashier-1' } });

    expect(peekOfflineAction()).toEqual(queued);
    expect(getOfflineQueueLength()).toBe(1);
  });

  it('returns a defensive empty queue when localStorage data is invalid', () => {
    localStorage.setItem('pharma_offline_queue', 'not-json');

    expect(getOfflineQueue()).toEqual([]);
    expect(popOfflineAction()).toBeNull();
  });

  it('clears all queued actions', () => {
    pushOfflineAction({ type: 'clock-out', payload: { userId: 'cashier-1' } });
    pushOfflineAction({ type: 'sale', payload: { total: 99 } });

    clearOfflineQueue();

    expect(getOfflineQueue()).toEqual([]);
  });
});
