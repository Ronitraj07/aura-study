import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

async function checkAllowed(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  try {
    const { data, error } = await supabase.rpc("is_allowed_user", {
      lookup_email: email,
    });
    if (error) {
      console.error("[auth-callback] allowlist RPC error:", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error("[auth-callback] allowlist check threw:", err);
    return false;
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session) {
        const allowed = await checkAllowed(session.user.email);
        if (cancelled) return;
        if (allowed) {
          navigate("/dashboard", { replace: true });
        } else {
          await supabase.auth.signOut();
          navigate("/login?restricted=true", { replace: true });
        }
        return;
      }

      // No session yet — wait for hash token exchange via onAuthStateChange
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          subscription.unsubscribe();
          if (cancelled) return;
          if (newSession) {
            const allowed = await checkAllowed(newSession.user.email);
            if (cancelled) return;
            if (allowed) {
              navigate("/dashboard", { replace: true });
            } else {
              await supabase.auth.signOut();
              navigate("/login?restricted=true", { replace: true });
            }
          } else {
            navigate("/login", { replace: true });
          }
        });
      } else {
        navigate("/login", { replace: true });
      }
    };

    run();

    // Cleanup: prevent any setState/navigate after unmount
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Loader2 className="w-7 h-7 text-white animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
      </motion.div>
    </div>
  );
}
