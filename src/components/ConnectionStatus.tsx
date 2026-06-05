import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Small connection status indicator: green dot when online, red when offline.
export function ConnectionStatus({ className }: { className?: string }) {
  const online = useOnlineStatus();
  const { t } = useI18n();

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      title={online ? t("conn.online") : t("conn.offline")}
    >
      <span className="relative flex h-2.5 w-2.5">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            online ? "bg-emerald-500" : "bg-destructive"
          )}
        />
      </span>
      {online ? (
        <Wifi className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <WifiOff className="h-3.5 w-3.5 text-destructive" />
      )}
    </div>
  );
}
