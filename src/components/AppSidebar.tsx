import {
  LayoutDashboard,
  Presentation,
  FileText,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Sparkles,
  ChevronRight,
  User,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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

const mainItems = [
  { title: "Dashboard",    url: "/dashboard",            icon: LayoutDashboard },
  { title: "PPT",          url: "/dashboard/ppt",         icon: Presentation    },
  { title: "Assignments",  url: "/dashboard/assignments",  icon: FileText        },
  { title: "Notes",        url: "/dashboard/notes",        icon: BookOpen        },
  { title: "Timetable",    url: "/dashboard/timetable",    icon: CalendarDays    },
  { title: "Checklist",    url: "/dashboard/checklist",    icon: CheckSquare     },
];

/** Returns initials from a full name or email */
function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.includes("@")
    ? [nameOrEmail.split("@")[0]]
    : nameOrEmail.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Returns first name from full_name, or the part before @ in email */
function getDisplayName(user: { email?: string; user_metadata?: { full_name?: string } } | null): string {
  if (!user) return "";
  const full = user.user_metadata?.full_name;
  if (full) return full.split(" ")[0];
  return user.email?.split("@")[0] ?? "";
}

// ── Desktop sidebar ────────────────────────────────────────────────
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();

  const initials = getInitials(user?.user_metadata?.full_name ?? user?.email);
  const displayName = getDisplayName(user);
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;

  const isActive = (url: string) =>
    url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(url);

  return (
    <Sidebar
      collapsible="icon"
      style={{ borderRight: "1px solid hsl(240,10%,14%)" }}
    >
      {/* ── Logo ── */}
      <SidebarHeader style={{ padding: collapsed ? "14px 12px" : "16px 14px" }}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "0 2px 12px hsla(262,80%,62%,0.35)",
            }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-display font-bold text-base gradient-text block leading-none">
                StudyAI
              </span>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "hsl(220,8%,45%)",
                  lineHeight: 1.3,
                  display: "block",
                  marginTop: 2,
                }}
              >
                Academic Assistant
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* ── Main nav ── */}
      <SidebarContent style={{ padding: "4px 8px" }}>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "hsl(220,8%,38%)",
                padding: "8px 10px 4px",
              }}
            >
              Menu
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu style={{ gap: 2 }}>
              {mainItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 px-3 rounded-xl text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        style={{
                          height: 38,
                          color: active
                            ? "hsl(262,80%,75%)"
                            : "hsl(220,8%,58%)",
                          background: active
                            ? "hsla(262,80%,62%,0.12)"
                            : "transparent",
                          fontWeight: active ? 600 : 400,
                        }}
                        activeClassName=""
                      >
                        <span
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: 22,
                            color: active
                              ? "hsl(262,80%,70%)"
                              : "hsl(220,8%,50%)",
                          }}
                        >
                          <item.icon size={16} />
                        </span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.title}</span>
                            {active && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: "hsl(262,80%,70%)" }}
                              />
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Profile footer ── */}
      <SidebarFooter style={{ padding: "8px 8px 12px" }}>
        {!collapsed && (
          <div
            style={{
              height: 1,
              background: "hsl(240,10%,14%)",
              margin: "0 6px 8px",
            }}
          />
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              {(() => {
                const active = location.pathname === "/dashboard/profile";
                return (
                  <NavLink
                    to="/dashboard/profile"
                    end
                    className="flex items-center gap-3 px-3 rounded-xl text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    style={{
                      height: 40,
                      color: active ? "hsl(262,80%,75%)" : "hsl(220,8%,58%)",
                      background: active
                        ? "hsla(262,80%,62%,0.12)"
                        : "transparent",
                      fontWeight: active ? 600 : 400,
                    }}
                    activeClassName=""
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName || "Profile"}
                        className="w-6 h-6 rounded-lg object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {initials}
                      </span>
                    )}
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{displayName}</span>
                        <ChevronRight size={13} style={{ color: "hsl(220,8%,42%)" }} />
                      </>
                    )}
                  </NavLink>
                );
              })()}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// ── Mobile bottom tab bar (md:hidden) ─────────────────────────────
const mobileTabItems = [
  { title: "Home",        url: "/dashboard",            icon: LayoutDashboard },
  { title: "PPT",         url: "/dashboard/ppt",         icon: Presentation    },
  { title: "Notes",       url: "/dashboard/notes",        icon: BookOpen        },
  { title: "Timetable",   url: "/dashboard/timetable",    icon: CalendarDays    },
  { title: "Checklist",   url: "/dashboard/checklist",    icon: CheckSquare     },
  { title: "Profile",     url: "/dashboard/profile",      icon: User            },
];

export function MobileBottomNav() {
  const location = useLocation();

  const isActive = (url: string) =>
    url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(url);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "hsl(240,10%,8%)",
        borderTop: "1px solid hsl(240,10%,14%)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {mobileTabItems.map((item) => {
        const active = isActive(item.url);
        return (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/dashboard"}
            activeClassName=""
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full outline-none"
            style={{
              color: active ? "hsl(262,80%,72%)" : "hsl(220,8%,48%)",
              transition: "color 150ms ease",
            }}
          >
            <span
              className="flex items-center justify-center rounded-xl transition-all duration-150"
              style={{
                width: 36,
                height: 28,
                background: active ? "hsla(262,80%,62%,0.15)" : "transparent",
              }}
            >
              <item.icon size={18} />
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: active ? 600 : 400,
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            >
              {item.title}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
