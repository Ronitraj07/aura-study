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

/**
 * Calls the Supabase RPC `is_allowed_user` which checks the
 * `allowed_users` table server-side. The email list never ships
 * in the client bundle.
 *
 * SQL to create in Supabase Dashboard → SQL Editor:
 *
 *   create table if not exists public.allowed_users (
 *     email text primary key
 *   );
 *
 *   -- Seed your allowlist:
 *   insert into public.allowed_users (email) values
 *     ('sinharonitraj@gmail.com'),
 *     ('sinharomitraj@gmail.com'),
 *     ('radhikadidwania567@gmail.com');
 *
 *   -- RPC (runs as SECURITY DEFINER so anon role can call it
 *   --  but cannot SELECT the table directly):
 *   create or replace function public.is_allowed_user(lookup_email text)
 *   returns boolean
 *   language sql
 *   security definer
 *   set search_path = public
 *   as $$
 *     select exists (
 *       select 1 from allowed_users
 *       where lower(trim(email)) = lower(trim(lookup_email))
 *     );
 *   $$;
 *
 *   -- Revoke direct table access from anon & authenticated:
 *   revoke all on public.allowed_users from anon, authenticated;
 *   -- Grant execute on the function only:
 *   grant execute on function public.is_allowed_user(text) to anon, authenticated;
 */
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

  /**
   * Track the last user ID we ran resolveStatus for.
   * Prevents duplicate RPC calls when both getSession() and
   * onAuthStateChange (INITIAL_SESSION) fire for the same user.
   */
  const resolvedForRef = useRef<string | null | undefined>(undefined);

  const resolveStatus = useCallback(async (u: User | null) => {
    // Skip if we already resolved for this exact user ID (or null)
    const key = u?.id ?? null;
    if (resolvedForRef.current === key) return;
    resolvedForRef.current = key;

    if (!u) {
      setStatus("unauthenticated");
      return;
    }
    const allowed = await checkAllowedServer(u.email);
    setStatus(allowed ? "allowed" : "restricted");
  }, []);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately with the
    // persisted session — that alone is enough. getSession() is
    // kept as a belt-and-suspenders fallback but the resolvedForRef
    // guard above ensures the RPC is only called once per user change.
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
    resolvedForRef.current = undefined; // reset so next sign-in resolves fresh
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
