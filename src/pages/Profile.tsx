import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Calendar, LogOut, Presentation,
  FileText, BookOpen, CheckSquare, Clock, Shield, Sparkles, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserStats, type RecentItem } from "@/hooks/useUserStats";

// ── Helpers ───────────────────────────────────────────────────
function getInitials(s: string | null | undefined) {
  if (!s) return "?";
  const parts = s.includes("@") ? [s.split("@")[0]] : s.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("");
}
function getDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) return "";
  return user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "";
}
function formatJoin(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 80 }: { name: string; avatarUrl?: string; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover flex-shrink-0"
        style={{
          width: size, height: size,
          boxShadow: "0 0 0 3px rgba(139,92,246,0.35), 0 0 32px rgba(139,92,246,0.3)",
        }}
      />
    );
  }
  return (
    <div
      className="relative flex-shrink-0 rounded-full flex items-center justify-center select-none"
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg, hsl(262,80%,60%), hsl(220,85%,60%))",
        boxShadow: "0 0 0 3px rgba(139,92,246,0.35), 0 0 32px rgba(139,92,246,0.3)",
      }}
    >
      <span className="font-display font-bold text-white" style={{ fontSize: size * 0.35 }}>
        {getInitials(name)}
      </span>
      <span
        className="absolute bottom-1 right-1 rounded-full bg-emerald-400"
        style={{ width: size * 0.16, height: size * 0.16, border: "2px solid hsl(220,17%,10%)" }}
      />
    </div>
  );
}

