// ============================================================
// useUserStats — Fetch live stats + recent activity from DB
// ✔ Synced with migration 008 (timetable_count, checklist_count)
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
  timetable_count: number;   // migration 008
  checklist_count: number;   // migration 008
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

    try {
      // Fetch user row (stats)
      const { data: userData, error: userErr } = await supabase
        .from('users').select('*').eq('id', user.id).single();

      if (userErr && userErr.code !== 'PGRST116') throw userErr;

      if (userData) {
        setStats({
          ppts_count:         userData.ppts_count         ?? 0,
          assignments_count:  userData.assignments_count  ?? 0,
          notes_count:        userData.notes_count        ?? 0,
          timetable_count:    userData.timetable_count    ?? 0,
          checklist_count:    userData.checklist_count    ?? 0,
          full_name:          userData.full_name,
          avatar_url:         userData.avatar_url,
          email:              userData.email,
          created_at:         userData.created_at,
        });
      } else {
        // Fallback: count directly from each table
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
          full_name:          user.user_metadata?.full_name  ?? null,
          avatar_url:         user.user_metadata?.avatar_url ?? null,
          email:              user.email            ?? '',
          created_at:         user.created_at,
        });
      }

      // Fetch recent items: 3 PPTs + 3 assignments + 3 notes, merge + sort
      const [pptsRes, assignRes, notesRes] = await Promise.all([
        supabase.from('ppts').select('id, title, created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('assignments').select('id, topic, created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('notes').select('id, topic, created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(3),
      ]);

      const recent: RecentItem[] = [
        ...(pptsRes.data  ?? []).map(p => ({ id: p.id, type: 'ppt'        as const, title: p.title, createdAt: p.created_at })),
        ...(assignRes.data ?? []).map(a => ({ id: a.id, type: 'assignment' as const, title: a.topic, createdAt: a.created_at })),
        ...(notesRes.data  ?? []).map(n => ({ id: n.id, type: 'note'       as const, title: n.topic, createdAt: n.created_at })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
