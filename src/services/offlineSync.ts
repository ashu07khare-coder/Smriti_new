import { smritiApi, type SyncMutation } from './api';

const MUTATION_QUEUE_KEY = 'smriti_offline_mutations';
const LAST_SYNC_KEY = 'smriti_last_synced_at';
const DEVICE_UUID_KEY = 'smriti_device_uuid';

export function getDeviceUuid(): string {
  let uuid = localStorage.getItem(DEVICE_UUID_KEY);
  if (!uuid) {
    uuid = `device-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem(DEVICE_UUID_KEY, uuid);
  }
  return uuid;
}

export function getLastSyncedAt(): number {
  const ts = localStorage.getItem(LAST_SYNC_KEY);
  return ts ? parseInt(ts, 10) : 0;
}

export function setLastSyncedAt(ts: number): void {
  localStorage.setItem(LAST_SYNC_KEY, ts.toString());
}

export function getOfflineMutations(): SyncMutation[] {
  try {
    const raw = localStorage.getItem(MUTATION_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineMutation(mutation: Omit<SyncMutation, 'client_updated_at'>): void {
  const current = getOfflineMutations();
  const fullMutation: SyncMutation = {
    ...mutation,
    client_updated_at: Date.now(),
  };
  current.push(fullMutation);
  localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(current));
  console.log('📦 Queued offline mutation:', fullMutation);
}

export function clearOfflineMutations(): void {
  localStorage.removeItem(MUTATION_QUEUE_KEY);
}

/**
 * Triggers sync with backend: flushes local offline queue and pulls changes
 */
export async function performSync(userId: string = 'user-aita'): Promise<{
  success: boolean;
  appliedCount: number;
  serverTime?: number;
  deltas?: any;
  error?: string;
}> {
  const deviceUuid = getDeviceUuid();
  const lastSynced = getLastSyncedAt();
  const pending = getOfflineMutations();

  try {
    const response = await smritiApi.sync(deviceUuid, userId, lastSynced, pending);
    clearOfflineMutations();
    setLastSyncedAt(response.server_time);
    console.log(`✅ Synced with backend. Applied ${response.applied_count} mutations. Server time: ${response.server_time}`);
    return {
      success: true,
      appliedCount: response.applied_count,
      serverTime: response.server_time,
      deltas: response.deltas,
    };
  } catch (err: any) {
    console.warn('⚠️ Offline sync deferred (no internet connectivity):', err?.message);
    return {
      success: false,
      appliedCount: 0,
      error: err?.message,
    };
  }
}
