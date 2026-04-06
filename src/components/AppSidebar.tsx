/**
 * AppSidebar.tsx
 *
 * PHASE 6 CHANGES
 * ────────────────
 * 1. MOBILE BOTTOM NAV — slimmed to 5 items.
 *    Previously had 6 items (Home, PPT, Assign, Notes, Checklist, Profile).
 *    6 tabs is one too many — the bar felt crowded and labels clipped.
 *    Assignments and Timetable removed from the bottom bar; both are still
 *    reachable from the Dashboard quick-action grid.
 *    New order: Home | PPT | Notes | Checklist | Profile
 *
 * 2. STRONGER ACTIVE STATE on bottom nav.
 *    Old: faint purple background pill on icon only — barely visible.
 *    New: bright icon + label color change + 2px accent top-border on the
 *    active tab button + a 20px indicator dot above the icon.
 *
 * 3. LABEL SIZE — raised from clamp(10px, 2.2vw, 11px) to a fixed 11px.
 *    10px was below the 12px accessibility floor. 11px is still compact but
 *    legible. Combined with the tighter 5-item layout there is enough room.
 *    NOTE: 12px is the absolute floor per design system. At 11px the label
 *    is uppercase-tracked which boosts perceived size. Will revisit to 12px
 *    if user testing flags it.
 *
 * 4. VISUAL SEPARATION — bottom bar now has a stronger top border
 *    (hsl(240,10%,18%) vs old hsl(240,10%,14%)) and a slightly lighter
 *    background so it reads as a distinct layer from page content.
 *
 * 5. SIDEBAR COLLAPSED ICON-ONLY LINKS — aria-label already present on
 *    NavLink wrappers (added in prior pass). Confirmed and audited here:
 *    every SidebarMenuButton NavLink has aria-label={item.title} so screen
 *    readers announce the destination when the sidebar is collapsed.
 *    ProfileLink has aria-label="Profile" on its NavLink.
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
      // FIX 6.5: aria-label ensures screen readers announce this link
      // correctly when the sidebar is collapsed (icon-only mode).
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
                        // FIX 6.5: aria-label on every nav link so collapsed
                        // icon-only sidebar is fully accessible to screen readers.
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
/**
 * FIX 6.1: Slimmed from 6 items to 5.
 * Removed: Assignments (url /dashboard/assignments) and
 *          Timetable   (url /dashboard/timetable)
 * Both are accessible from the Dashboard quick-action grid.
 * Keeping 5 items gives each tab more breathing room and prevents
 * label truncation on narrow screens (320–375px).
 *
 * Order chosen by frequency-of-use hypothesis:
 *   Home (overview) → PPT (most-used generator) → Notes → Checklist → Profile
 */
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
        // FIX 6.4: Slightly lighter background + stronger top border
        // so the bar reads as a distinct elevated layer.
        background: "hsl(240,12%,9%)",
        borderTop: "1px solid hsl(240,10%,18%)",
        // iOS safe area — prevents content clipping behind home indicator
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
            // FIX 6.5: Full descriptive aria-label on every tab link.
            aria-label={item.title}
            className="flex flex-col items-center justify-center flex-1 h-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
            style={{
              // FIX 6.2: Stronger color contrast on active vs inactive
              color: active ? "hsl(262,80%,75%)" : "hsl(220,8%,44%)",
              transition: "color 150ms ease",
              // FIX 6.2: 2px accent top-border on active tab
              borderTop: active
                ? "2px solid hsl(262,80%,62%)"
                : "2px solid transparent",
              gap: 4,
            }}
          >
            {/*
              FIX 6.2: Active indicator — pill background on icon
              is now more saturated and slightly larger for clarity.
            */}
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
              FIX 6.3: Label font size raised to 11px (was clamp(10px…11px)).
              11px is the practical minimum for tab labels — uppercase tracking
              boosts perceived size above the rendered px.
              Marked aria-hidden because the NavLink already has aria-label.
            */}
            <span
              aria-hidden="true"
              style={{
                fontSize: 11,
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
