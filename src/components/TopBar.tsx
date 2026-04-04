import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Search, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

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

const TopBar = () => {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "StudyAI";
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

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
            <kbd
              className="hidden sm:block"
              style={{
                fontSize: 10,
                padding: "1px 5px",
                borderRadius: 4,
                background: "hsl(240,12%,16%)",
                border: "1px solid hsl(240,10%,22%)",
                color: "hsl(220,8%,45%)",
                fontFamily: "inherit",
                lineHeight: 1.6,
              }}
            >
              ⌘K
            </kbd>
          </button>
        )}

        {/* Notification bell */}
        <button
          className="relative flex items-center justify-center rounded-xl hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
          style={{
            width: 34,
            height: 34,
            border: "1px solid hsl(var(--border))",
            flexShrink: 0,
          }}
          aria-label="Notifications"
        >
          <Bell size={15} />
          <span
            className="absolute glow-pulse"
            style={{
              top: 8,
              right: 8,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "hsl(262,80%,68%)",
              border: "1.5px solid hsl(240,16%,5%)",
            }}
          />
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
          <span
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            R
          </span>
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
              Ronit
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
