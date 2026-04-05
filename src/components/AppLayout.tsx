import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SyncButton } from "@/components/SyncButton";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useI18n } from "@/lib/i18n";
import gdbhLogo from "@/assets/gdbh-logo.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <div className="tajik-gradient-bar w-full" />
          <header className="h-14 flex items-center border-b bg-card px-4 glass-card rounded-none border-t-0">
            <SidebarTrigger className="mr-3" />
            <img src={gdbhLogo} alt="ГДБҲ" className="h-8 w-8 rounded-full mr-2" />
            <h1 className="font-display text-sm sm:text-base font-bold text-foreground flex-1 leading-tight">
              {t("dash.title")}
            </h1>
            <div className="flex items-center gap-1">
              <SettingsPanel />
              <SyncButton />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
          <footer className="border-t bg-card/50 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{t("footer")}</p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
