import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subDays } from 'date-fns';

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  totalGoals: number;
  activeGoals: number;
  totalBudgetSpent: number;
  totalBudgetIncome: number;
  totalTimeTracked: number;
  activeProjects: number;
}

export interface MonthlyTrend {
  month: string;
  tasks: number;
  completed: number;
  expenses: number;
  income: number;
  goals: number;
  timeHours: number;
}

export interface CrossModuleInsight {
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  module: string;
}

export function useAnalytics(monthsBack = 6) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const startDate = format(subMonths(new Date(), monthsBack), 'yyyy-MM-dd');
    
    const load = async () => {
      setLoading(true);
      const [tasksRes, goalsRes, txRes, timeRes, projRes] = await Promise.all([
        supabase.from('tasks').select('id, title, status, priority, created_at, completed_at, due_date, category_id').eq('user_id', user.id),
        supabase.from('goals').select('id, title, status, target_amount, current_amount, target_date, category, created_at').eq('user_id', user.id),
        supabase.from('transactions').select('id, amount, type, date, category_id, merchant, notes').eq('user_id', user.id).gte('date', startDate),
        supabase.from('time_entries').select('id, duration_seconds, start_time, task_id, project_id, entry_type').eq('user_id', user.id).gte('start_time', startDate),
        supabase.from('projects').select('id, title, status, priority, created_at').eq('user_id', user.id),
      ]);
      setTasks(tasksRes.data || []);
      setGoals(goalsRes.data || []);
      setTransactions(txRes.data || []);
      setTimeEntries(timeRes.data || []);
      setProjects(projRes.data || []);
      setLoading(false);
    };
    load();
  }, [user, monthsBack]);

  const summary: AnalyticsSummary = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalSeconds = timeEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
    return {
      totalTasks: tasks.length,
      completedTasks,
      taskCompletionRate: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
      totalGoals: goals.length,
      activeGoals: goals.filter(g => g.status === 'active').length,
      totalBudgetSpent: totalExpenses,
      totalBudgetIncome: totalIncome,
      totalTimeTracked: Math.round(totalSeconds / 3600),
      activeProjects: projects.filter(p => p.status === 'active' || p.status === 'in_progress').length,
    };
  }, [tasks, goals, transactions, timeEntries, projects]);

  const monthlyTrends: MonthlyTrend[] = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), monthsBack - 1),
      end: new Date(),
    });
    return months.map(m => {
      const key = format(m, 'yyyy-MM');
      const label = format(m, 'MMM yy');
      const mTasks = tasks.filter(t => t.created_at?.startsWith(key));
      const mCompleted = tasks.filter(t => t.completed_at?.startsWith(key));
      const mExpenses = transactions.filter(t => t.type === 'expense' && t.date?.startsWith(key)).reduce((s, t) => s + Number(t.amount), 0);
      const mIncome = transactions.filter(t => t.type === 'income' && t.date?.startsWith(key)).reduce((s, t) => s + Number(t.amount), 0);
      const mGoals = goals.filter(g => g.created_at?.startsWith(key)).length;
      const mTime = timeEntries.filter(e => e.start_time?.startsWith(key)).reduce((s, e) => s + (e.duration_seconds || 0), 0);
      return { month: label, tasks: mTasks.length, completed: mCompleted.length, expenses: mExpenses, income: mIncome, goals: mGoals, timeHours: Math.round(mTime / 3600) };
    });
  }, [tasks, goals, transactions, timeEntries, monthsBack]);

  const insights: CrossModuleInsight[] = useMemo(() => {
    const result: CrossModuleInsight[] = [];
    // Overdue tasks
    const overdue = tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;
    if (overdue > 0) result.push({ type: 'warning', title: `${overdue} Overdue Tasks`, description: 'You have tasks past their due date that need attention.', module: 'Tasks' });
    // Budget health
    if (summary.totalBudgetSpent > summary.totalBudgetIncome && summary.totalBudgetIncome > 0) {
      result.push({ type: 'warning', title: 'Spending Exceeds Income', description: `You've spent ৳${summary.totalBudgetSpent.toLocaleString()} vs ৳${summary.totalBudgetIncome.toLocaleString()} income.`, module: 'Budget' });
    }
    // Goal progress
    const staleGoals = goals.filter(g => g.status === 'active' && g.target_amount && (g.current_amount || 0) / g.target_amount < 0.25 && g.target_date && new Date(g.target_date) < subDays(new Date(), -30));
    if (staleGoals.length) result.push({ type: 'info', title: `${staleGoals.length} Goals Need Attention`, description: 'Some goals are below 25% progress.', module: 'Goals' });
    // Productivity
    if (summary.taskCompletionRate >= 80) result.push({ type: 'success', title: 'High Task Completion', description: `${summary.taskCompletionRate}% completion rate — excellent productivity!`, module: 'Tasks' });
    // Time vs tasks
    if (summary.totalTimeTracked > 0 && summary.completedTasks > 0) {
      const avgHoursPerTask = Math.round(summary.totalTimeTracked / summary.completedTasks * 10) / 10;
      result.push({ type: 'info', title: `${avgHoursPerTask}h avg per task`, description: `Based on ${summary.totalTimeTracked}h tracked across ${summary.completedTasks} completed tasks.`, module: 'Time + Tasks' });
    }
    // Projects with no recent activity
    const staleProjects = projects.filter(p => (p.status === 'active' || p.status === 'in_progress'));
    if (staleProjects.length > 3) result.push({ type: 'info', title: `${staleProjects.length} Active Projects`, description: 'Consider focusing on fewer projects for better throughput.', module: 'Projects' });
    return result;
  }, [tasks, goals, summary, projects]);

  // Report builder: generate exportable rows from selected modules
  const buildReport = (modules: string[]) => {
    const headers: string[] = [];
    const rows: string[][] = [];
    
    if (modules.includes('tasks')) {
      if (!headers.length) headers.push('Module', 'Item', 'Status', 'Priority', 'Date', 'Details');
      tasks.forEach(t => rows.push(['Task', t.title, t.status || '', t.priority || '', t.created_at ? format(new Date(t.created_at), 'dd MMM yyyy') : '', t.completed_at ? `Completed: ${format(new Date(t.completed_at), 'dd MMM yyyy')}` : '']));
    }
    if (modules.includes('goals')) {
      if (!headers.length) headers.push('Module', 'Item', 'Status', 'Priority', 'Date', 'Details');
      goals.forEach(g => rows.push(['Goal', g.title, g.status || '', g.category || '', g.target_date ? format(new Date(g.target_date), 'dd MMM yyyy') : '', g.target_amount ? `${g.current_amount || 0}/${g.target_amount}` : '']));
    }
    if (modules.includes('budget')) {
      if (!headers.length) headers.push('Module', 'Item', 'Status', 'Priority', 'Date', 'Details');
      transactions.forEach(t => rows.push(['Budget', t.merchant || t.notes || 'Transaction', t.type, '', t.date || '', `৳${Number(t.amount).toLocaleString()}`]));
    }
    if (modules.includes('projects')) {
      if (!headers.length) headers.push('Module', 'Item', 'Status', 'Priority', 'Date', 'Details');
      projects.forEach(p => rows.push(['Project', p.title, p.status || '', p.priority || '', p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy') : '', '']));
    }
    if (modules.includes('time')) {
      if (!headers.length) headers.push('Module', 'Item', 'Status', 'Priority', 'Date', 'Details');
      timeEntries.forEach(e => rows.push(['Time Entry', e.entry_type, '', '', e.start_time ? format(new Date(e.start_time), 'dd MMM yyyy HH:mm') : '', `${Math.round((e.duration_seconds || 0) / 60)} min`]));
    }
    if (!headers.length) headers.push('Module', 'Item', 'Status', 'Priority', 'Date', 'Details');
    return { headers, rows };
  };

  return { loading, summary, monthlyTrends, insights, buildReport, tasks, goals, transactions, timeEntries, projects };
}
