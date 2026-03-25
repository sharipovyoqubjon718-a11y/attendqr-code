import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SyncButton } from "@/components/SyncButton";
import gdbhLogo from "@/assets/gdbh-logo.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Tajik flag stripe */}
          <div className="tajik-gradient-bar w-full" />
          <header className="h-14 flex items-center border-b bg-card px-4 glass-card rounded-none border-t-0">
            <SidebarTrigger className="mr-3" />
            <img src={gdbhLogo} alt="ГДБҲ" className="h-8 w-8 rounded-full mr-2" />
            <h1 className="font-display text-lg font-bold text-foreground flex-1">AttendQR — ГДБҲ</h1>
            <SyncButton />
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
