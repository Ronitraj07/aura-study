/**
 * Dashboard.tsx
 *
 * PHASE 4 CHANGES
 * ────────────────
 * 1. EMPTY STATE for Recent Activity.
 *    When recentActivity is empty (which it is until Phase 5 wires Supabase),
 *    show a proper empty state with icon + message + CTA instead of
 *    an empty card with just a header. "No items" is never acceptable.
 *
 * 2. REMOVE inline onMouseEnter/Leave style mutations.
 *    The row hover was done via onMouseEnter/onMouseLeave imperatively
 *    mutating el.style.background. Replaced with a CSS class approach
 *    using a data-hover attribute + <style> block, keeping the same
 *    visual result but without runtime DOM style mutations.
 *
 * 3. Activity list uses role="list" / role="listitem" for screen readers
 *    and a visually hidden sr-only label.
 */

import { useState, useEffect } from "react";
import {
  Presentation,
  FileText,
  BookOpen,
  CalendarDays,
  ArrowRight,
  Clock,
  Zap,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getDisplayName } from "@/lib/userUtils";

const quickActions = [
  {
    title: "Generate PPT",
    description: "Create AI-powered presentations in seconds",
    icon: Presentation,
    to: "/dashboard/ppt",
    gradient: "linear-gradient(135deg, hsl(262,80%,62%), hsl(280,70%,52%))",
    glow: "hsla(262,80%,62%,0.2)",
    stat: "PPT Generator",
  },
  {
    title: "Write Assignment",
    description: "Auto-generate structured academic assignments",
    icon: FileText,
    to: "/dashboard/assignments",
    gradient: "linear-gradient(135deg, hsl(220,85%,62%), hsl(200,80%,52%))",
    glow: "hsla(220,85%,62%,0.2)",
    stat: "Assignments",
  },
  {
    title: "Create Notes",
    description: "Turn any topic into study-ready notes",
    icon: BookOpen,
    to: "/dashboard/notes",
    gradient: "linear-gradient(135deg, hsl(160,70%,46%), hsl(175,65%,40%))",
    glow: "hsla(160,70%,46%,0.2)",
    stat: "Notes",
  },
  {
    title: "Build Timetable",
    description: "Organize your weekly academic schedule",
    icon: CalendarDays,
    to: "/dashboard/timetable",
    gradient: "linear-gradient(135deg, hsl(30,85%,58%), hsl(12,78%,52%))",
    glow: "hsla(30,85%,58%,0.2)",
    stat: "Timetable",
  },
];

// TODO Phase 5: replace with useQuery from Supabase activity_log table.
// When this array has items the list renders; when empty the EmptyState shows.
const recentActivity: {
  action: string;
  subject: string;
  time: string;
  icon: React.ElementType;
  color: string;
}[] = [];

