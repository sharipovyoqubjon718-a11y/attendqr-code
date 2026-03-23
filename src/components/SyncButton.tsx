import { useState, useEffect } from "react";
import { Cloud, CloudOff, RefreshCw, Check, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { syncToCloud, getSyncStatus, isOnline, clearPendingSync, invalidateSyncCache } from "@/lib/sync";
import { toast } from "sonner";

export function SyncButton() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Auto-sync in background when internet restored (non-blocking, limited batch)
      syncToCloud().then((result) => {
        invalidateSyncCache();
        setSyncStatus(getSyncStatus());
        if (result.success) {
          toast.success("Маълумот ба таври худкор синхронизатсия шуд");
        }
      });
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setSyncStatus(getSyncStatus()), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncToCloud();
    setSyncing(false);
    invalidateSyncCache();
    setSyncStatus(getSyncStatus());
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    toast.info("Синхронизатсияи пурра оғоз шуд...");
    const result = await syncToCloud(true);
    setSyncing(false);
    invalidateSyncCache();
    setSyncStatus(getSyncStatus());
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleClearQueue = () => {
    clearPendingSync();
    setSyncStatus(getSyncStatus());
    toast.success("Навбати синхронизатсия пок карда шуд");
  };

  return (
    <div className="flex items-center gap-2">
      {!online && (
        <Badge variant="outline" className="text-destructive border-destructive gap-1">
          <CloudOff className="h-3 w-3" /> Офлайн
        </Badge>
      )}
      {online && syncStatus.pendingLogs === 0 && (
        <Badge variant="outline" className="text-success border-success gap-1">
          <Check className="h-3 w-3" /> Синхронизатсия шуд
        </Badge>
      )}
      {syncStatus.pendingLogs > 0 && (
        <>
          <Badge variant="secondary" className="gap-1">
            {syncStatus.pendingLogs} сабти интизорӣ
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearQueue}
            disabled={syncing}
            title="Пок кардани навбат"
            className="h-8 w-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceSync}
            disabled={!online || syncing}
            className="gap-1"
            title="Синхронизатсияи пурра"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Маҷбурӣ</span>
          </Button>
        </>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={!online || syncing}
        className="gap-1"
      >
        {syncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Cloud className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Синхронизатсия</span>
      </Button>
    </div>
  );
}
