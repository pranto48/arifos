import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckSquare, FileText, Wallet, Target, 
  Calendar, Clock, ArrowUpRight, ArrowDownRight, Lightbulb, Settings2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { DashboardCustomizer } from '@/components/dashboard/DashboardCustomizer';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy chart components
const UpcomingFamilyEvents = lazy(() => import('@/components/dashboard/UpcomingFamilyEvents').then(m => ({ default: m.UpcomingFamilyEvents })));
const TaskCompletionChart = lazy(() => import('@/components/dashboard/TaskCompletionChart').then(m => ({ default: m.TaskCompletionChart })));
const ExpenseBreakdownChart = lazy(() => import('@/components/dashboard/ExpenseBreakdownChart').then(m => ({ default: m.ExpenseBreakdownChart })));
const GoalProgressCards = lazy(() => import('@/components/dashboard/GoalProgressCards').then(m => ({ default: m.GoalProgressCards })));
const TasksBreakdownChart = lazy(() => import('@/components/dashboard/TasksBreakdownChart').then(m => ({ default: m.TasksBreakdownChart })));
const TaskCategoriesChart = lazy(() => import('@/components/dashboard/TaskCategoriesChart').then(m => ({ default: m.TaskCategoriesChart })));
const DeviceCategoryChart = lazy(() => import('@/components/dashboard/DeviceCategoryChart').then(m => ({ default: m.DeviceCategoryChart })));
const DeviceInventoryReport = lazy(() => import('@/components/dashboard/DeviceInventoryReport').then(m => ({ default: m.DeviceInventoryReport })));
const GoalProgressChart = lazy(() => import('@/components/goals/GoalProgressChart'));
const AiSmartSuggestions = lazy(() => import('@/components/dashboard/AiSmartSuggestions').then(m => ({ default: m.AiSmartSuggestions })));
const AiAnomalyAlerts = lazy(() => import('@/components/dashboard/AiAnomalyAlerts').then(m => ({ default: m.AiAnomalyAlerts })));
const ActivityFeed = lazy(() => import('@/components/dashboard/ActivityFeed').then(m => ({ default: m.ActivityFeed })));
const RecentTimeEntries = lazy(() => import('@/components/dashboard/RecentTimeEntries').then(m => ({ default: m.RecentTimeEntries })));

