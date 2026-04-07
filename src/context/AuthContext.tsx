import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { upsertUser } from "@/lib/db";

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

async function checkAllowedServer(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  try {
    const { data, error } = await supabase.rpc("is_allowed_user", {
      lookup_email: email,
    });
    if (error) {
      console.error("[auth] allowlist RPC error:", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error("[auth] allowlist check threw:", err);
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const resolvedForRef = useRef<string | null | undefined>(undefined);

  const resolveStatus = useCallback(async (u: User | null) => {
    const key = u?.id ?? null;
    if (resolvedForRef.current === key) return;
    resolvedForRef.current = key;

    if (!u) {
      setStatus("unauthenticated");
      return;
    }

    const allowed = await checkAllowedServer(u.email);
    setStatus(allowed ? "allowed" : "restricted");

    // ── Ensure public.users row exists ──────────────────────────────────────
    // This MUST happen after the allowlist check so only approved users get
    // a row. Without this upsert every other table (checklists, ppts, etc.)
    // will throw a FK violation because their user_id FK points here.
    if (allowed) {
      upsertUser({
        id: u.id,
        email: u.email ?? "",
        full_name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? null,
        avatar_url: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null,
      }).catch((err) =>
        console.error("[auth] upsertUser failed:", err)
      );
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      resolveStatus(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      resolveStatus(newSession?.user ?? null);
    });

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
    resolvedForRef.current = undefined;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, status, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
