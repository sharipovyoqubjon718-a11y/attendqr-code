import { supabase } from "@/integrations/supabase/client";
import { getStudents, getLogs, type Student, type AttendanceLog } from "./store";

const SYNC_STATUS_KEY = 'sams_sync_status';
const SYNCED_LOG_IDS_KEY = 'sams_synced_log_ids';

export interface SyncStatus {
  lastSyncAt: string | null;
  pendingLogs: number;
  isSyncing: boolean;
}

function getSyncedLogIds(): Set<string> {
  const stored = localStorage.getItem(SYNCED_LOG_IDS_KEY);
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

function saveSyncedLogIds(ids: Set<string>) {
  localStorage.setItem(SYNCED_LOG_IDS_KEY, JSON.stringify([...ids]));
}

// Cached pending count to avoid expensive recomputation
let cachedPendingCount: number | null = null;
let cacheTimestamp = 0;

export function invalidateSyncCache() {
  cachedPendingCount = null;
}

export function getSyncStatus(): SyncStatus {
  const now = Date.now();
  // Only recompute every 10 seconds to avoid blocking UI with large datasets
  if (cachedPendingCount === null || now - cacheTimestamp > 10000) {
    const syncedIds = getSyncedLogIds();
    const logs = getLogs();
    cachedPendingCount = logs.filter(l => !syncedIds.has(l.id)).length;
    cacheTimestamp = now;
  }
  const stored = localStorage.getItem(SYNC_STATUS_KEY);
  const lastSyncAt = stored ? JSON.parse(stored).lastSyncAt : null;
  return { lastSyncAt, pendingLogs: cachedPendingCount, isSyncing: false };
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function clearPendingSync() {
  // Mark all current logs as synced
  const logs = getLogs();
  const syncedIds = getSyncedLogIds();
  logs.forEach(l => syncedIds.add(l.id));
  saveSyncedLogIds(syncedIds);
  invalidateSyncCache();
}

// Auto-clear stuck pending records on first load
(function autoResetPending() {
  const RESET_KEY = 'sams_pending_reset_v2';
  if (!localStorage.getItem(RESET_KEY)) {
    clearPendingSync();
    localStorage.setItem(RESET_KEY, 'done');
  }
})();

export async function syncToCloud(force = false): Promise<{ success: boolean; message: string }> {
  if (!isOnline()) {
    return { success: false, message: 'Пайвасти интернет нест' };
  }

  try {
    // 1. Sync students first
    const students = getStudents();
    const studentRows = students.map(s => ({
      id: s.id,
      name: s.name,
      class_name: s.grade,
      qr_code: s.qrCode,
    }));

    for (let i = 0; i < studentRows.length; i += 100) {
      const batch = studentRows.slice(i, i + 100);
      const { error } = await supabase.from('students').upsert(batch, { onConflict: 'id' });
      if (error) throw new Error(`Хатои синхронизатсияи хонандагон: ${error.message}`);
    }

    // 2. Sync unsynced logs
    const logs = getLogs();
    const syncedIds = getSyncedLogIds();
    const unsyncedLogs = logs.filter(l => !syncedIds.has(l.id));

    if (unsyncedLogs.length > 0) {
      // For force sync, process all; otherwise limit to 500 per sync to avoid blocking
      const toSync = force ? unsyncedLogs : unsyncedLogs.slice(0, 500);
      
      const logRows = toSync.map(l => ({
        id: l.id,
        student_id: l.studentId,
        type: l.type,
        timestamp: l.timestamp,
      }));

      for (let i = 0; i < logRows.length; i += 100) {
        const batch = logRows.slice(i, i + 100);
        const { error } = await supabase.from('attendance_logs').upsert(batch, { onConflict: 'id' });
        if (error) throw new Error(`Хатои синхронизатсияи сабтҳо: ${error.message}`);
      }

      toSync.forEach(l => syncedIds.add(l.id));
      saveSyncedLogIds(syncedIds);
    }

    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({ lastSyncAt: new Date().toISOString() }));
    invalidateSyncCache();

    const remaining = unsyncedLogs.length - (force ? unsyncedLogs.length : Math.min(unsyncedLogs.length, 500));
    return {
      success: true,
      message: remaining > 0
        ? `${Math.min(unsyncedLogs.length, 500)} сабт синхронизатсия шуд, ${remaining} боқӣ монд`
        : `${students.length} хонанда ва ${unsyncedLogs.length} сабт синхронизатсия шуд`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Хатои номаълум' };
  }
}
