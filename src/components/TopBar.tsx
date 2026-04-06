/**
 * TopBar.tsx
 *
 * PRE-PHASE-9 CLEANUP
 * ───────────────────
 * 1. REMOVE search button — the input had no results backend and no
 *    navigation effect. Dead UI removed entirely. Will be re-added
 *    in a future phase when a real search index exists.
 *
 * 2. REMOVE notification bell — it was `disabled` with opacity:0.4
 *    and cursor:not-allowed. It communicated "coming soon" but added
 *    visual noise and confusion. Removed until notifications ship.
 *
 * 3. PROFILE DEDUPLICATION — TopBar avatar link kept as a convenience
 *    shortcut to /dashboard/profile. This does NOT duplicate the
 *    sidebar footer profile link because:
 *      - Desktop: sidebar footer is the canonical nav entry.
 *        TopBar avatar is a secondary shortcut (common pattern: GitHub,
 *        Linear, Vercel all have both).
 *      - Mobile: sidebar is hidden. TopBar avatar + bottom-nav Profile
 *        tab are the two entry points. The bottom-nav tab is primary;
 *        the avatar in the TopBar is secondary. Both are intentional.
 *
 * 4. LAYOUT — TopBar is now simpler: trigger | title | avatar.
 *    Removes the flex gap inconsistency that caused the right section
 *    to overflow on narrow screens (< 360px).
 */

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getInitials,
  getDisplayName,
  getAvatarUrl,
  getRoleLabel,
} from "@/lib/userUtils";

const TITLES: Record<string, string> = {
  "/dashboard":             "Dashboard",
  "/dashboard/ppt":         "PPT Generator",
  "/dashboard/assignments": "Assignments",
  "/dashboard/notes":       "Notes",
  "/dashboard/timetable":   "Timetable",
  "/dashboard/checklist":   "Checklist",
  "/dashboard/profile":     "Profile",
};

const TopBar = () => {
  const location  = useLocation();
  const title     = TITLES[location.pathname] ?? "Aura Study";
  const { user }  = useAuth();

  const initials    = getInitials(user?.user_metadata?.full_name ?? user?.email);
  const displayName = getDisplayName(user);
  const avatarUrl   = getAvatarUrl(user);
  const roleLabel   = getRoleLabel(
    (user?.user_metadata as Record<string, string> | undefined)?.role
  );

  return (
    <header
      className="glass-card"
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(12px, 3vw, 20px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        borderRadius: 0,
        borderBottomColor: "hsl(240,10%,14%)",
        gap: 12,
        flexShrink: 0,
      }}
    >
      {/* Left: sidebar trigger + page title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary"
          style={{ flexShrink: 0 }}
          aria-label="Toggle sidebar"
        />
        {/* Divider */}
        <div
          aria-hidden="true"
          style={{
            width: 1,
            height: 18,
            background: "hsl(240,10%,18%)",
            flexShrink: 0,
          }}
        />
        {/* Page title — h1 so each route has a proper document heading */}
        <h1
          className="font-display font-semibold truncate"
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(220,15%,72%)",
            margin: 0,
            lineHeight: 1,
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right: avatar → profile (secondary shortcut) */}
      <Link
        to="/dashboard/profile"
        aria-label={`${displayName} — View profile`}
        className="flex items-center gap-2 px-2.5 rounded-xl hover:bg-secondary transition-all"
        style={{
          height: 36,
          border: "1px solid hsl(var(--border))",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            className="w-6 h-6 rounded-lg object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            {initials}
          </span>
        )}
        {/* Name + role — hidden on very small screens to prevent overflow */}
        <span className="hidden sm:flex flex-col" style={{ gap: 0 }}>
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: "hsl(var(--foreground))",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "hsl(var(--muted-foreground))",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {roleLabel}
          </span>
        </span>
      </Link>
    </header>
  );
};

export default TopBar;
