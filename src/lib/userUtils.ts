/**
 * userUtils.ts
 * ────────────
 * Shared helpers for deriving display values from a Supabase User object.
 * Previously duplicated identically in TopBar.tsx and AppSidebar.tsx.
 *
 * FIX 3.4: Single source of truth. Import from here everywhere.
 */

export interface UserLike {
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    /** Supabase Google OAuth stores the avatar URL here */
    avatar_url?: string;
    /** Some OAuth providers use 'picture' instead of 'avatar_url' */
    picture?: string;
  };
}

/**
 * Returns up to 2 uppercase initials from a full name or email.
 * Examples:
 *   "Ronit Sinha"   → "RS"
 *   "foo@bar.com"   → "F"
 *   null/undefined  → "?"
 */
export function getInitials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.includes("@")
    ? [nameOrEmail.split("@")[0]]
    : nameOrEmail.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Returns the user's first name for display.
 * Priority: full_name > name > email prefix > "".
 */
export function getDisplayName(user: UserLike | null | undefined): string {
  if (!user) return "";
  const full = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (full) return full.trim().split(/\s+/)[0];
  return user.email?.split("@")[0] ?? "";
}

/**
 * FIX 3.3: Resolves the user's role label for display in the TopBar.
 * Currently Supabase Google OAuth doesn’t carry a role field, so this
 * returns "Student" as the default. When a profiles table with a role
 * column exists (Phase 5), pass the value from there instead.
 *
 * Accepted values: "Student" | "Teacher" | "Admin" | string
 * Falls back to "Student" if no role is provided.
 */
export function getRoleLabel(role?: string | null): string {
  if (!role) return "Student";
  // Capitalise first letter, lowercase rest for display consistency
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

/**
 * Returns the avatar URL from user metadata.
 * Checks avatar_url first (Supabase/Google), then picture (some OAuth providers).
 */
export function getAvatarUrl(user: UserLike | null | undefined): string | undefined {
  return user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
}
