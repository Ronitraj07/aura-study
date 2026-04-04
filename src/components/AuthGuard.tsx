import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login", { replace: true, state: { from: location } });
    }
    if (status === "restricted") {
      navigate("/login?restricted=true", { replace: true });
    }
  }, [status, navigate, location]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}>
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading your workspace…</p>
        </motion.div>
      </div>
    );
  }

  if (status !== "allowed") return null;

  return <>{children}</>;
}
