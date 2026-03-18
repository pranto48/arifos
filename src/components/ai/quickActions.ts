import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, ClipboardList, LayoutDashboard, NotebookPen, PlusCircle, Settings, Sparkles, Wand2, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { logAiUsage } from '@/lib/aiUsageLogger';

export type QuickActionGroup = 'navigation' | 'create-actions' | 'ai-actions' | 'admin-system';

export interface QuickAction {
  id: string;
  label: string;
  hint: string;
  shortcut: string;
  aliases: string[];
  group: QuickActionGroup;
  icon: LucideIcon;
  run: () => void | Promise<void>;
}

export interface QuickActionHistoryEntry {
  id: string;
  executedAt: string;
}

const QUICK_ACTION_HISTORY_KEY = 'lifeos.ai.quickActionHistory.v1';
const QUICK_ACTION_HISTORY_LIMIT = 10;

const QUICK_ACTION_CONFIG: Omit<QuickAction, 'run'>[] = [
  {
    id: 'goto-dashboard',
    label: 'Go to Dashboard',
    hint: 'Open home workspace',
    shortcut: 'G D',
    aliases: ['dashboard', 'home', 'overview', 'workspace'],
    group: 'navigation',
    icon: LayoutDashboard,
  },
  {
    id: 'goto-tasks',
    label: 'Go to Tasks',
    hint: 'Open task workspace',
    shortcut: 'G T',
    aliases: ['tasks', 'todo', 'task list', 'my tasks'],
    group: 'navigation',
    icon: ClipboardList,
  },
  {
    id: 'goto-notes',
    label: 'Go to Notes',
    hint: 'Open notes workspace',
    shortcut: 'G N',
    aliases: ['notes', 'docs', 'journal', 'documents'],
    group: 'navigation',
    icon: NotebookPen,
  },
  {
    id: 'create-task',
    label: 'Create Task',
    hint: 'Open quick add for a new task',
    shortcut: 'N T',
    aliases: ['new task', 'add task', 'capture todo', 'create todo'],
    group: 'create-actions',
    icon: PlusCircle,
  },
  {
    id: 'create-note',
    label: 'Create Note',
    hint: 'Jump to notes and start drafting',
    shortcut: 'N N',
    aliases: ['new note', 'write note', 'capture note', 'draft note'],
    group: 'create-actions',
    icon: NotebookPen,
  },
  {
    id: 'plan-day',
    label: 'Plan my day',
    hint: 'Prioritize tasks and focus list',
    shortcut: 'A P',
    aliases: ['plan day', 'daily plan', 'focus plan', 'today plan'],
    group: 'ai-actions',
    icon: Wand2,
  },
  {
    id: 'overdue',
    label: 'Summarize overdue tasks',
    hint: 'Quick overdue digest',
    shortcut: 'A O',
    aliases: ['overdue', 'late tasks', 'task debt', 'behind schedule'],
    group: 'ai-actions',
    icon: ClipboardList,
  },
  {
    id: 'weekly-review',
    label: 'Prepare weekly review',
    hint: 'Open analytics workflow',
    shortcut: 'A W',
    aliases: ['weekly report', 'weekly review', 'review', 'status report'],
    group: 'ai-actions',
    icon: CalendarRange,
  },
  {
    id: 'open-settings',
    label: 'Open Settings',
    hint: 'Manage account and preferences',
    shortcut: 'S S',
    aliases: ['settings', 'preferences', 'profile', 'account'],
    group: 'admin-system',
    icon: Settings,
  },
  {
    id: 'sign-out',
    label: 'Sign out',
    hint: 'Securely end your current session',
    shortcut: 'S O',
    aliases: ['logout', 'log out', 'exit session', 'sign off'],
    group: 'admin-system',
    icon: LogOut,
  },
];

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function getQuickActionHistory(): QuickActionHistoryEntry[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(QUICK_ACTION_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as QuickActionHistoryEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item?.id === 'string' && typeof item?.executedAt === 'string')
      .slice(0, QUICK_ACTION_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function recordQuickActionUsage(id: string) {
  if (!canUseStorage()) return;

  const nextEntry: QuickActionHistoryEntry = {
    id,
    executedAt: new Date().toISOString(),
  };

  const nextHistory = [nextEntry, ...getQuickActionHistory()].slice(0, QUICK_ACTION_HISTORY_LIMIT);
  window.localStorage.setItem(QUICK_ACTION_HISTORY_KEY, JSON.stringify(nextHistory));
}

export function getFrequentQuickActionIds(limit = 3): string[] {
  const counts = getQuickActionHistory().reduce<Record<string, number>>((acc, entry) => {
    acc[entry.id] = (acc[entry.id] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

export function useQuickActions() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode } = useDashboardMode();

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
      await logAiUsage({
        userId: user.id,
        actionType: 'quick_action_overdue_summary',
        inputSummary: `mode:${mode}`,
        resultSummary: 'failed_to_fetch_overdue_tasks',
      });
      return;
    }

    const count = data?.length || 0;
    if (count === 0) {
      toast.success('Great! You have no overdue tasks.');
      await logAiUsage({
        userId: user.id,
        actionType: 'quick_action_overdue_summary',
        inputSummary: `mode:${mode}`,
        resultSummary: 'no_overdue_tasks',
      });
      return;
    }

    const top = data?.map((t) => t.title).slice(0, 3).join(' · ');
    toast.warning(`${count} overdue task(s). Top: ${top}`);
    await logAiUsage({
      userId: user.id,
      actionType: 'quick_action_overdue_summary',
      inputSummary: `mode:${mode}`,
      resultSummary: `overdue_count:${count}`,
    });
  };

  const runPlanMyDay = async () => {
    if (!user) return;

    navigate('/');
    window.dispatchEvent(new Event('ai-plan-my-day'));
    toast.success('AI planner ready: check Daily Planner on Dashboard');
    await logAiUsage({
      userId: user.id,
      actionType: 'quick_action_plan_day',
      inputSummary: `mode:${mode}`,
      resultSummary: 'planner_opened',
    });
  };

  const runWeeklyReview = async () => {
    if (!user) return;

    navigate('/analytics');
    toast.info('Weekly review prep: open Analytics + Reports for summary export');
    await logAiUsage({
      userId: user.id,
      actionType: 'quick_action_weekly_review',
      inputSummary: `mode:${mode}`,
      resultSummary: 'analytics_opened',
    });
  };

  const actions = useMemo<QuickAction[]>(() => {
    const runMap: Record<string, () => void | Promise<void>> = {
      'goto-dashboard': () => navigate('/'),
      'goto-tasks': () => navigate('/tasks'),
      'goto-notes': () => navigate('/notes'),
      'create-task': () => navigate('/tasks'),
      'create-note': () => navigate('/notes?new=1'),
      'plan-day': runPlanMyDay,
      overdue: runSummarizeOverdue,
      'weekly-review': runWeeklyReview,
      'open-settings': () => navigate('/settings'),
      'sign-out': () => signOut(),
    };

    return QUICK_ACTION_CONFIG.map((action) => ({
      ...action,
      run: runMap[action.id],
    }));
  }, [mode, navigate, signOut, user]);

  const actionById = useMemo(
    () =>
      actions.reduce<Record<string, QuickAction>>((acc, action) => {
        acc[action.id] = action;
        return acc;
      }, {}),
    [actions],
  );

  return {
    actions,
    actionById,
  };
}

export const QUICK_ACTION_GROUP_LABELS: Record<QuickActionGroup, string> = {
  navigation: 'Navigation',
  'create-actions': 'Create Actions',
  'ai-actions': 'AI Actions',
  'admin-system': 'Admin & System',
};

export const QUICK_ACTION_ICON = Sparkles;
