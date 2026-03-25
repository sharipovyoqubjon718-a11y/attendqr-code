
import { LayoutDashboard, Users, QrCode, ClipboardList, ShieldAlert, UserPlus, BarChart3, Info } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import gdbhLogo from "@/assets/gdbh-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Панели идоракунӣ", url: "/", icon: LayoutDashboard },
  { title: "Хонандагон", url: "/students", icon: Users },
  { title: "Иловаи хонанда", url: "/add-student", icon: UserPlus },
  { title: "Сканер", url: "/scanner", icon: QrCode },
  { title: "Сабти давомот", url: "/logs", icon: ClipboardList },
  { title: "Ҳисоботҳо", url: "/reports", icon: BarChart3 },
  { title: "Рӯйхати сиёҳ", url: "/blacklist", icon: ShieldAlert },
  { title: "Маълумот", url: "/about", icon: Info },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
          <SidebarGroupLabel>Навигатсия</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
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
