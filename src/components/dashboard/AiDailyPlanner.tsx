import { useEffect, useMemo, useState } from 'react';
import { Brain, Sparkles, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';

interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
}

interface PlannedTask extends TaskRow {
  score: number;
  reason: string;
}

function scoreTask(task: TaskRow): PlannedTask {
  let score = 0;
  const reasons: string[] = [];

  const now = new Date();
  if (task.due_date) {
    const due = new Date(task.due_date);
    const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      score += 50;
      reasons.push('overdue');
    } else if (diffDays === 0) {
      score += 40;
      reasons.push('due today');
    } else if (diffDays <= 2) {
      score += 25;
      reasons.push('due soon');
    }
  } else {
    score -= 5;
  }

  switch (task.priority) {
    case 'urgent':
      score += 30;
      reasons.push('urgent');
      break;
    case 'high':
      score += 20;
      reasons.push('high priority');
      break;
    case 'medium':
      score += 10;
      break;
    case 'low':
      score += 5;
      break;
  }

  return {
    ...task,
    score,
    reason: reasons.length ? reasons.join(' · ') : 'balanced priority',
  };
}

export function AiDailyPlanner() {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('id,title,due_date,priority,status')
      .eq('user_id', user.id)
      .eq('task_type', mode)
      .neq('status', 'completed')
      .limit(40);

    setTasks((data as TaskRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, [user?.id, mode]);

  const planned = useMemo(() => {
    return tasks
      .map(scoreTask)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [tasks]);

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          AI Daily Planner
          <Badge variant="secondary" className="text-[10px]">Smart Suggestion</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Analyzing your workload...</p>
        ) : planned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active tasks to plan right now.</p>
        ) : (
          <div className="space-y-2">
            {planned.map((task, idx) => (
              <div key={task.id} className="rounded-md border border-border/50 p-2.5 bg-background/60">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{idx + 1}. {task.title}</p>
                  <Badge variant="outline" className="text-[10px]">{task.score}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {task.reason}
                </p>
              </div>
            ))}
          </div>
        )}

        <Button size="sm" variant="outline" onClick={loadTasks} className="w-full">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> AI Assist: Refresh Plan
        </Button>
      </CardContent>
    </Card>
  );
}
