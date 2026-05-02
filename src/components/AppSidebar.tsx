import { LayoutDashboard, QrCode, ClipboardList, ShieldAlert, UserPlus, BarChart3, Info, Sun, Moon, Settings, LifeBuoy } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useI18n } from "@/lib/i18n";
import { getSelectedSchool } from "@/lib/schools";
import goldenEmblem from "@/assets/golden-emblem.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useI18n();
  const collapsed = state === "collapsed";
  const school = getSelectedSchool();
  const logoSrc = school.logoDataUrl || goldenEmblem;

  const navItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.shift1"), url: "/students", icon: Sun },
    { title: t("nav.shift2"), url: "/students2", icon: Moon },
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
            <img src={logoSrc} alt={school.name} className="h-10 w-10 rounded-full border-2 border-sidebar-primary object-contain" />
            <div className="min-w-0">
              <span className="font-display text-base font-bold text-sidebar-foreground block leading-tight">AttendQR</span>
              <span className="text-[10px] text-sidebar-foreground/60 truncate block">{school.name}</span>
            </div>
          </div>
        ) : (
          <img src={logoSrc} alt={school.name} className="h-8 w-8 rounded-full mx-auto border-2 border-sidebar-primary object-contain" />
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
        <SidebarFooter className="p-4 space-y-2">
          <a
            href="https://t.me/Sharipov_Yoqubjon"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs px-2 py-2 rounded-md bg-sidebar-accent/30 hover:bg-sidebar-accent/60 text-sidebar-foreground transition-colors"
          >
            <LifeBuoy className="h-4 w-4" />
            <span>{t("support.title")}</span>
          </a>
          <div className="text-[9px] text-sidebar-foreground/40 text-center leading-tight">
            © 2025 {school.name}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
