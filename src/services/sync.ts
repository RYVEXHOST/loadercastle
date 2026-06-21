import { clearPendingWrites, getPendingWrites } from './localStore';
import { hasFirebaseConfig, mirrorSeedToFirestore } from './firebase';
import type { SeedState } from '../types/models';

export async function flushPendingWrites(state: SeedState) {
  const pending = await getPendingWrites();
  if (!navigator.onLine || pending.length === 0 || !hasFirebaseConfig) return pending.length;
  await mirrorSeedToFirestore(state);
  await clearPendingWrites();
  return 0;
}
