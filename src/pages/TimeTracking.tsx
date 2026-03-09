import { useState, useEffect } from 'react';
import { Clock, Timer, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTracking, formatDuration } from '@/hooks/useTimeTracking';
import { TimeTracker } from '@/components/time-tracking/TimeTracker';
import { PomodoroTimer } from '@/components/time-tracking/PomodoroTimer';
import { TimeEntryList } from '@/components/time-tracking/TimeEntryList';
import { TimeAnalytics } from '@/components/time-tracking/TimeAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function TimeTracking() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const {
    entries, activeEntry, elapsed, loading,
    pomodoroSettings, todayTotal, weekTotal,
    startTimer, stopTimer, addManualEntry, deleteEntry, savePomodoroSettings,
  } = useTimeTracking();

  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('tasks').select('id, title').eq('user_id', user.id).neq('status', 'completed').limit(50),
      supabase.from('projects').select('id, title').eq('user_id', user.id).limit(50),
    ]).then(([tasksRes, projectsRes]) => {
      setTasks(tasksRes.data || []);
      setProjects(projectsRes.data || []);
    });
  }, [user]);

  const handlePomodoroComplete = (type: 'work' | 'break', durationSeconds: number) => {
    if (type === 'work') {
      // Log pomodoro work session as time entry
      addManualEntry({
        startTime: new Date(Date.now() - durationSeconds * 1000).toISOString(),
        endTime: new Date().toISOString(),
        notes: 'Pomodoro work session',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          {language === 'bn' ? 'টাইম ট্র্যাকিং' : 'Time Tracking'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {language === 'bn'
            ? `আজ: ${formatDuration(todayTotal)} • এই সপ্তাহ: ${formatDuration(weekTotal)}`
            : `Today: ${formatDuration(todayTotal)} • This week: ${formatDuration(weekTotal)}`}
        </p>
      </div>

      <Tabs defaultValue="tracker" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracker" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="h-3.5 w-3.5" />
            {language === 'bn' ? 'ট্র্যাকার' : 'Tracker'}
          </TabsTrigger>
          <TabsTrigger value="pomodoro" className="gap-1.5 text-xs sm:text-sm">
            <Timer className="h-3.5 w-3.5" />
            {language === 'bn' ? 'পমোডোরো' : 'Pomodoro'}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            {language === 'bn' ? 'বিশ্লেষণ' : 'Analytics'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TimeTracker
              activeEntry={activeEntry}
              elapsed={elapsed}
              tasks={tasks}
              projects={projects}
              onStart={startTimer}
              onStop={stopTimer}
              onAddManual={addManualEntry}
            />
            <div className="md:col-span-1">
              <TimeEntryList
                entries={entries.slice(0, 20)}
                tasks={tasks}
                projects={projects}
                onDelete={deleteEntry}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pomodoro" className="mt-4">
          <div className="max-w-md mx-auto">
            <PomodoroTimer
              settings={pomodoroSettings}
              onSaveSettings={savePomodoroSettings}
              onSessionComplete={handlePomodoroComplete}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <TimeAnalytics
            entries={entries}
            todayTotal={todayTotal}
            weekTotal={weekTotal}
            tasks={tasks}
            projects={projects}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
