import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ── Allowlist ──────────────────────────────────────────────────────────────
const ALLOWED_EMAILS = new Set([
  "sinharonitraj@gmail.com",
  "sinharomitraj@gmail.com",
  "radhikadidwania567@gmail.com",
]);

export function isAllowedEmail(email: string | undefined | null): boolean {
  return !!email && ALLOWED_EMAILS.has(email.toLowerCase().trim());
}

// ── Types ──────────────────────────────────────────────────────────────────
type AuthStatus = "loading" | "unauthenticated" | "allowed" | "restricted";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const resolveStatus = useCallback((u: User | null) => {
    if (!u) return setStatus("unauthenticated");
    setStatus(isAllowedEmail(u.email) ? "allowed" : "restricted");
  }, []);

  useEffect(() => {
    // Hydrate from persisted session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      resolveStatus(data.session?.user ?? null);
    });

    // Live session listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        resolveStatus(newSession?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [resolveStatus]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, status, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
