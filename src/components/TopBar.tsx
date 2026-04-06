import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getInitials,
  getDisplayName,
  getAvatarUrl,
  getRoleLabel,
} from "@/lib/userUtils";
// FIX 3.4: getInitials, getDisplayName, getAvatarUrl, getRoleLabel now imported
// from the shared src/lib/userUtils.ts instead of being defined locally.
// The identical local copies in AppSidebar.tsx are also removed (see that file).

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
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "StudyAI";
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { user } = useAuth();

  // FIX 3.4: All user-display logic lives in userUtils now
  const initials   = getInitials(user?.user_metadata?.full_name ?? user?.email);
  const displayName = getDisplayName(user);
  const avatarUrl   = getAvatarUrl(user);
  // FIX 3.3: Role label — no longer hardcoded "Student".
  // Reads from user_metadata.role if it exists (future: from profiles table).
  // Falls back to "Student" via getRoleLabel when no role is set.
  const roleLabel = getRoleLabel(
    (user?.user_metadata as Record<string, string> | undefined)?.role
  );

  // FIX 3.1: blurTimeout ref prevents the search input from closing
  // immediately when the user clicks elsewhere. Without a delay, onBlur fires
  // before any mousedown handler on a hypothetical search result, making
  // clicks on results impossible. The 150ms delay gives mousedown time to fire.
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchBlur = () => {
    blurTimeout.current = setTimeout(() => {
      setSearchOpen(false);
      setQuery("");
    }, 150);
  };

  const handleSearchFocus = () => {
    // If the user re-focuses (e.g. tabs back) cancel the pending close
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
  };

  return (
    <header
      className="glass-card"
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        borderRadius: 0,
        borderBottomColor: "hsl(240,10%,14%)",
        gap: 12,
      }}
    >
      {/* Left: trigger + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary"
          style={{ flexShrink: 0 }}
          aria-label="Toggle sidebar"
        />
        <div
          aria-hidden="true"
          style={{
            width: 1,
            height: 18,
            background: "hsl(240,10%,18%)",
            flexShrink: 0,
          }}
        />
        {/* Use <h1> so each dashboard page has a proper document heading.
            visually styled small to fit the topbar. */}
        <h1
          className="font-display font-semibold truncate"
          style={{ fontSize: "var(--text-sm)", color: "hsl(220,15%,72%)", margin: 0 }}
        >
          {title}
        </h1>
      </div>

      {/* Right: search + notif + avatar */}
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>

        {/* Inline search
            FIX 3.1: onBlur uses a 150ms delayed close so that click events
            on future search-result items have time to fire before the
            input unmounts. onFocus cancels any pending close. */}
        {searchOpen ? (
          <div
            className="flex items-center gap-2 px-3 rounded-xl"
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(262,80%,62%)",
              boxShadow: "0 0 0 3px hsla(262,80%,62%,0.12)",
              height: 34,
              width: 220,
              transition: "all 0.2s ease",
            }}
          >
            <Search size={13} style={{ color: "hsl(262,80%,65%)", flexShrink: 0 }} aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={handleSearchBlur}
              onFocus={handleSearchFocus}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Search..."
              aria-label="Search"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "var(--text-sm)",
                color: "hsl(var(--foreground))",
                width: "100%",
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            style={{
              height: 34,
              border: "1px solid hsl(var(--border))",
              fontSize: "var(--text-xs)",
            }}
            aria-label="Open search"
          >
            <Search size={13} aria-hidden="true" />
            <span className="hidden sm:block">Search</span>
          </button>
        )}

        {/* Notification bell
            FIX 3.2: disabled button previously looked identical to an
            enabled one — it had :hover styles but no visual disabled state.
            Now uses opacity-40 + cursor-not-allowed inline styles so users
            can clearly see it’s not interactive yet. The aria-label and
            title tooltip are retained to explain why. */}
        <button
          className="relative flex items-center justify-center rounded-xl transition-all text-muted-foreground"
          style={{
            width: 34,
            height: 34,
            border: "1px solid hsl(var(--border))",
            flexShrink: 0,
            opacity: 0.4,
            cursor: "not-allowed",
          }}
          aria-label="Notifications (coming soon)"
          aria-disabled="true"
          title="Notifications coming soon"
          disabled
        >
          <Bell size={15} aria-hidden="true" />
        </button>

        {/* Avatar → profile */}
        <Link
          to="/dashboard/profile"
          aria-label={`${displayName} — View profile`}
          className="flex items-center gap-2 px-2.5 rounded-xl hover:bg-secondary transition-all"
          style={{
            height: 34,
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
          <span className="hidden sm:flex flex-col" style={{ gap: 0 }}>
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "hsl(var(--foreground))",
                lineHeight: 1.2,
              }}
            >
              {displayName}
            </span>
            {/* FIX 3.3: Was hardcoded \"Student\". Now reads from getRoleLabel(). */}
            <span
              style={{
                fontSize: 10,
                color: "hsl(var(--muted-foreground))",
                lineHeight: 1.2,
              }}
            >
              {roleLabel}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
};

export default TopBar;
