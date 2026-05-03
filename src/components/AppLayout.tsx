import { LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getActiveSchool, getSelectedSchool } from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";

interface Props {
  children: React.ReactNode;
  onLogout: () => void;
}

export function AppLayout({ children, onLogout }: Props) {
  const { t } = useI18n();
  const school = getActiveSchool() || getSelectedSchool();
  const logoSrc = school.logoDataUrl || goldenEmblem;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <div className="tajik-gradient-bar w-full no-print" />
          <header className="h-14 flex items-center border-b bg-card px-4 glass-card rounded-none border-t-0 no-print">
            <SidebarTrigger className="mr-3" />
            <img src={logoSrc} alt={school.name} className="h-8 w-8 rounded-full mr-2 object-contain" />
            <h1 className="font-display text-sm sm:text-base font-bold text-foreground flex-1 leading-tight truncate">
              {school.name}
            </h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onLogout} title={t("login.logout")}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto print-area">{children}</main>
          <footer className="border-t bg-card/50 px-4 py-3 text-center space-y-1 no-print">
            <p className="text-xs text-muted-foreground">{t("footer")}</p>
            <a
              href="https://t.me/Sharipov_Yoqubjon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[11px] text-primary hover:underline"
            >
              📨 {t("support.title")} — @Sharipov_Yoqubjon
            </a>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