// ── Logout confirm modal ──────────────────────────────────────
function LogoutModal({
  onConfirm, onCancel, isLoading,
}: { onConfirm: () => void; onCancel: () => void; isLoading: boolean }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-6 sm:p-8 w-[calc(100%-32px)] max-w-sm flex flex-col gap-5"
        style={{
          background: "hsl(224,20%,12%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          animation: "scaleIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onClick={e => e.stopPropagation()}
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
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
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
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "white",
              boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { stats, recentItems } = useUserStats();
  const [showLogout, setShowLogout] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = getDisplayName(user);
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;
  const email = user?.email ?? "";
  const joinDate = formatJoin(user?.created_at);

  const STAT_CARDS = [
    { id: "ppts",        label: "PPTs Created",    value: stats?.ppt_count           ?? 0, icon: Presentation, bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.25)",  gc: "hsl(262,80%,60%), hsl(220,85%,60%)" },
    { id: "assignments", label: "Assignments",      value: stats?.assignment_count    ?? 0, icon: FileText,     bg: "rgba(59,130,246,0.12)",   border: "rgba(59,130,246,0.25)",   gc: "hsl(217,91%,60%), hsl(189,94%,53%)" },
    { id: "notes",       label: "Notes Created",    value: stats?.note_count          ?? 0, icon: BookOpen,     bg: "rgba(16,185,129,0.12)",   border: "rgba(16,185,129,0.25)",   gc: "hsl(160,84%,39%), hsl(174,62%,47%)" },
    { id: "tasks",       label: "Tasks Completed",  value: stats?.checklist_completed ?? 0, icon: CheckSquare,  bg: "rgba(249,115,22,0.12)",   border: "rgba(249,115,22,0.25)",   gc: "hsl(25,95%,53%), hsl(330,85%,60%)" },
  ];

  const totalActions = STAT_CARDS.reduce((s, x) => s + x.value, 0);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("[Profile] signOut error:", err);
    } finally {
      setIsSigningOut(false);
      setShowLogout(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .prof-fade { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {showLogout && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => !isSigningOut && setShowLogout(false)}
          isLoading={isSigningOut}
        />
      )}

      {/*
        Outer wrapper:
        - px: 16px on mobile, 24px on sm, 32px on md+
        - pb: 96px on mobile to clear the bottom nav bar
        - max-w-2xl keeps it readable on wide screens (profile is not a dashboard)
      */}
      <div
        className="prof-fade w-full mx-auto"
        style={{
          maxWidth: 672,
          padding: "clamp(16px, 4vw, 32px)",
          paddingBottom: "clamp(96px, 12vw, 48px)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >

        {/* ── Hero card ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden w-full"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Banner — taller on mobile so avatar sits in the right proportion */}
          <div
            className="w-full relative"
            style={{
              height: "clamp(80px, 22vw, 112px)",
              background: "linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(59,130,246,0.25) 50%, rgba(16,185,129,0.15) 100%)",
            }}
          >
            {/* Dot grid overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Premium badge */}
            <div
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(139,92,246,0.25)",
                border: "1px solid rgba(139,92,246,0.4)",
                color: "hsl(262,80%,75%)",
                backdropFilter: "blur(8px)",
                fontSize: 11,
              }}
            >
              <Sparkles size={10} />
              Premium
            </div>
          </div>

          {/* Profile content */}
          <div className="px-4 sm:px-6 pb-5">
            {/* Avatar overlapping banner — pull up by half the avatar size */}
            <div
              style={{
                marginTop: -40,
                marginBottom: 12,
                display: "inline-block",
              }}
            >
              <Avatar name={displayName || email} avatarUrl={avatarUrl} size={80} />
            </div>

            {/*
              Name + meta + signout button.
              On mobile: stacked (column). On sm+: side by side.
            */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Name + meta */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <h2
                  className="font-display font-bold text-white"
                  style={{ fontSize: "clamp(18px, 5vw, 24px)", margin: 0, lineHeight: 1.2, wordBreak: "break-word" }}
                >
                  {displayName}
                </h2>

                {/* Meta row — wraps naturally */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                  <span
                    className="flex items-center gap-1.5 text-muted-foreground"
                    style={{ fontSize: 12, minWidth: 0 }}
                  >
                    <Mail size={11} className="text-purple-400 flex-shrink-0" />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "clamp(160px, 50vw, 280px)",
                        display: "block",
                      }}
                    >
                      {email}
                    </span>
                  </span>
                  {joinDate && (
                    <span className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: 12 }}>
                      <Calendar size={11} className="text-blue-400 flex-shrink-0" />
                      Joined {joinDate}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: 12 }}>
                    <Shield size={11} className="text-emerald-400 flex-shrink-0" />
                    {totalActions} total actions
                  </span>
                </div>
              </div>

              {/* Sign out button — full-width on mobile, auto on sm+ */}
              <div>
                <button
                  onClick={() => setShowLogout(true)}
                  className="flex items-center justify-center gap-2 rounded-xl text-sm font-medium
                             transition-all duration-200 active:scale-[0.97]"
                  style={{
                    width: "100%",
                    maxWidth: 200,
                    padding: "9px 16px",
                    background: "rgba(239,68,68,0.10)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#f87171",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "rgba(239,68,68,0.18)";
                    el.style.borderColor = "rgba(239,68,68,0.45)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "rgba(239,68,68,0.10)";
                    el.style.borderColor = "rgba(239,68,68,0.25)";
                  }}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Activity Stats ─────────────────────────────────────── */}
        <section className="prof-fade" style={{ animationDelay: "80ms" }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "hsl(var(--muted-foreground))",
              marginBottom: 10,
            }}
          >
            Activity Stats
          </p>
          {/*
            2 cols on mobile (cards are compact enough),
            4 cols on md+
          */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {STAT_CARDS.map(stat => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.id}
                  className="rounded-2xl flex flex-col transition-all duration-300 cursor-default hover:-translate-y-0.5"
                  style={{
                    background: stat.bg,
                    border: `1px solid ${stat.border}`,
                    padding: "clamp(14px, 3vw, 20px)",
                    gap: 10,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: `1px solid ${stat.border}`,
                    }}
                  >
                    <Icon size={16} className="text-white opacity-80" />
                  </div>
                  <div>
                    <p
                      className="font-display font-bold"
                      style={{
                        fontSize: "clamp(22px, 6vw, 30px)",
                        background: `linear-gradient(135deg, ${stat.gc})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        lineHeight: 1,
                      }}
                    >
                      {stat.value}
                    </p>
                    <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 3 }}>
                      {stat.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Account Details + Recent Activity ─────────────────── */}
        <div
          className="prof-fade"
          style={{
            animationDelay: "160ms",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 14,
          }}
        >
          {/* Account details */}
          <div
            className="rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "clamp(14px, 3vw, 20px)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "hsl(var(--muted-foreground))",
                marginBottom: 12,
              }}
            >
              Account Details
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { icon: User,     label: "Display Name", value: displayName, color: "text-purple-400"  },
                { icon: Mail,     label: "Email",        value: email,       color: "text-blue-400"    },
                { icon: Calendar, label: "Member Since", value: joinDate,    color: "text-orange-400"  },
                { icon: Shield,   label: "Plan",         value: "Premium",   color: "text-emerald-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="flex items-center justify-between"
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    gap: 12,
                  }}
                >
                  <div className="flex items-center flex-shrink-0" style={{ gap: 10 }}>
                    <div
                      className="rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ width: 32, height: 32, background: "rgba(255,255,255,0.05)" }}
                    >
                      <Icon size={13} className={color} />
                    </div>
                    <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                  </div>
                  {/*
                    Value: truncate long emails on mobile.
                    text-right so it sits flush with the card edge.
                  */}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "hsl(var(--foreground))",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      textAlign: "right",
                      maxWidth: "clamp(120px, 40vw, 220px)",
                    }}
                    title={value}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "clamp(14px, 3vw, 20px)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "hsl(var(--muted-foreground))",
                marginBottom: 12,
              }}
            >
              Recent Activity
            </p>
            {recentItems.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{ padding: "clamp(24px, 8vw, 40px) 0", gap: 8 }}
              >
                <Clock size={26} className="text-muted-foreground opacity-40" />
                <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>No recent activity</p>
                <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>
                  Create your first PPT, assignment, or notes to see them here
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentItems.map((item) => {
                  const typeConfig = {
                    ppt: {
                      icon: Presentation,
                      color: "hsl(262,80%,65%)",
                      bg: "rgba(139,92,246,0.12)",
                      border: "rgba(139,92,246,0.25)",
                      route: "/dashboard/ppt",
                    },
                    assignment: {
                      icon: FileText,
                      color: "hsl(217,91%,60%)",
                      bg: "rgba(59,130,246,0.12)",
                      border: "rgba(59,130,246,0.25)",
                      route: "/dashboard/assignments",
                    },
                    note: {
                      icon: BookOpen,
                      color: "hsl(160,84%,39%)",
                      bg: "rgba(16,185,129,0.12)",
                      border: "rgba(16,185,129,0.25)",
                      route: "/dashboard/notes",
                    },
                  };
                  const config = typeConfig[item.type];
                  const Icon = config.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(config.route)}
                      className="w-full rounded-xl p-3 flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: config.bg,
                        border: `1px solid ${config.border}`,
                        textAlign: "left",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: `1px solid ${config.border}`,
                        }}
                      >
                        <Icon size={16} style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-bold uppercase tracking-wider mb-0.5"
                          style={{ color: config.color, fontSize: 9 }}
                        >
                          {item.type}
                        </p>
                        <p
                          className="text-sm font-medium text-foreground truncate"
                          style={{ lineHeight: 1.2 }}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
