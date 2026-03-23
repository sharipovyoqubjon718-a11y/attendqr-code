import { useState, useEffect } from "react";
import { Cloud, CloudOff, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { syncToCloud, getSyncStatus, isOnline } from "@/lib/sync";
import { toast } from "sonner";

export function SyncButton() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setSyncStatus(getSyncStatus()), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncToCloud();
    setSyncing(false);
    setSyncStatus(getSyncStatus());
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
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
        <Badge variant="secondary" className="gap-1">
          {syncStatus.pendingLogs} сабти интизорӣ
        </Badge>
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
