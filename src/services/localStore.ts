import { seedState } from '../data/seed';
import type { SeedState } from '../types/models';

const DB_NAME = 'loader-castle-pos';
const DB_VERSION = 1;
const STORE = 'app-state';
const STATE_KEY = 'state';
const QUEUE_KEY = 'pending-writes';

export interface PendingWrite {
  id: string;
  type: string;
  createdAt: string;
}

type StoreValue = SeedState | PendingWrite[];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putValue(key: string, value: StoreValue) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getValue<T extends StoreValue>(key: string): Promise<T | null> {
  const db = await openDb();
  const value = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

export async function loadState(): Promise<SeedState> {
  const existing = await getValue<SeedState>(STATE_KEY);
  if (existing) return existing;
  await putValue(STATE_KEY, seedState);
  await putValue(QUEUE_KEY, []);
  return seedState;
}

export async function saveState(state: SeedState, pendingType: string) {
  await putValue(STATE_KEY, state);
  const queue = (await getPendingWrites()).concat({
    id: crypto.randomUUID(),
    type: pendingType,
    createdAt: new Date().toISOString(),
  });
  await putValue(QUEUE_KEY, queue);
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
  return (await getValue<PendingWrite[]>(QUEUE_KEY)) ?? [];
}

export async function clearPendingWrites() {
  await putValue(QUEUE_KEY, []);
}
