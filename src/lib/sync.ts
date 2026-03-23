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

export function getSyncStatus(): SyncStatus {
  const syncedIds = getSyncedLogIds();
  const logs = getLogs();
  const pendingLogs = logs.filter(l => !syncedIds.has(l.id)).length;
  const stored = localStorage.getItem(SYNC_STATUS_KEY);
  const lastSyncAt = stored ? JSON.parse(stored).lastSyncAt : null;
  return { lastSyncAt, pendingLogs, isSyncing: false };
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export async function syncToCloud(): Promise<{ success: boolean; message: string }> {
  if (!isOnline()) {
    return { success: false, message: 'Пайвасти интернет нест' };
  }

  try {
    // 1. Sync students first
    const students = getStudents();
    const studentRows = students.map(s => ({
      id: s.id,
      name: s.name,
      class_name: s.className,
      qr_code: s.qrCode,
    }));

    // Upsert students in batches of 100
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
      const logRows = unsyncedLogs.map(l => ({
        id: l.id,
        student_id: l.studentId,
        type: l.type,
        timestamp: l.timestamp,
      }));

      // Upsert logs in batches of 100
      for (let i = 0; i < logRows.length; i += 100) {
        const batch = logRows.slice(i, i + 100);
        const { error } = await supabase.from('attendance_logs').upsert(batch, { onConflict: 'id' });
        if (error) throw new Error(`Хатои синхронизатсияи сабтҳо: ${error.message}`);
      }

      // Mark as synced
      unsyncedLogs.forEach(l => syncedIds.add(l.id));
      saveSyncedLogIds(syncedIds);
    }

    // Save sync status
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({ lastSyncAt: new Date().toISOString() }));

    return {
      success: true,
      message: `${students.length} хонанда ва ${unsyncedLogs.length} сабт синхронизатсия шуд`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Хатои номаълум' };
  }
}
