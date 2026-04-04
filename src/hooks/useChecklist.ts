// ============================================================
// useChecklist — Full Supabase CRUD + optimistic UI
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { DbChecklist } from '@/types/database';

export function useChecklist() {
  const { user } = useAuth();
  const [items, setItems] = useState<DbChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load from Supabase ───────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error: err } = await supabase
      .from('checklists')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });
    if (err) { setError(err.message); }
    else { setItems(data ?? []); }
    setIsLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Add ─────────────────────────────────────────────────
  const addItem = useCallback(async (title: string) => {
    if (!user || !title.trim()) return;
    const maxPos = items.length > 0 ? Math.max(...items.map(i => i.position)) : -1;
    const optimistic: DbChecklist = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      title: title.trim(),
      completed: false,
      position: maxPos + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setItems(prev => [...prev, optimistic]);

    const { data, error: err } = await supabase
      .from('checklists')
      .insert({ user_id: user.id, title: title.trim(), completed: false, position: maxPos + 1 })
      .select().single();

    if (err) {
      setError(err.message);
      setItems(prev => prev.filter(i => i.id !== optimistic.id));
    } else {
      setItems(prev => prev.map(i => i.id === optimistic.id ? data : i));
    }
  }, [user, items]);

  // ── Toggle ──────────────────────────────────────────────
  const toggleItem = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newCompleted = !item.completed;
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed: newCompleted } : i));
    const { error: err } = await supabase
      .from('checklists').update({ completed: newCompleted }).eq('id', id);
    if (err) {
      setError(err.message);
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: item.completed } : i));
    }
  }, [items]);

  // ── Delete ──────────────────────────────────────────────
  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    const { error: err } = await supabase.from('checklists').delete().eq('id', id);
    if (err) { setError(err.message); load(); }
  }, [load]);

  // ── Edit title ──────────────────────────────────────────
  const editItem = useCallback(async (id: string, title: string) => {
    if (!title.trim()) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, title } : i));
    await supabase.from('checklists').update({ title }).eq('id', id);
  }, []);

  // ── Reorder ─────────────────────────────────────────────
  const reorderItems = useCallback(async (newOrder: DbChecklist[]) => {
    const reindexed = newOrder.map((item, idx) => ({ ...item, position: idx }));
    setItems(reindexed);
    const updates = reindexed.map(({ id, position }) =>
      supabase.from('checklists').update({ position }).eq('id', id)
    );
    await Promise.all(updates);
  }, []);

  const pending = items.filter(i => !i.completed);
  const completed = items.filter(i => i.completed);

  return {
    items, pending, completed,
    isLoading, error,
    addItem, toggleItem, deleteItem, editItem, reorderItems,
    refresh: load,
  };
}
