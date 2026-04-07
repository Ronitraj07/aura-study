import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldX, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
    <path d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3c-7.7 0-14.4 4.4-17.7 11.7z" fill="#FF3D00"/>
    <path d="M24 45c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.6 36 26.9 37 24 37c-5.7 0-10.6-3.1-11.7-7.5l-7 5.4C8 41.1 15.4 45 24 45z" fill="#4CAF50"/>
    <path d="M44.5 20H24v8.5h11.8c-.8 2.3-2.3 4.3-4.2 5.8l6.6 5.6C41.8 36.5 45 30.7 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { status, signInWithGoogle, signOut } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRestricted = params.get("restricted") === "true" || status === "restricted";

  useEffect(() => {
    if (status === "allowed") navigate("/dashboard", { replace: true });
  }, [status, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const glowBorder = (color: string) => ({
    background: color,
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    maskComposite: "exclude" as const,
    WebkitMaskComposite: "xor" as const,
    padding: "1px",
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden"
      style={{ padding: "clamp(16px, 4vw, 32px)" }}
    >
      {/* Ambient glows — clamped to viewport */}
      <div
        className="hero-glow animate-pulse-glow"
        style={{
          width: "min(480px, 80vw)",
          height: "min(480px, 80vw)",
          background: "hsl(var(--primary))",
          opacity: 0.18,
          top: "15%",
          left: "10%",
        }}
      />
      <div
        className="hero-glow animate-pulse-glow"
        style={{
          width: "min(400px, 70vw)",
          height: "min(400px, 70vw)",
          background: "hsl(var(--accent))",
          opacity: 0.13,
          bottom: "15%",
          right: "8%",
          animationDelay: "2s",
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div aria-live="polite" aria-atomic="true" className="relative z-10 w-full flex justify-center">
        <AnimatePresence mode="wait">
          {isRestricted ? (
            <motion.div
              key="restricted"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl w-full max-w-md text-center"
              style={{ padding: "clamp(20px,5vw,32px)" }}
            >
              <div
                className="absolute -inset-[1px] rounded-2xl opacity-40 pointer-events-none"
                style={glowBorder("linear-gradient(135deg, hsl(0,70%,55%), hsl(30,80%,55%))")}
              />

              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-destructive/10 border border-destructive/20">
                <ShieldX className="w-8 h-8 text-destructive" />
              </div>

              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Access Restricted
              </h1>
              <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                This platform is invite-only. Your Google account is not on the
                authorised list.
              </p>
              <p className="text-xs text-muted-foreground/60 mb-8">
                Contact the admin if you believe this is a mistake.
              </p>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full px-6 py-3 rounded-xl font-display font-medium text-sm bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all duration-300"
                style={{ minHeight: 44 }}
              >
                Sign out &amp; try another account
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-2xl w-full max-w-md"
              style={{ padding: "clamp(20px,5vw,32px)" }}
            >
              <div
                className="absolute -inset-[1px] rounded-2xl opacity-50 pointer-events-none"
                style={glowBorder("var(--gradient-primary)")}
              />

              {/* Logo mark */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold gradient-text mb-2">Welcome Back</h1>
                <p className="text-sm text-muted-foreground">Sign in with your Google account to continue</p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
                    role="alert"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || status === "loading"}
                className="w-full flex items-center justify-center gap-3 px-4 rounded-xl bg-secondary border border-border text-foreground text-sm font-medium hover:bg-secondary/80 hover:border-primary/30 transition-all duration-300 group disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ minHeight: 52, fontSize: "var(--text-sm)" }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <GoogleIcon />
                )}
                {loading ? "Redirecting to Google…" : "Continue with Google"}
                {!loading && (
                  <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                )}
              </button>

              <p className="text-xs text-muted-foreground/60 text-center mt-6 leading-relaxed">
                Access is restricted to authorised accounts only.
                <br />
                Email/password login is not available.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
