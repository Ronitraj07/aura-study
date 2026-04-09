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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getInitials, getDisplayName, getAvatarUrl } from "@/lib/userUtils";

const mainItems = [
  { title: "Dashboard",   url: "/dashboard",              icon: LayoutDashboard },
  { title: "PPT",         url: "/dashboard/ppt",         icon: Presentation    },
  { title: "Assignments", url: "/dashboard/assignments", icon: FileText        },
  { title: "Notes",       url: "/dashboard/notes",       icon: BookOpen        },
  { title: "Timetable",   url: "/dashboard/timetable",   icon: CalendarDays    },
  { title: "Checklist",   url: "/dashboard/checklist",   icon: CheckSquare     },
];

// ── ProfileLink ────────────────────────────────────────────────────
interface ProfileLinkProps {
  avatarUrl?: string;
  displayName: string;
  initials: string;
  collapsed: boolean;
  active: boolean;
}

function ProfileLink({ avatarUrl, displayName, initials, collapsed, active }: ProfileLinkProps) {
  const linkContent = (
    <NavLink
      to="/dashboard/profile"
      end
      aria-label="Profile"
      className={`flex items-center gap-3 rounded-xl text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        collapsed ? 'justify-center px-2' : 'px-3'
      }`}
      style={{
        height: 40,
        color:      active ? "hsl(262,80%,75%)" : "hsl(220,8%,58%)",
        background: active ? "hsla(262,80%,62%,0.12)" : "transparent",
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
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{displayName}</span>
          <ChevronRight size={13} style={{ color: "hsl(220,8%,42%)" }} aria-hidden="true" />
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{displayName}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

// ── Desktop sidebar ─────────────────────────────────────────────────
export function AppSidebar() {
  const { state }   = useSidebar();
  const collapsed   = state === "collapsed";
  const location    = useLocation();
  const { user }    = useAuth();

  const initials    = getInitials(user?.user_metadata?.full_name ?? user?.email);
  const displayName = getDisplayName(user);
  const avatarUrl   = getAvatarUrl(user);

  const isActive = (url: string) =>
    url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" style={{ borderRight: "1px solid hsl(240,10%,14%)" }}>
      {/* Logo */}
      <SidebarHeader style={{ padding: collapsed ? "16px 16px" : "16px 14px" }}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "0 2px 12px hsla(262,80%,62%,0.35)",
            }}
          >
            <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          {collapsed ? (
            <span className="sr-only">Aura Study — Academic Assistant</span>
          ) : (
            <div className="min-w-0">
              <span
                className="font-display font-bold text-base gradient-text block leading-none"
                aria-hidden="true"
              >
                Aura Study
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

      {/* Main nav */}
      <SidebarContent style={{ padding: collapsed ? "8px 16px" : "4px 8px" }}>
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
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <NavLink
                              to={item.url}
                              end={item.url === "/dashboard"}
                              aria-label={item.title}
                              className={`flex items-center gap-3 rounded-xl text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                collapsed ? 'justify-center px-2' : 'px-3'
                              }`}
                              style={{
                                height: 38,
                                color:      active ? "hsl(262,80%,75%)" : "hsl(220,8%,58%)",
                                background: active ? "hsla(262,80%,62%,0.12)" : "transparent",
                                fontWeight: active ? 600 : 400,
                              }}
                              activeClassName=""
                            >
                              <span
                                className="flex items-center justify-center shrink-0"
                                aria-hidden="true"
                                style={{
                                  width: 22,
                                  color: active ? "hsl(262,80%,70%)" : "hsl(220,8%,50%)",
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
                                      aria-hidden="true"
                                      style={{ background: "hsl(262,80%,70%)" }}
                                    />
                                  )}
                                </>
                              )}
                            </NavLink>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          aria-label={item.title}
                          className={`flex items-center gap-3 rounded-xl text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            collapsed ? 'justify-center px-2' : 'px-3'
                          }`}
                          style={{
                            height: 38,
                            color:      active ? "hsl(262,80%,75%)" : "hsl(220,8%,58%)",
                            background: active ? "hsla(262,80%,62%,0.12)" : "transparent",
                            fontWeight: active ? 600 : 400,
                          }}
                          activeClassName=""
                        >
                          <span
                            className="flex items-center justify-center shrink-0"
                            aria-hidden="true"
                            style={{
                              width: 22,
                              color: active ? "hsl(262,80%,70%)" : "hsl(220,8%,50%)",
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
                                  aria-hidden="true"
                                  style={{ background: "hsl(262,80%,70%)" }}
                                />
                              )}
                            </>
                          )}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Profile footer */}
      <SidebarFooter style={{ padding: collapsed ? "12px 16px" : "8px 8px 12px" }}>
        <div>
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
                <ProfileLink
                  avatarUrl={avatarUrl}
                  displayName={displayName}
                  initials={initials}
                  collapsed={collapsed}
                  active={location.pathname === "/dashboard/profile"}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// ── Mobile bottom tab bar ─────────────────────────────────────────
// Shown only on mobile/tablet (<1024px). Hidden on laptop and above.
const mobileTabItems = [
  { title: "Home",      url: "/dashboard",           icon: LayoutDashboard },
  { title: "PPT",       url: "/dashboard/ppt",        icon: Presentation    },
  { title: "Notes",     url: "/dashboard/notes",      icon: BookOpen        },
  { title: "Checklist", url: "/dashboard/checklist",  icon: CheckSquare     },
  { title: "Profile",   url: "/dashboard/profile",    icon: User            },
];

export function MobileBottomNav() {
  const location = useLocation();

  const isActive = (url: string) =>
    url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(url);

  return (
    <nav
      aria-label="Main navigation"
      // md:hidden = hidden at 768px and above (tablet+)
      // Below 768px (mobile only) the sidebar becomes a Sheet drawer, so the bottom nav takes over
      className="md:hidden fixed z-50 flex items-center justify-around"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
        left: "50%",
        transform: "translateX(-50%)",
        borderRadius: 9999,
        width: "min(calc(100vw - 32px), 360px)",
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        padding: "6px 8px",
        height: 62,
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
            aria-label={item.title}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 3,
              textDecoration: "none",
              color: active ? "hsl(262,80%,78%)" : "hsl(220,8%,46%)",
              transition: "color 160ms ease",
              outline: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 28,
                borderRadius: 9999,
                background: active
                  ? "linear-gradient(135deg, hsla(262,80%,62%,0.30), hsla(220,85%,62%,0.18))"
                  : "transparent",
                boxShadow: active ? "0 0 12px hsla(262,80%,62%,0.25)" : "none",
                transition: "background 200ms ease, box-shadow 200ms ease",
              }}
            >
              <item.icon
                size={active ? 18 : 17}
                strokeWidth={active ? 2.3 : 1.7}
              />
            </span>
            <span
              aria-hidden="true"
              style={{
                fontSize: 10,
                fontWeight: active ? 700 : 400,
                letterSpacing: "0.03em",
                lineHeight: 1,
                whiteSpace: "nowrap",
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
