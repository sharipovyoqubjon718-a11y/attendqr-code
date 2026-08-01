import { useEffect, useState } from "react";
import { LayoutDashboard, QrCode, ClipboardList, ShieldAlert, UserPlus, BarChart3, Info, Sun, Moon, Settings, LifeBuoy, Trophy, BookOpen, Phone, MessageSquare, Bell, GraduationCap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useI18n } from "@/lib/i18n";
import { getActiveSchool, getSelectedSchool, getActiveSchoolId, getSelectedSchoolId } from "@/lib/schools";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import goldenEmblem from "@/assets/golden-emblem.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useI18n();
  const collapsed = state === "collapsed";
  const school = getActiveSchool() || getSelectedSchool();
  const logoSrc = school.logoDataUrl || goldenEmblem;
  const schoolId = getActiveSchoolId() || getSelectedSchoolId() || "gdbh";
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const loadCount = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "unread");
      if (active) setUnread(count ?? 0);
    };
    loadCount();
    const channel = supabase
      .channel("sidebar-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `school_id=eq.${schoolId}` },
        () => loadCount()
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [schoolId]);

  const navItems: { title: string; url: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.shift1"), url: "/students", icon: Sun },
    { title: t("nav.shift2"), url: "/students2", icon: Moon },
    { title: t("nav.addStudent"), url: "/add-student", icon: UserPlus },
    { title: t("nav.scanner"), url: "/scanner", icon: QrCode },
    { title: t("nav.logs"), url: "/logs", icon: ClipboardList },
    { title: t("nav.reports"), url: "/reports", icon: BarChart3 },
    { title: t("nav.rankings"), url: "/rankings", icon: Trophy },
    { title: t("nav.readingRankings"), url: "/reading-rankings", icon: BookOpen },
    { title: t("nav.journal"), url: "/journal", icon: BookOpen },
    { title: t("nav.parents"), url: "/parents", icon: Phone },
    { title: t("nav.messageParents"), url: "/message-parents", icon: MessageSquare },
    { title: t("nav.messages"), url: "/messages", icon: Bell, badge: unread },
    { title: t("nav.teachers"), url: "/teachers", icon: GraduationCap },
    { title: t("nav.blacklist"), url: "/blacklist", icon: ShieldAlert },
    { title: t("nav.about"), url: "/about", icon: Info },
    { title: t("settings.title"), url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="no-print">
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
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {item.badge ? (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1 text-[10px]">
                          {item.badge}
                        </Badge>
                      ) : null}
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
