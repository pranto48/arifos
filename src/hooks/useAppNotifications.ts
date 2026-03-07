import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isSelfHosted } from '@/lib/selfHostedConfig';
import { toast } from 'sonner';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  entity_id: string | null;
  entity_type: string | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  new_device: '💻',
  new_user: '👤',
  ip_change: '🌐',
  new_ticket: '🎫',
  follow_up_due: '📋',
  task_assigned: '📌',
};

export function useAppNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const typed = (data || []) as unknown as AppNotification[];
      setNotifications(typed);
      setUnreadCount(typed.filter(n => !n.is_read).length);

      // Show toast for new notifications since last fetch
      if (lastFetchRef.current) {
        const newOnes = typed.filter(n => n.created_at > lastFetchRef.current! && !n.is_read);
        newOnes.forEach(n => {
          const icon = NOTIFICATION_ICONS[n.type] || '🔔';
          toast(`${icon} ${n.title}`, {
            description: n.message || undefined,
            duration: 5000,
          });
        });
      }

      if (typed.length > 0) {
        lastFetchRef.current = typed[0].created_at;
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('app_notifications')
      .update({ is_read: true } as any)
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase
      .from('app_notifications')
      .update({ is_read: true } as any)
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase
      .from('app_notifications')
      .delete()
      .eq('user_id', user.id);
    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    if (isSelfHosted()) {
      // Polling for Docker mode
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      // Realtime for cloud mode
      const channel = supabase
        .channel('app_notifications_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'app_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as unknown as AppNotification;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            const icon = NOTIFICATION_ICONS[newNotif.type] || '🔔';
            toast(`${icon} ${newNotif.title}`, {
              description: newNotif.message || undefined,
              duration: 5000,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
    refetch: fetchNotifications,
  };
}
