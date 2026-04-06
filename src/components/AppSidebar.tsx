/**
 * AppSidebar.tsx
 *
 * PHASE 7 CHANGES
 * ────────────────
 * 1. MOBILE NAV LABEL — raised from 11px → 12px.
 *    12px is the absolute accessibility floor defined in the
 *    design system (--text-xs clamp lower bound). 11px was a
 *    deliberate Phase 6 compromise; now that the bar is 5 items
 *    there is enough room to meet the hard floor.
 *
 * All other changes (5-item bar, stronger active state,
 * visual separation, aria-labels) were completed in Phase 6.
 */

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
import { getInitials, getDisplayName, getAvatarUrl } from "@/lib/userUtils";

const mainItems = [
  { title: "Dashboard",   url: "/dashboard",             icon: LayoutDashboard },
  { title: "PPT",         url: "/dashboard/ppt",          icon: Presentation    },
  { title: "Assignments", url: "/dashboard/assignments",  icon: FileText        },
  { title: "Notes",       url: "/dashboard/notes",        icon: BookOpen        },
  { title: "Timetable",   url: "/dashboard/timetable",    icon: CalendarDays    },
  { title: "Checklist",   url: "/dashboard/checklist",    icon: CheckSquare     },
];

// ── ProfileLink ────────────────────────────────────────────────────
interface ProfileLinkProps {
  avatarUrl?: string;
  displayName: string;
  initials: string;
  collapsed: boolean;
  active: boolean;
}

function ProfileLink({
  avatarUrl,
  displayName,
  initials,
  collapsed,
  active,
}: ProfileLinkProps) {
  return (
    <NavLink
      to="/dashboard/profile"
      end
      aria-label="Profile"
      className="flex items-center gap-3 px-3 rounded-xl text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      style={{
        height: 40,
        color: active ? "hsl(262,80%,75%)" : "hsl(220,8%,58%)",
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
}

// ── Desktop sidebar ─────────────────────────────────────────────────
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();

  const initials    = getInitials(user?.user_metadata?.full_name ?? user?.email);
  const displayName = getDisplayName(user);
  const avatarUrl   = getAvatarUrl(user);

  const isActive = (url: string) =>
    url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(url);

  return (
    <Sidebar
      collapsible="icon"
      style={{ borderRight: "1px solid hsl(240,10%,14%)" }}
    >
      {/* Logo */}
      <SidebarHeader style={{ padding: collapsed ? "14px 12px" : "16px 14px" }}>
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
                        aria-label={item.title}
                        className="flex items-center gap-3 px-3 rounded-xl text-sm transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        style={{
                          height: 38,
                          color: active ? "hsl(262,80%,75%)" : "hsl(220,8%,58%)",
                          background: active
                            ? "hsla(262,80%,62%,0.12)"
                            : "transparent",
                          fontWeight: active ? 600 : 400,
                        }}
                        activeClassName=""
                      >
                        <span
                          className="flex items-center justify-center shrink-0"
                          aria-hidden="true"
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
                                aria-hidden="true"
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

      {/* Profile footer */}
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
      </SidebarFooter>
    </Sidebar>
  );
}

// ── Mobile bottom tab bar ───────────────────────────────────────────
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "hsl(240,12%,9%)",
        borderTop: "1px solid hsl(240,10%,18%)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(60px + env(safe-area-inset-bottom, 0px))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
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
            className="flex flex-col items-center justify-center flex-1 h-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
            style={{
              color: active ? "hsl(262,80%,75%)" : "hsl(220,8%,44%)",
              transition: "color 150ms ease",
              borderTop: active
                ? "2px solid hsl(262,80%,62%)"
                : "2px solid transparent",
              gap: 4,
            }}
          >
            <span
              aria-hidden="true"
              className="flex items-center justify-center rounded-xl transition-all duration-150"
              style={{
                width: 40,
                height: 28,
                background: active
                  ? "hsla(262,80%,62%,0.18)"
                  : "transparent",
              }}
            >
              <item.icon
                size={active ? 19 : 18}
                strokeWidth={active ? 2.2 : 1.8}
              />
            </span>
            {/*
              PHASE 7 FIX: Label raised from 11px → 12px.
              12px is the absolute floor per design system
              (--text-xs clamp lower bound). All text on screen
              must render at 12px minimum — no exceptions.
            */}
            <span
              aria-hidden="true"
              style={{
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                letterSpacing: "0.04em",
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
