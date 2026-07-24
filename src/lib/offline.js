/**
 * Offline queue using IndexedDB.
 * When the network is unavailable, writes are queued here.
 * When connectivity returns, the queue is flushed in order.
 *
 * Usage (from App.jsx):
 *   import { queueOffline, flushOfflineQueue, onQueueChange } from './offline.js';
 *
 *   // Attempt an online write; if offline, queue it:
 *   await queueOffline('saving', savingObj, async (item) => {
 *     await insertSaving(item);
 *   });
 *
 *   // On app start, flush anything that was queued while offline:
 *   await flushOfflineQueue(handlers);
 */

const DB_NAME = "nyish_offline";
const DB_VERSION = 1;
const STORE = "queue";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "queueId", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

/** Add an item to the offline queue. */
export async function enqueue(type, payload) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ type, payload, queuedAt: new Date().toISOString() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/** Read all queued items (oldest first). */
export async function listQueue() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Remove a single item from the queue after it's been successfully synced. */
export async function dequeue(queueId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(queueId);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/** Count queued items — used to show a badge on the UI. */
export async function queueCount() {
  const items = await listQueue();
  return items.length;
}

/**
 * Try to flush all queued items using the provided handler map.
 * handlers: { saving: async (payload) => {...}, attendance: async (payload) => {...} }
 * Items that succeed are removed. Items that fail remain in the queue.
 * Returns { synced, failed }.
 */
export async function flushQueue(handlers) {
  const items = await listQueue();
  let synced = 0, failed = 0;
  for (const item of items) {
    const handler = handlers[item.type];
    if (!handler) { failed++; continue; }
    try {
      await handler(item.payload);
      await dequeue(item.queueId);
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}
