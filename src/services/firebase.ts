import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  collection,
  doc,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { SeedState } from '../types/models';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const hasFirebaseConfig = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getDb() {
  if (!hasFirebaseConfig) return null;
  if (!app) {
    app = initializeApp(config);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }
  return db ?? getFirestore(app);
}

export async function mirrorSeedToFirestore(seed: SeedState) {
  const firestore = getDb();
  if (!firestore) return;
  await Promise.all([
    ...seed.branches.map((item) => setDoc(doc(collection(firestore, 'branches'), item.id), item, { merge: true })),
    ...seed.menuItems.map((item) => setDoc(doc(collection(firestore, 'menuItems'), item.id), item, { merge: true })),
    ...seed.loyaltyMembers.map((item) => setDoc(doc(collection(firestore, 'loyaltyMembers'), item.id), item, { merge: true })),
    ...seed.employees.map((item) => setDoc(doc(collection(firestore, 'employees'), item.id), item, { merge: true })),
    ...seed.transactions.map((item) => setDoc(doc(collection(firestore, 'transactions'), item.id), item, { merge: true })),
    ...seed.taxSettings.map((item) => setDoc(doc(collection(firestore, 'taxSettings'), item.branchId), item, { merge: true })),
    ...seed.receiptSettings.map((item) => setDoc(doc(collection(firestore, 'receiptSettings'), item.branchId), item, { merge: true })),
  ]);
}
