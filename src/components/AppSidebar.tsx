import { LayoutDashboard, Users, QrCode, ClipboardList, ShieldAlert, UserPlus, BarChart3, Info, Sun, Moon, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useI18n } from "@/lib/i18n";
import gdbhLogo from "@/assets/gdbh-logo.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useI18n();
  const collapsed = state === "collapsed";

  const navItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.morning"), url: "/students", icon: Sun },
    { title: t("nav.afternoon"), url: "/students2", icon: Moon },
    { title: t("nav.addStudent"), url: "/add-student", icon: UserPlus },
    { title: t("nav.scanner"), url: "/scanner", icon: QrCode },
    { title: t("nav.logs"), url: "/logs", icon: ClipboardList },
    { title: t("nav.reports"), url: "/reports", icon: BarChart3 },
    { title: t("nav.blacklist"), url: "/blacklist", icon: ShieldAlert },
    { title: t("nav.about"), url: "/about", icon: Info },
    { title: t("settings.title"), url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img src={gdbhLogo} alt="ГДБҲ" className="h-10 w-10 rounded-full border-2 border-sidebar-primary" />
            <div>
              <span className="font-display text-base font-bold text-sidebar-foreground block leading-tight">AttendQR</span>
              <span className="text-[10px] text-sidebar-foreground/60">ГДБҲ — Кӯлоб</span>
            </div>
          </div>
        ) : (
          <img src={gdbhLogo} alt="ГДБҲ" className="h-8 w-8 rounded-full mx-auto border-2 border-sidebar-primary" />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="p-4">
          <div className="text-[9px] text-sidebar-foreground/40 text-center leading-tight">
            © 2025 ГДБҲ — Кӯлоб
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
