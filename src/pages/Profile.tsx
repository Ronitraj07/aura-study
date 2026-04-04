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
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.includes("@")
    ? [nameOrEmail.split("@")[0]]
    : nameOrEmail.trim().split(/\s+/);
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("");
}

function getDisplayName(user: ReturnType<typeof useAuth>["user"]): string {
  if (!user) return "";
  return user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "";
}

function formatJoinDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({
  name,
  avatarUrl,
  size = 80,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
}) {
  const initials = getInitials(name);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover flex-shrink-0"
        style={{
          width: size,
          height: size,
          boxShadow: "0 0 0 3px rgba(139,92,246,0.35), 0 0 32px rgba(139,92,246,0.3)",
        }}
      />
    );
  }

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
      <span
        className="absolute bottom-1 right-1 rounded-full bg-emerald-400"
        style={{ width: size * 0.16, height: size * 0.16, border: "2px solid hsl(220,17%,10%)" }}
      />
    </div>
  );
}

// ─── Logout Confirm Modal ─────────────────────────────────────────────────────
function LogoutModal({
  onConfirm,
  onCancel,
  isLoading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
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
            disabled={isLoading}
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
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "white",
              boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : (
              "Sign out"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { stats } = useUserStats();
  const [showLogout, setShowLogout] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = getDisplayName(user);
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;
  const email = user?.email ?? "";
  const joinDate = formatJoinDate(user?.created_at);

  const STAT_CARDS = [
    {
      id: "ppts",
      label: "PPTs Created",
      value: stats?.ppt_count ?? 0,
      icon: Presentation,
      gradient: "from-purple-500 to-blue-500",
      bg: "rgba(139,92,246,0.12)",
      border: "rgba(139,92,246,0.25)",
      gradientCSS: "hsl(262,80%,60%), hsl(220,85%,60%)",
    },
    {
      id: "assignments",
      label: "Assignments",
      value: stats?.assignment_count ?? 0,
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      bg: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.25)",
      gradientCSS: "hsl(217,91%,60%), hsl(189,94%,53%)",
    },
    {
      id: "notes",
      label: "Notes Created",
      value: stats?.note_count ?? 0,
      icon: BookOpen,
      gradient: "from-emerald-500 to-teal-500",
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.25)",
      gradientCSS: "hsl(160,84%,39%), hsl(174,62%,47%)",
    },
    {
      id: "tasks",
      label: "Tasks Completed",
      value: stats?.checklist_completed ?? 0,
      icon: CheckSquare,
      gradient: "from-orange-500 to-pink-500",
      bg: "rgba(249,115,22,0.12)",
      border: "rgba(249,115,22,0.25)",
      gradientCSS: "hsl(25,95%,53%), hsl(330,85%,60%)",
    },
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
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => !isSigningOut && setShowLogout(false)}
          isLoading={isSigningOut}
        />
      )}

      <div className="min-h-full p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Hero card */}
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
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
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
              Premium
            </div>
          </div>

          {/* Profile row */}
          <div className="px-6 pb-6">
            <div className="-mt-12 mb-4">
              <Avatar name={displayName || email} avatarUrl={avatarUrl} size={80} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="font-display font-bold text-2xl text-white">{displayName}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail size={13} className="text-purple-400" />
                    {email}
                  </span>
                  {joinDate && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar size={13} className="text-blue-400" />
                      Joined {joinDate}
                    </span>
                  )}
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

        {/* Stats grid */}
        <div className="fade-up" style={{ animationDelay: "80ms" }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Activity Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STAT_CARDS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.id}
                  className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 cursor-default hover:-translate-y-0.5"
                  style={{
                    background: stat.bg,
                    border: `1px solid ${stat.border}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${stat.border}` }}
                  >
                    <Icon size={18} className="text-white opacity-80" />
                  </div>
                  <div>
                    <p
                      className="font-display font-bold text-3xl"
                      style={{
                        background: `linear-gradient(135deg, ${stat.gradientCSS})`,
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
            })}
          </div>
        </div>

        {/* Account info + Recent activity */}
        <div className="grid md:grid-cols-2 gap-5 fade-up" style={{ animationDelay: "160ms" }}>
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
              { icon: User,     label: "Display Name",  value: displayName,  color: "text-purple-400" },
              { icon: Mail,     label: "Email",          value: email,        color: "text-blue-400" },
              { icon: Calendar, label: "Member Since",   value: joinDate,     color: "text-orange-400" },
              { icon: Shield,   label: "Plan",           value: "Premium",    color: "text-emerald-400" },
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

          {/* Recent activity — placeholder until activity feed is built */}
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
            </div>
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Clock size={28} className="text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Activity feed coming soon</p>
              <p className="text-xs text-muted-foreground opacity-60">Your recent actions will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
