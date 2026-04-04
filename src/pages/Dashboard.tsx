import { useState, useEffect } from "react";
import { Presentation, FileText, BookOpen, CalendarDays, ArrowRight, Clock, Zap, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const quickActions = [
  {
    title: "Generate PPT",
    description: "Create AI-powered presentations in seconds",
    icon: Presentation,
    to: "/dashboard/ppt",
    gradient: "linear-gradient(135deg, hsl(262,80%,62%), hsl(280,70%,52%))",
    glow: "hsla(262,80%,62%,0.2)",
    stat: "12 created",
  },
  {
    title: "Write Assignment",
    description: "Auto-generate structured academic assignments",
    icon: FileText,
    to: "/dashboard/assignments",
    gradient: "linear-gradient(135deg, hsl(220,85%,62%), hsl(200,80%,52%))",
    glow: "hsla(220,85%,62%,0.2)",
    stat: "8 generated",
  },
  {
    title: "Create Notes",
    description: "Turn any topic into study-ready notes",
    icon: BookOpen,
    to: "/dashboard/notes",
    gradient: "linear-gradient(135deg, hsl(160,70%,46%), hsl(175,65%,40%))",
    glow: "hsla(160,70%,46%,0.2)",
    stat: "24 notes",
  },
  {
    title: "Build Timetable",
    description: "Organize your weekly academic schedule",
    icon: CalendarDays,
    to: "/dashboard/timetable",
    gradient: "linear-gradient(135deg, hsl(30,85%,58%), hsl(12,78%,52%))",
    glow: "hsla(30,85%,58%,0.2)",
    stat: "This week",
  },
];

const recentActivity = [
  { action: "Generated PPT",       subject: "Data Structures — Linked Lists",        time: "2h ago",  icon: Presentation, color: "hsl(262,80%,68%)" },
  { action: "Created Notes",       subject: "OS — Process Scheduling",               time: "5h ago",  icon: BookOpen,     color: "hsl(160,70%,55%)" },
  { action: "Wrote Assignment",    subject: "DBMS — Normalization",                  time: "1d ago",  icon: FileText,     color: "hsl(220,85%,68%)" },
  { action: "Updated Timetable",   subject: "Added Thursday lab session",            time: "2d ago",  icon: CalendarDays, color: "hsl(30,85%,65%)" },
  { action: "Checked off 3 tasks", subject: "Submit ML Project Report",             time: "3d ago",  icon: Zap,          color: "hsl(50,85%,65%)"  },
];

// Animated counter hook
function useCounter(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
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
  const ppts   = useCounter(12);
  const notes  = useCounter(24);
  const tasks  = useCounter(37);

  return (
    <div className="space-y-8">

      {/* ── Welcome ── */}
      <div className="fade-up" style={{ animationDelay: "0ms" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="font-display font-bold"
              style={{ fontSize: "var(--text-3xl)", lineHeight: 1.15 }}
            >
              Welcome back,{" "}
              <span className="gradient-text">Ronit</span> 👋
            </h1>
            <p className="page-subtitle" style={{ marginTop: 6 }}>
              Your academic workflow is running smoothly.
            </p>
          </div>
          {/* Streak badge */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: "hsla(30,80%,55%,0.12)",
              border: "1px solid hsla(30,80%,55%,0.25)",
              animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 200ms both",
            }}
          >
            <TrendingUp size={14} style={{ color: "hsl(30,80%,65%)" }} />
            <span style={{ fontSize: "var(--text-xs)", color: "hsl(30,80%,70%)", fontWeight: 600 }}>
              5-day streak
            </span>
          </div>
        </div>

        {/* Mini stat pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { label: "PPTs",  val: ppts,  color: "hsl(262,80%,70%)" },
            { label: "Notes", val: notes, color: "hsl(160,65%,55%)" },
            { label: "Tasks done", val: tasks, color: "hsl(220,80%,68%)" },
          ].map(({ label, val, color }) => (
            <span
              key={label}
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
              >
                <action.icon size={18} style={{ color: "#fff" }} />
              </div>
              <h3
                className="font-display font-semibold"
                style={{ fontSize: "var(--text-sm)", color: "hsl(var(--foreground))", marginBottom: 4 }}
              >
                {action.title}
              </h3>
              <p
                style={{ fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))", marginBottom: 16, lineHeight: 1.5 }}
              >
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
        style={{
          animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 380ms both",
        }}
      >
        {/* header */}
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
            <Clock size={14} style={{ color: "hsl(262,80%,65%)" }} />
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
        {/* list */}
        <div style={{ padding: "8px 12px 12px" }}>
          {recentActivity.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="group flex items-center gap-3 rounded-xl transition-colors duration-150"
                style={{
                  padding: "10px 10px",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary))";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <div
                  className="flex items-center justify-center rounded-lg shrink-0"
                  style={{ width: 30, height: 30, background: "hsl(var(--secondary))" }}
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
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--muted-foreground))",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
