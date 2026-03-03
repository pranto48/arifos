import { useState } from 'react';
import { Plus, Flame, Trophy, CheckCircle2, Circle, MoreVertical, Pencil, Trash2, Calendar, LayoutGrid, Bell, BellOff, Clock } from 'lucide-react';
import { ReportActions } from '@/components/shared/ReportActions';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHabits, HabitWithStats } from '@/hooks/useHabits';
import { HabitCalendar } from '@/components/habits/HabitCalendar';
import { cn } from '@/lib/utils';

const HABIT_COLORS = [
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16'
];

function HabitCard({ habit, onToggle, onEdit, onDelete }: {
  habit: HabitWithStats;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onToggle}
                className="relative"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                    habit.completedToday 
                      ? 'bg-primary/20' 
                      : 'bg-muted hover:bg-muted/80'
                  )}
                  style={{ 
                    backgroundColor: habit.completedToday ? `${habit.color}20` : undefined,
                  }}
                >
                  {habit.completedToday ? (
                    <CheckCircle2 className="w-6 h-6" style={{ color: habit.color }} />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground" />
                  )}
                </motion.div>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    'font-semibold text-foreground transition-all',
                    habit.completedToday && 'line-through opacity-60'
                  )}>
                    {habit.title}
                  </h3>
                  {habit.reminder_enabled && (
                    <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                {habit.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {habit.description}
                  </p>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-medium">{habit.streak}</span>
              <span className="text-muted-foreground">day streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{habit.totalCompletions}</span>
              <span className="text-muted-foreground">total</span>
            </div>
          </div>

          {/* Last 7 days visualization */}
          <div className="flex items-center gap-1">
            {last7Days.map((date, i) => {
              const isCompleted = habit.completions.some(c => c.completed_at === date);
              const isToday = date === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div
                  key={date}
                  className={cn(
                    'flex-1 h-2 rounded-full transition-all',
                    isCompleted 
                      ? 'opacity-100' 
                      : 'bg-muted opacity-50',
                    isToday && !isCompleted && 'ring-1 ring-primary/50'
                  )}
                  style={{ 
                    backgroundColor: isCompleted ? habit.color : undefined 
                  }}
                  title={`${format(subDays(new Date(), 6 - i), 'EEE, MMM d')}${isCompleted ? ' ✓' : ''}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>7 days ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Habits() {
  const { habits, isLoading, createHabit, updateHabit, deleteHabit, toggleCompletion } = useHabits();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStats | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: HABIT_COLORS[0],
    reminder_enabled: false,
    reminder_time: '08:00',
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', color: HABIT_COLORS[0], reminder_enabled: false, reminder_time: '08:00' });
    setEditingHabit(null);
  };

  const handleOpenDialog = (habit?: HabitWithStats) => {
    if (habit) {
      setEditingHabit(habit);
      setFormData({
        title: habit.title,
        description: habit.description || '',
        color: habit.color,
        reminder_enabled: habit.reminder_enabled || false,
        reminder_time: habit.reminder_time?.slice(0, 5) || '08:00',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingHabit) {
      await updateHabit.mutateAsync({
        id: editingHabit.id,
        title: formData.title,
        description: formData.description || null,
        color: formData.color,
        reminder_enabled: formData.reminder_enabled,
        reminder_time: formData.reminder_time + ':00',
      });
    } else {
      await createHabit.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        color: formData.color,
        reminder_enabled: formData.reminder_enabled,
        reminder_time: formData.reminder_time + ':00',
      });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this habit?')) {
      await deleteHabit.mutateAsync(id);
    }
  };

  const handleCalendarToggle = (habitId: string, date: string) => {
    toggleCompletion.mutate({ habitId, date });
  };

  const completedToday = habits.filter(h => h.completedToday).length;
  const totalHabits = habits.length;
  const longestStreak = Math.max(0, ...habits.map(h => h.streak));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Habits</h1>
          <p className="text-muted-foreground">Build better habits, one day at a time</p>
        </div>
        
        <div className="flex items-center gap-2">
          <ReportActions
            variant="compact"
            headers={['Habit', 'Streak', 'Total Completions', 'Frequency', 'Reminder']}
            rows={habits.map(h => [h.title, String(h.streak), String(h.totalCompletions), h.frequency || 'daily', h.reminder_enabled ? h.reminder_time || 'On' : 'Off'])}
            filename={`lifeos-habits-${new Date().toISOString().split('T')[0]}`}
            title="Habits Report"
            summaryCards={[
              { label: 'Total Habits', value: habits.length },
              { label: 'Longest Streak', value: longestStreak },
              { label: 'Completions Today', value: habits.filter(h => h.completedToday).length },
            ]}
          />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Habit
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Habit Name</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Morning Meditation"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Why is this habit important to you?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        formData.color === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Reminder Settings */}
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {formData.reminder_enabled ? (
                      <Bell className="h-4 w-4 text-primary" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label htmlFor="reminder" className="cursor-pointer">Email Reminder</Label>
                  </div>
                  <Switch
                    id="reminder"
                    checked={formData.reminder_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reminder_enabled: checked }))}
                  />
                </div>
                
                {formData.reminder_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="reminder_time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Reminder Time
                    </Label>
                    <Input
                      id="reminder_time"
                      type="time"
                      value={formData.reminder_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, reminder_time: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      You'll receive an email reminder at this time (in your timezone)
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createHabit.isPending || updateHabit.isPending}>
                  {editingHabit ? 'Save Changes' : 'Create Habit'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedToday}/{totalHabits}</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{longestStreak}</p>
                <p className="text-sm text-muted-foreground">Longest Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {habits.reduce((sum, h) => sum + h.totalCompletions, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Grid/Calendar View */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Grid
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : habits.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No habits yet</h3>
                <p className="text-muted-foreground mb-4">Start building better habits today!</p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Habit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {habits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onToggle={() => toggleCompletion.mutate({ habitId: habit.id })}
                    onEdit={() => handleOpenDialog(habit)}
                    onDelete={() => handleDelete(habit.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {habits.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No habits to display</h3>
                <p className="text-muted-foreground mb-4">Create a habit first to see the calendar view</p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Habit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <HabitCalendar 
                  habits={habits} 
                  onToggleCompletion={handleCalendarToggle}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
