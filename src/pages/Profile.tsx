import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Presentation,
  FileText,
  BookOpen,
  CheckSquare,
  Clock,
  Shield,
  ChevronRight,
  Pencil,
  X,
  Check,
  Sparkles,
} from "lucide-react";

// ─── Mock data (replaced by Supabase in C-phases) ─────────────────────────────
const MOCK_USER = {
  name: "Ronit Sinha",
  email: "sinharonitraj@gmail.com",
  joined: "April 2026",
  plan: "Premium",
};

const MOCK_STATS = [
  {
    id: "ppts",
    label: "PPTs Created",
    value: 12,
    icon: Presentation,
    gradient: "from-purple-500 to-blue-500",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
  },
  {
    id: "assignments",
    label: "Assignments Generated",
    value: 8,
    icon: FileText,
    gradient: "from-blue-500 to-cyan-500",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
  },
  {
    id: "notes",
    label: "Notes Created",
    value: 24,
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-500",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
  },
  {
    id: "tasks",
    label: "Tasks Completed",
    value: 37,
    icon: CheckSquare,
    gradient: "from-orange-500 to-pink-500",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.25)",
  },
];

const ACTIVITY = [
  { label: "Generated 'Quantum Physics' PPT", time: "2 hours ago", icon: Presentation, color: "text-purple-400" },
  { label: "Created 'Organic Chemistry' Notes", time: "Yesterday", icon: BookOpen, color: "text-emerald-400" },
  { label: "Wrote 'Climate Change' Assignment", time: "2 days ago", icon: FileText, color: "text-blue-400" },
  { label: "Built weekly Timetable", time: "3 days ago", icon: Clock, color: "text-orange-400" },
  { label: "Completed 5 checklist tasks", time: "4 days ago", icon: CheckSquare, color: "text-pink-400" },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 96 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="relative flex-shrink-0 rounded-full flex items-center justify-center select-none"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, hsl(262,80%,60%), hsl(220,85%,60%))",
        boxShadow: "0 0 0 3px rgba(139,92,246,0.35), 0 0 32px rgba(139,92,246,0.3)",
      }}
    >
      <span
        className="font-display font-bold text-white"
        style={{ fontSize: size * 0.35 }}
      >
        {initials}
      </span>
      {/* online dot */}
      <span
        className="absolute bottom-1 right-1 rounded-full bg-emerald-400"
        style={{ width: size * 0.16, height: size * 0.16, border: "2px solid hsl(220,17%,10%)" }}
      />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ stat, animDelay }: { stat: (typeof MOCK_STATS)[0]; animDelay: number }) {
  const Icon = stat.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 cursor-default"
      style={{
        background: hovered ? stat.bg : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? stat.border : "rgba(255,255,255,0.07)"}`,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 32px ${stat.bg}` : "none",
        animationDelay: `${animDelay}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
      >
        <Icon
          size={18}
          className={`bg-gradient-to-br ${stat.gradient} bg-clip-text`}
          style={{ color: "transparent", stroke: `url(#grad-${stat.id})` }}
        />
        {/* fallback plain icon */}
        <Icon size={18} className="absolute opacity-0" />
      </div>
      <div>
        <p
          className="font-display font-bold text-3xl"
          style={{
            background: `linear-gradient(135deg, ${stat.gradient.replace("from-", "").replace(" to-", ",")})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {stat.value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
      </div>
    </div>
  );
}

// ─── Inline editable name ─────────────────────────────────────────────────────
function EditableName({ initial }: { initial: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [draft, setDraft] = useState(initial);

  const commit = () => {
    if (draft.trim()) setValue(draft.trim());
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            className="font-display font-bold text-2xl bg-transparent border-b border-purple-500/60 outline-none text-white pr-1 min-w-0"
            style={{ width: Math.max(draft.length, 6) + "ch" }}
          />
          <button
            onClick={commit}
            className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-all"
          >
            <Check size={12} />
          </button>
          <button
            onClick={cancel}
            className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all"
          >
            <X size={12} />
          </button>
        </>
      ) : (
        <>
          <h1 className="font-display font-bold text-2xl text-white">{value}</h1>
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <Pencil size={11} />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Logout Confirm Modal ─────────────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-8 max-w-sm w-full mx-4 flex flex-col gap-5"
        style={{
          background: "hsl(224,20%,12%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          animation: "scaleIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <LogOut size={24} className="text-red-400" />
          </div>
          <h3 className="font-display font-bold text-lg text-white">Sign out?</h3>
          <p className="text-sm text-muted-foreground">You'll be redirected to the login page.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "hsl(215,20%,65%)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "white",
              boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    setShowLogout(false);
    navigate("/login");
  };

  const totalActions = MOCK_STATS.reduce((s, x) => s + x.value, 0);

  return (
    <>
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {showLogout && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />
      )}

      <div className="min-h-full p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        {/* ── Hero card ────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden fade-up"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            animationDelay: "0ms",
          }}
        >
          {/* Banner */}
          <div
            className="h-28 w-full relative"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(59,130,246,0.25) 50%, rgba(16,185,129,0.15) 100%)",
            }}
          >
            {/* subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* plan badge */}
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(139,92,246,0.25)",
                border: "1px solid rgba(139,92,246,0.4)",
                color: "hsl(262,80%,75%)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Sparkles size={11} />
              {MOCK_USER.plan}
            </div>
          </div>

          {/* Profile row */}
          <div className="px-6 pb-6">
            {/* Avatar overlapping banner */}
            <div className="-mt-12 mb-4 group">
              <Avatar name={MOCK_USER.name} size={80} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1 group">
                <EditableName initial={MOCK_USER.name} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail size={13} className="text-purple-400" />
                    {MOCK_USER.email}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar size={13} className="text-blue-400" />
                    Joined {MOCK_USER.joined}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Shield size={13} className="text-emerald-400" />
                    {totalActions} total actions
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={() => setShowLogout(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.18)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.45)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.25)";
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats grid ───────────────────────────────────────────────── */}
        <div
          className="fade-up"
          style={{ animationDelay: "80ms" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Activity Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MOCK_STATS.map((stat, i) => (
              <StatCard key={stat.id} stat={stat} animDelay={i * 40} />
            ))}
          </div>
        </div>

        {/* ── Two column: Account info + Recent activity ────────────── */}
        <div
          className="grid md:grid-cols-2 gap-5 fade-up"
          style={{ animationDelay: "160ms" }}
        >
          {/* Account details */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Account Details
            </h2>

            {[
              { icon: User, label: "Display Name", value: MOCK_USER.name, color: "text-purple-400" },
              { icon: Mail, label: "Email", value: MOCK_USER.email, color: "text-blue-400" },
              { icon: Calendar, label: "Member Since", value: MOCK_USER.joined, color: "text-orange-400" },
              { icon: Shield, label: "Plan", value: MOCK_USER.plan, color: "text-emerald-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2.5 border-b last:border-0"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <Icon size={14} className={color} />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recent Activity
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(139,92,246,0.15)",
                  color: "hsl(262,80%,70%)",
                  border: "1px solid rgba(139,92,246,0.25)",
                }}
              >
                {ACTIVITY.length} entries
              </span>
            </div>

            <div className="space-y-1">
              {ACTIVITY.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-default"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <Icon size={13} className={item.color} />
                    </div>
                    <span className="text-sm text-foreground flex-1 min-w-0 truncate">{item.label}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      {item.time}
                    </span>
                    <ChevronRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
