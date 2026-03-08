import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, isToday, parseISO } from 'date-fns';
import { ReportActions } from '@/components/shared/ReportActions';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckSquare, Target, Heart, Plus, Clock, AlertCircle, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRecurringInstances } from '@/lib/recurringEvents';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'goal' | 'family_event';
  priority?: string;
  status?: string;
  event_type?: string;
  is_recurring?: boolean;
  recurring_pattern?: string;
}

type ViewMode = 'month' | 'week' | 'day';

export default function Calendar() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) loadEvents();
  }, [user, currentDate, viewMode]);

  const loadEvents = async () => {
    setLoading(true);
    
    // Determine date range based on view mode
    let startDate: Date, endDate: Date;
    if (viewMode === 'month') {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    } else if (viewMode === 'week') {
      startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
      endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      startDate = currentDate;
      endDate = currentDate;
    }

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    // Fetch tasks with due dates (including recurring)
    const [tasksResult, goalsResult, familyEventsResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, due_date, priority, status, is_recurring, recurring_pattern')
        .eq('user_id', user?.id)
        .not('due_date', 'is', null),
      supabase
        .from('goals')
        .select('id, title, target_date, status')
        .eq('user_id', user?.id)
        .not('target_date', 'is', null)
        .gte('target_date', startStr)
        .lte('target_date', endStr),
      supabase
        .from('family_events')
        .select('id, title, event_date, event_type')
        .eq('user_id', user?.id)
        .gte('event_date', startStr)
        .lte('event_date', endStr)
    ]);

    const calendarEvents: CalendarEvent[] = [];

    // Add tasks
    if (tasksResult.data) {
      tasksResult.data.forEach(task => {
        const baseEvent: CalendarEvent = {
          id: task.id,
          title: task.title,
          date: task.due_date!,
          type: 'task',
          priority: task.priority || 'medium',
          status: task.status || 'pending',
          is_recurring: task.is_recurring || false,
          recurring_pattern: task.recurring_pattern || undefined,
        };

        // Check if this task falls within the date range
        const taskDate = parseISO(task.due_date!);
        if (taskDate >= startDate && taskDate <= endDate) {
          calendarEvents.push(baseEvent);
        }

        // Generate recurring instances
        if (task.is_recurring && task.recurring_pattern) {
          const recurringInstances = generateRecurringInstances(baseEvent, startDate, endDate);
          // Filter out any that are the same as the base event date
          const filteredInstances = recurringInstances.filter(
            inst => inst.date !== task.due_date
          );
          calendarEvents.push(...filteredInstances);
        }
      });
    }

    // Add goals
    if (goalsResult.data) {
      goalsResult.data.forEach(goal => {
        calendarEvents.push({
          id: goal.id,
          title: goal.title,
          date: goal.target_date!,
          type: 'goal',
          status: goal.status || 'in_progress'
        });
      });
    }

    // Add family events
    if (familyEventsResult.data) {
      familyEventsResult.data.forEach(event => {
        calendarEvents.push({
          id: event.id,
          title: event.title,
          date: event.event_date,
          type: 'family_event',
          event_type: event.event_type
        });
      });
    }

    setEvents(calendarEvents);
    setLoading(false);
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(parseISO(event.date), date));
  };

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'task': return CheckSquare;
      case 'goal': return Target;
      case 'family_event': return Heart;
      default: return CalendarIcon;
    }
  };

  const getEventTypeColor = (event: CalendarEvent) => {
    if (event.type === 'task') {
      if (event.priority === 'high') return 'bg-destructive/20 text-destructive border-destructive/30';
      if (event.priority === 'medium') return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      return 'bg-green-500/20 text-green-600 border-green-500/30';
    }
    if (event.type === 'goal') return 'bg-primary/20 text-primary border-primary/30';
    return 'bg-pink-500/20 text-pink-600 border-pink-500/30';
  };

  const headerText = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  }, [currentDate, viewMode]);

  // Month view days
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 md:h-6 md:w-6" />
          {language === 'bn' ? 'ক্যালেন্ডার' : 'Calendar'}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <ReportActions
            variant="compact"
            headers={['Title', 'Date', 'Type', 'Status/Priority']}
            rows={events.map(e => [e.title, e.date, e.type, e.priority || e.status || ''])}
            filename={`lifeos-calendar-${format(currentDate, 'yyyy-MM')}`}
            title="Calendar Events Report"
            subtitle={format(currentDate, 'MMMM yyyy')}
            summaryCards={[
              { label: 'Total Events', value: events.length },
              { label: 'Tasks', value: events.filter(e => e.type === 'task').length },
              { label: 'Goals', value: events.filter(e => e.type === 'goal').length },
            ]}
          />
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">{language === 'bn' ? 'মাস' : 'Month'}</TabsTrigger>
              <TabsTrigger value="week">{language === 'bn' ? 'সপ্তাহ' : 'Week'}</TabsTrigger>
              <TabsTrigger value="day">{language === 'bn' ? 'দিন' : 'Day'}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2 md:pb-4 px-3 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                {language === 'bn' ? 'আজ' : 'Today'}
              </Button>
              <CardTitle className="text-sm md:text-lg ml-1">{headerText}</CardTitle>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" /> {language === 'bn' ? 'কাজ' : 'Tasks'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Target className="h-3 w-3" /> {language === 'bn' ? 'লক্ষ্য' : 'Goals'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> {language === 'bn' ? 'ইভেন্ট' : 'Events'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'month' && (
                <motion.div
                  key="month"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-2"
                >
                  {/* Day names header */}
                  <div className="grid grid-cols-7 gap-1">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-0.5 md:gap-1">
                    {monthDays.map(day => {
                      const dayEvents = getEventsForDate(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            'min-h-14 md:min-h-24 p-0.5 md:p-1 border border-border rounded-md md:rounded-lg cursor-pointer transition-all hover:bg-accent/50',
                            !isCurrentMonth && 'opacity-40',
                            isToday(day) && 'bg-primary/10 border-primary',
                            isSelected && 'ring-2 ring-primary'
                          )}
                        >
                          <div className={cn(
                            'text-xs font-medium mb-1',
                            isToday(day) ? 'text-primary' : 'text-foreground'
                          )}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map(event => {
                              const Icon = getEventTypeIcon(event.type);
                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    'text-[10px] px-1 py-0.5 rounded flex items-center gap-1 truncate border',
                                    getEventTypeColor(event)
                                  )}
                                >
                                  <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                                  <span className="truncate">{event.title}</span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-muted-foreground pl-1">
                                +{dayEvents.length - 3} {language === 'bn' ? 'আরো' : 'more'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {viewMode === 'week' && (
                <motion.div
                  key="week"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-2"
                >
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {weekDays.map(day => {
                      const dayEvents = getEventsForDate(day);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            'min-h-32 md:min-h-64 p-1.5 md:p-2 border border-border rounded-lg cursor-pointer transition-all hover:bg-accent/50',
                            isToday(day) && 'bg-primary/10 border-primary',
                            isSelected && 'ring-2 ring-primary'
                          )}
                        >
                          <div className="text-center mb-2">
                            <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                            <div className={cn(
                              'text-lg font-semibold',
                              isToday(day) ? 'text-primary' : 'text-foreground'
                            )}>
                              {format(day, 'd')}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map(event => {
                              const Icon = getEventTypeIcon(event.type);
                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    'text-xs px-2 py-1 rounded flex items-center gap-1.5 border',
                                    getEventTypeColor(event)
                                  )}
                                >
                                  <Icon className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{event.title}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {viewMode === 'day' && (
                <motion.div
                  key="day"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {(() => {
                    const dayEvents = getEventsForDate(currentDate);
                    return dayEvents.length > 0 ? (
                      <div className="space-y-3">
                        {dayEvents.map(event => {
                          const Icon = getEventTypeIcon(event.type);
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                'p-4 rounded-lg flex items-start gap-3 border',
                                getEventTypeColor(event)
                              )}
                            >
                              <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium">{event.title}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                                  <Badge variant="outline" className="text-[10px]">
                                    {event.type === 'task' 
                                      ? (language === 'bn' ? 'কাজ' : 'Task')
                                      : event.type === 'goal'
                                      ? (language === 'bn' ? 'লক্ষ্য' : 'Goal')
                                      : (language === 'bn' ? 'পারিবারিক ইভেন্ট' : 'Family Event')}
                                  </Badge>
                                  {event.priority && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {event.priority}
                                    </Badge>
                                  )}
                                  {event.status && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {event.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                        <CalendarIcon className="h-12 w-12 mb-2 opacity-50" />
                        <p>{language === 'bn' ? 'এই দিনে কোনো ইভেন্ট নেই' : 'No events for this day'}</p>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Details Panel */}
      {selectedDate && viewMode !== 'day' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDateEvents.map(event => {
                  const Icon = getEventTypeIcon(event.type);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'p-3 rounded-lg flex items-start gap-3 border',
                        getEventTypeColor(event)
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {event.type === 'task' 
                              ? (language === 'bn' ? 'কাজ' : 'Task')
                              : event.type === 'goal'
                              ? (language === 'bn' ? 'লক্ষ্য' : 'Goal')
                              : (language === 'bn' ? 'পারিবারিক ইভেন্ট' : 'Family Event')}
                          </Badge>
                          {event.priority && (
                            <Badge variant="outline" className="text-[10px]">
                              {event.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {language === 'bn' ? 'এই দিনে কোনো ইভেন্ট নেই' : 'No events for this day'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{events.filter(e => e.type === 'task').length}</p>
              <p className="text-xs text-muted-foreground">{language === 'bn' ? 'কাজ' : 'Tasks'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{events.filter(e => e.type === 'goal').length}</p>
              <p className="text-xs text-muted-foreground">{language === 'bn' ? 'লক্ষ্য' : 'Goals'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Heart className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{events.filter(e => e.type === 'family_event').length}</p>
              <p className="text-xs text-muted-foreground">{language === 'bn' ? 'পারিবারিক ইভেন্ট' : 'Family Events'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
