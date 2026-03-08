import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  task_reminders: boolean;
  habit_reminders: boolean;
  family_event_reminders: boolean;
  loan_reminders: boolean;
  task_assignment_alerts: boolean;
  follow_up_reminders: boolean;
}

const DEFAULTS: NotificationPreferences = {
  task_reminders: true,
  habit_reminders: true,
  family_event_reminders: true,
  loan_reminders: true,
  task_assignment_alerts: true,
  follow_up_reminders: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const typed = data as any;
        setPrefs({
          task_reminders: typed.task_reminders,
          habit_reminders: typed.habit_reminders,
          family_event_reminders: typed.family_event_reminders,
          loan_reminders: typed.loan_reminders,
          task_assignment_alerts: typed.task_assignment_alerts,
          follow_up_reminders: typed.follow_up_reminders,
        });
      }
    } catch (err) {
      console.error('Failed to fetch notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const updatePref = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;
    setSaving(true);
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);

    try {
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({ [key]: value, updated_at: new Date().toISOString() } as any)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id, ...newPrefs } as any);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Failed to update notification preference:', err);
      setPrefs(prefs); // rollback
      toast({ title: 'Error', description: 'Failed to save preference', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, prefs]);

  return { prefs, loading, saving, updatePref };
}
