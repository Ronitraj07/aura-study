import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

// Route → page title map
const TITLES: Record<string, string> = {
  "/dashboard":             "Dashboard",
  "/dashboard/ppt":         "PPT Generator",
  "/dashboard/assignments": "Assignments",
  "/dashboard/notes":       "Notes",
  "/dashboard/timetable":   "Timetable",
  "/dashboard/checklist":   "Checklist",
  "/dashboard/profile":     "Profile",
};

/** Returns initials from a full name or email, e.g. "Ronit Sinha" → "RS", "foo@bar.com" → "F" */
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

/** Returns the display name: full_name if available, else the part before @ in email */
function getDisplayName(user: { email?: string; user_metadata?: { full_name?: string } } | null): string {
  if (!user) return "";
  const full = user.user_metadata?.full_name;
  if (full) return full.split(" ")[0]; // first name only
  return user.email?.split("@")[0] ?? "";
}

const TopBar = () => {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "StudyAI";
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { user } = useAuth();

  const initials = getInitials(user?.user_metadata?.full_name ?? user?.email);
  const displayName = getDisplayName(user);
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;

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
        />
        <div
          style={{
            width: 1,
            height: 18,
            background: "hsl(240,10%,18%)",
            flexShrink: 0,
          }}
        />
        <span
          className="font-display font-semibold truncate"
          style={{ fontSize: "var(--text-sm)", color: "hsl(220,15%,72%)" }}
        >
          {title}
        </span>
      </div>

      {/* Right: search + notif + avatar */}
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        {/* Inline search */}
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
            <Search size={13} style={{ color: "hsl(262,80%,65%)", flexShrink: 0 }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => { setSearchOpen(false); setQuery(""); }}
              onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
              placeholder="Search..."
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
          >
            <Search size={13} />
            <span className="hidden sm:block">Search</span>
          </button>
        )}

        {/* Notification bell — no dot until notifications are implemented */}
        <button
          className="relative flex items-center justify-center rounded-xl hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
          style={{
            width: 34,
            height: 34,
            border: "1px solid hsl(var(--border))",
            flexShrink: 0,
          }}
          aria-label="Notifications (coming soon)"
          title="Notifications coming soon"
          disabled
        >
          <Bell size={15} />
        </button>

        {/* Avatar → profile */}
        <Link
          to="/dashboard/profile"
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
              alt={displayName || "Avatar"}
              className="w-6 h-6 rounded-lg object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initials}
            </span>
          )}
          <span
            className="hidden sm:flex flex-col"
            style={{ gap: 0 }}
          >
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
            <span
              style={{
                fontSize: 10,
                color: "hsl(var(--muted-foreground))",
                lineHeight: 1.2,
              }}
            >
              Student
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
};

export default TopBar;
