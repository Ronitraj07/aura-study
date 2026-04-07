// ============================================================
// useUserStats — Fetch live stats + recent activity from DB
// Fix: removed broken .from('users').single() call that returned
// 406 when the public.users row didn't exist yet.
// Now always reads counts directly from each table (fast, reliable)
// and reads profile info from the auth session user_metadata.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface RecentItem {
  id: string;
  type: 'ppt' | 'assignment' | 'note';
  title: string;
  createdAt: string;
}

export interface UserStats {
  ppts_count: number;
  assignments_count: number;
  notes_count: number;
  timetable_count: number;
  checklist_count: number;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  created_at: string;
}

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      // Count directly from each table — no dependency on public.users row
      const [pptsRes, assignRes, notesRes, timetableRes, checklistRes] = await Promise.all([
        supabase.from('ppts').select('id',        { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notes').select('id',       { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('timetables').select('id',  { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('checklists').select('id',  { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setStats({
        ppts_count:         pptsRes.count        ?? 0,
        assignments_count:  assignRes.count      ?? 0,
        notes_count:        notesRes.count       ?? 0,
        timetable_count:    timetableRes.count   ?? 0,
        checklist_count:    checklistRes.count   ?? 0,
        // Profile info comes from the auth session — always available
        full_name:  user.user_metadata?.full_name  ?? user.user_metadata?.name  ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
        email:      user.email ?? '',
        created_at: user.created_at,
      });

      // Fetch recent items: last 3 of each type, merge and sort
      const [pptsList, assignList, notesList] = await Promise.all([
        supabase.from('ppts').select('id, title, created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('assignments').select('id, topic, created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('notes').select('id, topic, created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(3),
      ]);

      const recent: RecentItem[] = [
        ...(pptsList.data   ?? []).map(p => ({ id: p.id, type: 'ppt'        as const, title: p.title, createdAt: p.created_at })),
        ...(assignList.data ?? []).map(a => ({ id: a.id, type: 'assignment' as const, title: a.topic, createdAt: a.created_at })),
        ...(notesList.data  ?? []).map(n => ({ id: n.id, type: 'note'       as const, title: n.topic, createdAt: n.created_at })),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);

      setRecentItems(recent);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { stats, recentItems, isLoading, error, refresh: load };
}
