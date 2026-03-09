import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RecentTimeEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);

  useEffect(() => {
    if (user) loadEntries();
  }, [user]);

  const loadEntries = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('time_entries')
      .select('id, notes, start_time, end_time, duration_seconds, is_running, entry_type')
      .eq('user_id', user!.id)
      .gte('start_time', today.toISOString())
      .order('start_time', { ascending: false })
      .limit(5);

    const items = data || [];
    setEntries(items);
    setTodayTotal(items.reduce((sum, e) => sum + (e.duration_seconds || 0), 0));
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Time Tracked Today
          </span>
          <span className="font-mono text-foreground text-base">{formatDuration(todayTotal)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No time tracked today</p>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  {entry.is_running ? (
                    <Play className="h-3 w-3 text-green-500 animate-pulse flex-shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-sm text-foreground truncate">
                    {entry.notes || 'Untitled'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.is_running && <Badge className="bg-green-500/20 text-green-400 text-[10px]">Live</Badge>}
                  <span className="font-mono text-xs text-muted-foreground">
                    {entry.duration_seconds ? formatDuration(entry.duration_seconds) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentTimeEntries;