// Animated counter hook
function useCounter(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

const Dashboard = () => {
  const { user } = useAuth();
  // FIX 4: use shared userUtils instead of local duplicate
  const firstName = getDisplayName(user) || "there";

  const ppts   = useCounter(0);
  const notes  = useCounter(0);
  const tasks  = useCounter(0);

  return (
    <>
      {/*
        FIX 4.2: CSS for activity row hover — replaces inline style mutations.
        .activity-row:hover background is handled in CSS, not JS.
      */}
      <style>{`
        .activity-row:hover { background: hsl(var(--secondary)); }
      `}</style>

      <div className="space-y-8">
        {/* ── Welcome ── */}
        <div className="fade-up" style={{ animationDelay: "0ms" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1
                className="font-display font-bold"
                style={{ fontSize: "var(--text-2xl)", lineHeight: 1.15 }}
              >
                Welcome back,{" "}
                <span className="gradient-text">{firstName}</span> 👋
              </h1>
              <p className="page-subtitle" style={{ marginTop: 6 }}>
                Your academic workflow is running smoothly.
              </p>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "hsla(30,80%,55%,0.12)",
                border: "1px solid hsla(30,80%,55%,0.25)",
                animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 200ms both",
              }}
            >
              <TrendingUp size={14} style={{ color: "hsl(30,80%,65%)" }} aria-hidden="true" />
              <span style={{ fontSize: "var(--text-xs)", color: "hsl(30,80%,70%)", fontWeight: 600 }}>
                5-day streak
              </span>
            </div>
          </div>

          {/* Mini stat pills */}
          <div className="flex flex-wrap gap-2 mt-4" role="list" aria-label="Usage stats">
            {[
              { label: "PPTs",       val: ppts,  color: "hsl(262,80%,70%)" },
              { label: "Notes",      val: notes, color: "hsl(160,65%,55%)" },
              { label: "Tasks done", val: tasks, color: "hsl(220,80%,68%)" },
            ].map(({ label, val, color }) => (
              <span
                key={label}
                role="listitem"
                className="tabular-nums"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 99,
                  fontSize: "var(--text-xs)",
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                <span style={{ fontWeight: 700, color }}>{val}</span>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <p className="section-label">Quick actions</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <Link
                key={action.title}
                to={action.to}
                className="glass-card rounded-2xl card-interactive"
                style={{
                  display: "block",
                  padding: "20px",
                  textDecoration: "none",
                  animation: `fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) ${80 + i * 60}ms both`,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl mb-4"
                  style={{
                    width: 40,
                    height: 40,
                    background: action.gradient,
                    boxShadow: `0 4px 14px ${action.glow}`,
                  }}
                  aria-hidden="true"
                >
                  <action.icon size={18} style={{ color: "#fff" }} />
                </div>
                <h3
                  className="font-display font-semibold"
                  style={{ fontSize: "var(--text-sm)", color: "hsl(var(--foreground))", marginBottom: 4 }}
                >
                  {action.title}
                </h3>
                <p style={{ fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))", marginBottom: 16, lineHeight: 1.5 }}>
                  {action.description}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "hsl(var(--muted-foreground))",
                      background: "hsl(var(--secondary))",
                      padding: "2px 8px",
                      borderRadius: 99,
                      border: "1px solid hsl(var(--border))",
                    }}
                  >
                    {action.stat}
                  </span>
                  <span
                    className="flex items-center gap-1"
                    style={{ fontSize: "var(--text-xs)", color: "hsl(262,80%,68%)", fontWeight: 500 }}
                    aria-hidden="true"
                  >
                    Open <ArrowRight size={11} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div
          className="glass-card rounded-2xl"
          style={{ animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 380ms both" }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 20px 14px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              className="font-display font-semibold flex items-center gap-2"
              style={{ fontSize: "var(--text-sm)" }}
            >
              <Clock size={14} style={{ color: "hsl(262,80%,65%)" }} aria-hidden="true" />
              Recent Activity
            </span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "hsl(var(--muted-foreground))",
                background: "hsl(var(--secondary))",
                padding: "2px 10px",
                borderRadius: 99,
                border: "1px solid hsl(var(--border))",
              }}
            >
              {recentActivity.length} entries
            </span>
          </div>

          {/*
            FIX 4.1: Empty state — shown when recentActivity is empty.
            A proper empty state with icon, warm message, and a CTA.
            "No items" is never acceptable (see Design Taste guidelines).
          */}
          {recentActivity.length === 0 ? (
            <div
              role="status"
              aria-label="No recent activity yet"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 24px",
                gap: 12,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 4,
                }}
                aria-hidden="true"
              >
                <Inbox size={22} style={{ color: "hsl(262,80%,62%)" }} />
              </div>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.4,
                }}
              >
                No activity yet
              </p>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "hsl(var(--muted-foreground))",
                  maxWidth: "30ch",
                  lineHeight: 1.6,
                }}
              >
                Generate your first PPT, notes, or assignment to see your history here.
              </p>
              <Link
                to="/dashboard/ppt"
                className="btn btn-primary"
                style={{ padding: "8px 20px", fontSize: "var(--text-xs)", borderRadius: "0.625rem", marginTop: 4 }}
              >
                <Zap size={13} aria-hidden="true" /> Start with PPT
              </Link>
            </div>
          ) : (
            /* Activity list — only rendered when there are items */
            <ul
              role="list"
              aria-label="Recent activity"
              style={{ padding: "8px 12px 12px", listStyle: "none", margin: 0 }}
            >
              {recentActivity.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li
                    key={i}
                    // FIX 4.2: CSS class handles hover — no inline style mutations
                    className="activity-row flex items-center gap-3 rounded-xl transition-colors duration-150"
                    style={{ padding: "10px", cursor: "default" }}
                  >
                    <div
                      className="flex items-center justify-center rounded-lg shrink-0"
                      style={{ width: 30, height: 30, background: "hsl(var(--secondary))" }}
                      aria-hidden="true"
                    >
                      <Icon size={13} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "hsl(var(--foreground))", lineHeight: 1.3 }}
                        className="truncate"
                      >
                        {item.action}
                      </p>
                      <p
                        style={{ fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))", lineHeight: 1.3 }}
                        className="truncate"
                      >
                        {item.subject}
                      </p>
                    </div>
                    <span
                      style={{ fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      {item.time}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
