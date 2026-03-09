import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, FileText, Wallet, Clock, Heart, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'task' | 'note' | 'transaction' | 'time_entry' | 'habit' | 'goal';
  title: string;
  action: string;
  timestamp: string;
}

export function ActivityFeed() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (user) loadActivities();
  }, [user]);

  const loadActivities = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [tasksRes, notesRes, txRes, timeRes, habitsRes] = await Promise.all([
      supabase.from('tasks').select('id, title, status, updated_at').eq('user_id', user!.id).gte('updated_at', todayISO).order('updated_at', { ascending: false }).limit(5),
      supabase.from('notes').select('id, title, created_at').eq('user_id', user!.id).gte('created_at', todayISO).order('created_at', { ascending: false }).limit(5),
      supabase.from('transactions').select('id, merchant, type, amount, created_at').eq('user_id', user!.id).gte('created_at', todayISO).order('created_at', { ascending: false }).limit(5),
      supabase.from('time_entries').select('id, notes, start_time, is_running').eq('user_id', user!.id).gte('start_time', todayISO).order('start_time', { ascending: false }).limit(5),
      supabase.from('habit_completions').select('id, habit_id, completed_at').eq('user_id', user!.id).gte('completed_at', todayISO).order('completed_at', { ascending: false }).limit(5),
    ]);

    const items: ActivityItem[] = [];

    (tasksRes.data || []).forEach(t => {
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title,
        action: t.status === 'completed' ? 'Completed' : 'Updated',
        timestamp: t.updated_at,
      });
    });

    (notesRes.data || []).forEach(n => {
      items.push({
        id: `note-${n.id}`,
        type: 'note',
        title: n.title,
        action: 'Created',
        timestamp: n.created_at,
      });
    });

    (txRes.data || []).forEach(tx => {
      items.push({
        id: `tx-${tx.id}`,
        type: 'transaction',
        title: tx.merchant || tx.type,
        action: tx.type === 'income' ? `+৳${tx.amount}` : `-৳${tx.amount}`,
        timestamp: tx.created_at,
      });
    });

    (timeRes.data || []).forEach(te => {
      items.push({
        id: `time-${te.id}`,
        type: 'time_entry',
        title: te.notes || 'Time entry',
        action: te.is_running ? 'Running' : 'Tracked',
        timestamp: te.start_time,
      });
    });

    (habitsRes.data || []).forEach(h => {
      items.push({
        id: `habit-${h.id}`,
        type: 'habit',
        title: 'Habit completed',
        action: 'Done',
        timestamp: h.completed_at,
      });
    });

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(items.slice(0, 10));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare className="h-3.5 w-3.5 text-blue-400" />;
      case 'note': return <FileText className="h-3.5 w-3.5 text-purple-400" />;
      case 'transaction': return <Wallet className="h-3.5 w-3.5 text-green-400" />;
      case 'time_entry': return <Clock className="h-3.5 w-3.5 text-orange-400" />;
      case 'habit': return <Heart className="h-3.5 w-3.5 text-pink-400" />;
      case 'goal': return <Target className="h-3.5 w-3.5 text-yellow-400" />;
      default: return null;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> Today's Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No activity today yet</p>
        ) : (
          <div className="space-y-1.5">
            {activities.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                {getIcon(item.type)}
                <span className="text-sm text-foreground truncate flex-1">{item.title}</span>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">{item.action}</Badge>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityFeed;
