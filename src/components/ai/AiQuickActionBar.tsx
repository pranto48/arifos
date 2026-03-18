import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wand2, CalendarRange, ClipboardList, NotebookPen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { toast } from 'sonner';

interface AiQuickActionBarProps {
  compact?: boolean;
}

export function AiQuickActionBar({ compact = false }: AiQuickActionBarProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useDashboardMode();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const runSummarizeOverdue = async () => {
    if (!user) return;

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('tasks')
      .select('title,due_date')
      .eq('user_id', user.id)
      .eq('task_type', mode)
      .neq('status', 'completed')
      .lt('due_date', nowIso)
      .order('due_date', { ascending: true })
      .limit(5);

    if (error) {
      toast.error('Could not summarize overdue tasks');
      return;
    }

    const count = data?.length || 0;
    if (count === 0) {
      toast.success('Great! You have no overdue tasks.');
      return;
    }

    const top = data?.map((t) => t.title).slice(0, 3).join(' · ');
    toast.warning(`${count} overdue task(s). Top: ${top}`);
  };

  const runPlanMyDay = async () => {
    navigate('/');
    window.dispatchEvent(new Event('ai-plan-my-day'));
    toast.success('AI planner ready: check Daily Planner on Dashboard');
  };

  const runWeeklyReview = async () => {
    navigate('/analytics');
    toast.info('Weekly review prep: open Analytics + Reports for summary export');
  };

  const actions = useMemo(
    () => [
      {
        id: 'plan-day',
        label: 'Plan my day',
        hint: 'Prioritize tasks and focus list',
        icon: Wand2,
        run: runPlanMyDay,
      },
      {
        id: 'overdue',
        label: 'Summarize overdue tasks',
        hint: 'Quick overdue digest',
        icon: ClipboardList,
        run: runSummarizeOverdue,
      },
      {
        id: 'weekly-review',
        label: 'Prepare weekly review',
        hint: 'Open analytics workflow',
        icon: CalendarRange,
        run: runWeeklyReview,
      },
      {
        id: 'goto-tasks',
        label: 'Go to Tasks',
        hint: 'Open task workspace',
        icon: ClipboardList,
        run: () => navigate('/tasks'),
      },
      {
        id: 'goto-notes',
        label: 'Go to Notes',
        hint: 'Open notes workspace',
        icon: NotebookPen,
        run: () => navigate('/notes'),
      },
    ],
    [mode, user?.id],
  );

  return (
    <>
      <Button
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'icon' : 'sm'}
        onClick={() => setOpen(true)}
        className={compact ? 'h-9 w-9' : ''}
      >
        <Sparkles className="h-4 w-4" />
        {!compact && <span className="ml-2">AI Quick Action</span>}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Try: plan my day, summarize overdue tasks, prepare weekly review" />
        <CommandList>
          <CommandEmpty>No action found.</CommandEmpty>
          <CommandGroup heading="AI Actions">
            {actions.map((action) => (
              <CommandItem
                key={action.id}
                onSelect={() => {
                  setOpen(false);
                  action.run();
                }}
              >
                <action.icon className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span>{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.hint}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
      </CommandDialog>
    </>
  );
}