const ChartLoader = () => <Skeleton className="h-64 w-full rounded-lg" />;

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mode } = useDashboardMode();
  const { 
    widgets, 
    enabledWidgets, 
    isCustomizing, 
    setIsCustomizing, 
    toggleWidget, 
    reorderWidgets, 
    resetLayout 
  } = useDashboardLayout();
  
  const [stats, setStats] = useState({
    todayTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    activeGoals: 0,
    recentNotes: [] as any[],
    upcomingTasks: [] as any[],
    officeTasks: 0,
    personalTasks: 0,
    officeNotes: 0,
    personalNotes: 0,
    officeProjects: 0,
    personalProjects: 0,
    goals: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user, mode]);

  const loadDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    const [tasksRes, notesRes, transactionsRes, goalsRes, projectsRes] = await Promise.all([
      supabase.from('tasks').select('id,title,status,due_date,task_type,sort_order,category_id').eq('user_id', user?.id),
      supabase.from('notes').select('id,title,note_type,created_at').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('transactions').select('id,amount,type').eq('user_id', user?.id).gte('date', startOfMonth.split('T')[0]),
      supabase.from('goals').select('id,title,category,target_amount,current_amount,target_date,status').eq('user_id', user?.id).in('status', ['active', 'in_progress']).eq('goal_type', mode),
      supabase.from('projects').select('id,project_type').eq('user_id', user?.id),
    ]);

    const tasks = tasksRes.data || [];
    const notes = notesRes.data || [];
    const todayTasks = tasks.filter(t => t.due_date?.split('T')[0] === today && t.status !== 'completed').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date < new Date().toISOString() && t.status !== 'completed').length;
    const upcomingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5);

    // Count by type
    const officeTasks = tasks.filter(t => t.task_type === 'office' && t.status !== 'completed').length;
    const personalTasks = tasks.filter(t => t.task_type === 'personal' && t.status !== 'completed').length;
    const officeNotes = notes.filter(n => n.note_type === 'office').length;
    const personalNotes = notes.filter(n => n.note_type === 'personal').length;
    
    const projects = projectsRes.data || [];
    const officeProjects = projects.filter(p => p.project_type === 'office').length;
    const personalProjects = projects.filter(p => p.project_type === 'personal').length;

    const transactions = transactionsRes.data || [];
    const monthlyIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const monthlyExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      todayTasks,
      completedTasks,
      overdueTasks,
      monthlyIncome,
      monthlyExpense,
      activeGoals: goalsRes.data?.length || 0,
      recentNotes: notes.slice(0, 3),
      upcomingTasks,
      officeTasks,
      personalTasks,
      officeNotes,
      personalNotes,
      officeProjects,
      personalProjects,
      goals: goalsRes.data || [],
    });
    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning');
    if (hour < 18) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  };

  // Office mode stats don't show financial goals
  const officeStatCards = [
    { title: t('dashboard.todayTasks'), value: stats.todayTasks, icon: CheckSquare, color: 'text-blue-400' },
    { title: t('dashboard.overdue'), value: stats.overdueTasks, icon: Clock, color: 'text-red-400' },
    { title: t('dashboard.completed'), value: stats.completedTasks, icon: CheckSquare, color: 'text-green-400' },
  ];

  // Personal mode stats include goals
  const personalStatCards = [
    { title: t('dashboard.todayTasks'), value: stats.todayTasks, icon: CheckSquare, color: 'text-blue-400' },
    { title: t('dashboard.overdue'), value: stats.overdueTasks, icon: Clock, color: 'text-red-400' },
    { title: t('dashboard.activeGoals'), value: stats.activeGoals, icon: Target, color: 'text-yellow-400' },
    { title: t('dashboard.completed'), value: stats.completedTasks, icon: CheckSquare, color: 'text-green-400' },
  ];

  const statCards = mode === 'office' ? officeStatCards : personalStatCards;

  const modeCountCards = mode === 'office' 
    ? [
        { title: 'Office Tasks', value: stats.officeTasks, icon: CheckSquare, color: 'text-primary' },
        { title: 'Office Notes', value: stats.officeNotes, icon: FileText, color: 'text-primary' },
        { title: 'Office Projects', value: stats.officeProjects, icon: Lightbulb, color: 'text-primary' },
      ]
    : [
        { title: 'Personal Tasks', value: stats.personalTasks, icon: CheckSquare, color: 'text-primary' },
        { title: 'Personal Notes', value: stats.personalNotes, icon: FileText, color: 'text-primary' },
        { title: 'Personal Projects', value: stats.personalProjects, icon: Lightbulb, color: 'text-primary' },
      ];

  // Render widget by ID
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'task-completion':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><TaskCompletionChart /></Suspense>;
      case 'tasks-breakdown':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><TasksBreakdownChart /></Suspense>;
      case 'task-categories':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><TaskCategoriesChart /></Suspense>;
      case 'device-categories':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><DeviceCategoryChart /></Suspense>;
      case 'device-report':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><DeviceInventoryReport /></Suspense>;
      case 'expense-breakdown':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><ExpenseBreakdownChart /></Suspense>;
      case 'goal-cards':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><GoalProgressCards /></Suspense>;
      case 'goal-chart':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><GoalProgressChart goals={stats.goals} /></Suspense>;
      case 'goal-progress':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><GoalProgressChart goals={stats.goals} /></Suspense>;
      case 'budget-summary':
        return (
          <Card key={widgetId} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> {t('dashboard.thisMonthBudget')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-muted-foreground">{t('budget.income')}</span>
                </div>
                <span className="font-mono font-semibold text-green-400">৳{stats.monthlyIncome.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-muted-foreground">{t('budget.expenses')}</span>
                </div>
                <span className="font-mono font-semibold text-red-400">৳{stats.monthlyExpense.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('budget.balance')}</span>
                  <span className={`font-mono font-bold ${stats.monthlyIncome - stats.monthlyExpense >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ৳{(stats.monthlyIncome - stats.monthlyExpense).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'recent-notes':
        return (
          <Card key={widgetId} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t('dashboard.recentNotes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noNotesYet')}</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentNotes.map(note => (
                    <div key={note.id} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium text-foreground truncate">{note.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'MMM d')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 'upcoming-tasks':
        return (
          <Card key={widgetId} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {t('dashboard.upcomingTasks')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noTasksYet')}</p>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <span className="text-sm text-foreground">{task.title}</span>
                      </div>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">{format(new Date(task.due_date), 'MMM d')}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 'family-events':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><UpcomingFamilyEvents /></Suspense>;
      case 'ai-suggestions':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><AiSmartSuggestions /></Suspense>;
      case 'ai-anomalies':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><AiAnomalyAlerts /></Suspense>;
      case 'activity-feed':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><ActivityFeed /></Suspense>;
      case 'recent-time':
        return <Suspense key={widgetId} fallback={<ChartLoader />}><RecentTimeEntries /></Suspense>;
      default:
        return null;
    }
  };

  // Get widgets for grid layout
  const chartWidgets = enabledWidgets.filter(w => 
    ['task-completion', 'tasks-breakdown', 'task-categories', 'device-categories', 'expense-breakdown', 'goal-cards'].includes(w.id)
  );
  
  const listWidgets = enabledWidgets.filter(w => 
    ['recent-notes', 'upcoming-tasks', 'budget-summary', 'family-events', 'ai-suggestions', 'ai-anomalies', 'activity-feed', 'recent-time'].includes(w.id)
  );

  const fullWidthWidgets = enabledWidgets.filter(w => 
    ['goal-chart', 'goal-progress', 'device-report'].includes(w.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
            {getGreeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || t('dashboard.there')}
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            {format(new Date(), 'EEE, MMM d, yyyy')}
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
              {mode === 'office' ? 'Office' : 'Personal'}
            </span>
          </p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsCustomizing(true)}
          className="flex-shrink-0 h-9 w-9"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className={`grid ${mode === 'office' ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'} gap-4`}>
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="font-mono text-2xl font-bold text-foreground">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Mode-specific counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {modeCountCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <span className="text-sm font-medium text-foreground">{stat.title}</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-primary">{stat.value}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Customizable Widgets */}
      <div className="space-y-6">
        {/* Charts Row */}
        {chartWidgets.length > 0 && (
          <div className={`grid gap-6 ${
            chartWidgets.length === 1 ? 'grid-cols-1' :
            chartWidgets.length === 2 ? 'md:grid-cols-2' :
            chartWidgets.length === 3 ? 'md:grid-cols-3' :
            'md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {chartWidgets.map(widget => renderWidget(widget.id))}
          </div>
        )}

        {/* Full Width Widgets */}
        {fullWidthWidgets.map(widget => renderWidget(widget.id))}

        {/* List Widgets Row */}
        {listWidgets.length > 0 && (
          <div className={`grid gap-6 ${
            listWidgets.length === 1 ? 'grid-cols-1' :
            'md:grid-cols-2'
          }`}>
            {listWidgets.map(widget => renderWidget(widget.id))}
          </div>
        )}
      </div>

      {/* Dashboard Customizer Dialog */}
      <DashboardCustomizer
        open={isCustomizing}
        onOpenChange={setIsCustomizing}
        widgets={widgets}
        onToggle={toggleWidget}
        onReorder={reorderWidgets}
        onReset={resetLayout}
      />
    </div>
  );
}
