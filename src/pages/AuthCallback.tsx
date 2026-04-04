/**
 * /auth/callback  — Supabase redirects here after Google OAuth.
 * The Supabase client auto-handles the session from the URL hash/code.
 * We just wait for status to resolve then navigate accordingly.
 */
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "allowed") {
      navigate("/dashboard", { replace: true });
    } else if (status === "restricted") {
      navigate("/login?restricted=true", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [status, navigate, params]);

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
