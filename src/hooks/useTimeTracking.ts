import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TimeEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  entry_type: string;
  notes: string | null;
  is_running: boolean;
  created_at: string;
  updated_at: string;
}

export interface PomodoroSettings {
  id: string;
  user_id: string;
  work_duration: number;
  short_break: number;
  long_break: number;
  sessions_before_long_break: number;
  auto_start_breaks: boolean;
  auto_start_work: boolean;
}

const DEFAULT_POMODORO: Omit<PomodoroSettings, 'id' | 'user_id'> = {
  work_duration: 25,
  short_break: 5,
  long_break: 15,
  sessions_before_long_break: 4,
  auto_start_breaks: false,
  auto_start_work: false,
};

export function useTimeTracking() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Load entries and active timer
  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [entriesRes, activeRes, pomRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_running', false)
        .order('start_time', { ascending: false })
        .limit(100),
      supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_running', true)
        .limit(1)
        .single(),
      supabase
        .from('pomodoro_settings')
        .select('*')
        .eq('user_id', user.id)
        .single(),
    ]);

    setEntries((entriesRes.data || []) as unknown as TimeEntry[]);

    if (activeRes.data && !activeRes.error) {
      const entry = activeRes.data as unknown as TimeEntry;
      setActiveEntry(entry);
      const elapsedSec = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000);
      setElapsed(elapsedSec);
    } else {
      setActiveEntry(null);
      setElapsed(0);
    }

    if (pomRes.data && !pomRes.error) {
      setPomodoroSettings(pomRes.data as unknown as PomodoroSettings);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Tick interval for active timer
  useEffect(() => {
    if (activeEntry) {
      intervalRef.current = window.setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - new Date(activeEntry.start_time).getTime()) / 1000);
        setElapsed(elapsedSec);
      }, 1000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeEntry]);

  const startTimer = useCallback(async (opts?: { taskId?: string; projectId?: string; entryType?: string }) => {
    if (!user) return;

    // Stop any running timer first
    if (activeEntry) {
      await stopTimer();
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        task_id: opts?.taskId || null,
        project_id: opts?.projectId || null,
        entry_type: opts?.entryType || 'timer',
        is_running: true,
        start_time: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      toast.error('Failed to start timer');
      return;
    }

    setActiveEntry(data as unknown as TimeEntry);
    setElapsed(0);
    toast.success('Timer started');
  }, [user, activeEntry]);

  const stopTimer = useCallback(async () => {
    if (!activeEntry || !user) return null;

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - new Date(activeEntry.start_time).getTime()) / 1000);

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        is_running: false,
      } as any)
      .eq('id', activeEntry.id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to stop timer');
      return null;
    }

    const stoppedEntry = data as unknown as TimeEntry;
    setActiveEntry(null);
    setElapsed(0);
    setEntries(prev => [stoppedEntry, ...prev]);
    toast.success(`Timer stopped: ${formatDuration(durationSeconds)}`);
    return stoppedEntry;
  }, [activeEntry, user]);

  const addManualEntry = useCallback(async (entry: {
    taskId?: string;
    projectId?: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }) => {
    if (!user) return;

    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (durationSeconds <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        task_id: entry.taskId || null,
        project_id: entry.projectId || null,
        start_time: entry.startTime,
        end_time: entry.endTime,
        duration_seconds: durationSeconds,
        entry_type: 'manual',
        notes: entry.notes || null,
        is_running: false,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error('Failed to add time entry');
      return;
    }

    setEntries(prev => [data as unknown as TimeEntry, ...prev]);
    toast.success('Time entry added');
  }, [user]);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete entry');
      return;
    }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entry deleted');
  }, []);

  const savePomodoroSettings = useCallback(async (settings: Partial<Omit<PomodoroSettings, 'id' | 'user_id'>>) => {
    if (!user) return;

    const { error } = await supabase
      .from('pomodoro_settings')
      .upsert({
        user_id: user.id,
        ...DEFAULT_POMODORO,
        ...pomodoroSettings,
        ...settings,
      } as any, { onConflict: 'user_id' });

    if (error) {
      toast.error('Failed to save settings');
      return;
    }

    setPomodoroSettings(prev => prev ? { ...prev, ...settings } : null);
    toast.success('Pomodoro settings saved');
  }, [user, pomodoroSettings]);

  // Get entries for today
  const todayEntries = entries.filter(e => {
    const entryDate = new Date(e.start_time).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return entryDate === today;
  });

  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
    + (activeEntry ? elapsed : 0);

  // Get entries for this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEntries = entries.filter(e => new Date(e.start_time) >= weekStart);
  const weekTotal = weekEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
    + (activeEntry ? elapsed : 0);

  return {
    entries,
    activeEntry,
    elapsed,
    loading,
    pomodoroSettings: pomodoroSettings || DEFAULT_POMODORO as PomodoroSettings,
    todayEntries,
    todayTotal,
    weekEntries,
    weekTotal,
    startTimer,
    stopTimer,
    addManualEntry,
    deleteEntry,
    savePomodoroSettings,
    reload: loadEntries,
  };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
