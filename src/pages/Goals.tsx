import { useState, useEffect } from 'react';
import { Target, Plus, Pencil, Trash2, MoreVertical, CheckCircle2, Circle, Calendar, TrendingUp, Flag, ArrowRightLeft } from 'lucide-react';
import { ReportActions } from '@/components/shared/ReportActions';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FieldVisibility } from '@/components/shared/FieldVisibility';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  target_amount: number | null;
  current_amount: number | null;
  target_date: string | null;
  is_next_year_plan: boolean | null;
  goal_type: string;
}

interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  is_completed: boolean | null;
  completed_at: string | null;
  sort_order: number | null;
}

const CATEGORIES = [
  { value: 'personal', label: 'Personal', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'career', label: 'Career', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'finance', label: 'Finance', color: 'bg-green-500/20 text-green-400' },
  { value: 'health', label: 'Health', color: 'bg-teal-500/20 text-teal-400' },
  { value: 'learning', label: 'Learning', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'family', label: 'Family', color: 'bg-pink-500/20 text-pink-400' },
  { value: 'travel', label: 'Travel', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'spiritual', label: 'Spiritual', color: 'bg-indigo-500/20 text-indigo-400' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
];

export default function Goals() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mode } = useDashboardMode();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [activeTab, setActiveTab] = useState('current');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'personal',
    status: 'active',
    target_amount: '',
    current_amount: '',
    target_date: '',
    is_next_year_plan: false,
  });

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user, mode]);

  const loadGoals = async () => {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user?.id)
      .eq('goal_type', mode)
      .order('created_at', { ascending: false });
    setGoals(data || []);
    
    // Load milestones for all goals
    if (data && data.length > 0) {
      const goalIds = data.map(g => g.id);
      const { data: milestonesData } = await supabase
        .from('goal_milestones')
        .select('*')
        .in('goal_id', goalIds)
        .order('sort_order', { ascending: true });
      
      const grouped: Record<string, Milestone[]> = {};
      milestonesData?.forEach(m => {
        if (!grouped[m.goal_id]) grouped[m.goal_id] = [];
        grouped[m.goal_id].push(m);
      });
      setMilestones(grouped);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'personal',
      status: 'active',
      target_amount: '',
      current_amount: '',
      target_date: '',
      is_next_year_plan: false,
    });
    setEditingGoal(null);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      category: goal.category || 'personal',
      status: goal.status || 'active',
      target_amount: goal.target_amount?.toString() || '',
      current_amount: goal.current_amount?.toString() || '',
      target_date: goal.target_date || '',
      is_next_year_plan: goal.is_next_year_plan || false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    try {
      const payload = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        status: formData.status,
        target_amount: formData.target_amount ? parseFloat(formData.target_amount) : null,
        current_amount: formData.current_amount ? parseFloat(formData.current_amount) : null,
        target_date: formData.target_date || null,
        is_next_year_plan: formData.is_next_year_plan,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(payload)
          .eq('id', editingGoal.id);
        if (error) throw error;
        toast.success(t('goals.updated'));
      } else {
        const { error } = await supabase.from('goals').insert({ ...payload, goal_type: mode });
        if (error) throw error;
        toast.success(t('goals.added'));
      }

      setDialogOpen(false);
      resetForm();
      loadGoals();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('goals.deleteConfirm'))) return;
    
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(t('goals.deleted'));
      loadGoals();
    }
  };

  const handleMoveGoal = async (goal: Goal) => {
    const newType = goal.goal_type === 'office' ? 'personal' : 'office';
    const { error } = await supabase
      .from('goals')
      .update({ goal_type: newType })
      .eq('id', goal.id);

    if (error) {
      toast.error('Failed to move goal');
    } else {
      toast.success(`Goal moved to ${newType}`);
      setGoals(goals.filter(g => g.id !== goal.id));
    }
  };

  const handleUpdateProgress = async (goal: Goal, newAmount: string) => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount)) return;

    const { error } = await supabase
      .from('goals')
      .update({ current_amount: amount })
      .eq('id', goal.id);
    
    if (!error) {
      loadGoals();
      toast.success(t('goals.progressUpdated'));
    }
  };

  const handleAddMilestone = async (goalId: string) => {
    if (!newMilestone.trim() || !user) return;

    const sortOrder = (milestones[goalId]?.length || 0) + 1;
    const { error } = await supabase.from('goal_milestones').insert({
      user_id: user.id,
      goal_id: goalId,
      title: newMilestone.trim(),
      sort_order: sortOrder,
    });

    if (!error) {
      setNewMilestone('');
      loadGoals();
      toast.success(t('goals.milestoneAdded'));
    }
  };

  const handleToggleMilestone = async (milestone: Milestone) => {
    const { error } = await supabase
      .from('goal_milestones')
      .update({
        is_completed: !milestone.is_completed,
        completed_at: !milestone.is_completed ? new Date().toISOString() : null,
      })
      .eq('id', milestone.id);

    if (!error) {
      loadGoals();
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    const { error } = await supabase.from('goal_milestones').delete().eq('id', id);
    if (!error) {
      loadGoals();
      toast.success(t('goals.milestoneDeleted'));
    }
  };

  const getCategoryColor = (category: string | null) => {
    return CATEGORIES.find(c => c.value === category)?.color || 'bg-muted text-muted-foreground';
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-primary/20 text-primary';
    }
  };

  const calculateMilestoneProgress = (goalId: string) => {
    const goalMilestones = milestones[goalId] || [];
    if (goalMilestones.length === 0) return 0;
    const completed = goalMilestones.filter(m => m.is_completed).length;
    return (completed / goalMilestones.length) * 100;
  };

  // Filter goals
  const currentGoals = goals.filter(g => !g.is_next_year_plan);
  const nextYearPlans = goals.filter(g => g.is_next_year_plan);
  const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'in_progress');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const openDetailDialog = (goal: Goal) => {
    setSelectedGoal(goal);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t('goals.goalsAndPlans')}</h1>
        
        <div className="flex items-center gap-4">
          <ReportActions
            variant="compact"
            headers={['Title', 'Category', 'Status', 'Target Amount', 'Current Amount', 'Target Date']}
            rows={goals.map(g => [g.title, g.category || '', g.status || '', String(g.target_amount || ''), String(g.current_amount || ''), g.target_date || ''])}
            filename={`lifeos-goals-${new Date().toISOString().split('T')[0]}`}
            title="Goals Report"
            summaryCards={[
              { label: 'Active', value: activeGoals.length },
              { label: 'Total', value: goals.length },
            ]}
          />
          <div className="text-right hidden sm:block">
            <p className="text-sm text-muted-foreground">{t('goals.activeGoals')}</p>
            <p className="text-xl font-bold text-primary">{activeGoals.length}</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('goals.addGoal')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingGoal ? t('goals.editGoal') : t('goals.addGoal')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('goals.goalTitle')}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                    placeholder={t('goals.goalTitlePlaceholder')}
                    required
                  />
                </div>

                <FieldVisibility entityType="goal" fieldName="description">
                  <div className="space-y-2">
                    <Label>{t('goals.description')}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                      placeholder={t('goals.descriptionPlaceholder')}
                      rows={2}
                    />
                  </div>
                </FieldVisibility>

                <div className="grid grid-cols-2 gap-4">
                  <FieldVisibility entityType="goal" fieldName="category">
                    <div className="space-y-2">
                      <Label>{t('goals.category')}</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldVisibility>
                  
                  <FieldVisibility entityType="goal" fieldName="status">
                    <div className="space-y-2">
                      <Label>{t('goals.status')}</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldVisibility>
                </div>

                <FieldVisibility entityType="goal" fieldName="target_amount">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('goals.targetAmount')} (৳)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.target_amount}
                        onChange={(e) => setFormData(f => ({ ...f, target_amount: e.target.value }))}
                        className="font-mono"
                        placeholder={t('common.optional')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t('goals.currentAmount')} (৳)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.current_amount}
                        onChange={(e) => setFormData(f => ({ ...f, current_amount: e.target.value }))}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </FieldVisibility>

                <FieldVisibility entityType="goal" fieldName="target_date">
                  <div className="space-y-2">
                    <Label>{t('goals.targetDate')}</Label>
                    <Input
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData(f => ({ ...f, target_date: e.target.value }))}
                    />
                  </div>
                </FieldVisibility>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <Label className="text-base">{t('goals.nextYearPlan')}</Label>
                    <p className="text-sm text-muted-foreground">{t('goals.nextYearPlanDescription')}</p>
                  </div>
                  <Switch
                    checked={formData.is_next_year_plan}
                    onCheckedChange={(checked) => setFormData(f => ({ ...f, is_next_year_plan: checked }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {editingGoal ? t('common.save') : t('common.add')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">{t('goals.totalGoals')}</p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{goals.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <p className="text-sm text-muted-foreground">{t('goals.inProgress')}</p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{activeGoals.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <p className="text-sm text-muted-foreground">{t('goals.completed')}</p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{completedGoals.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-orange-400" />
              <p className="text-sm text-muted-foreground">{t('goals.nextYearPlans')}</p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{nextYearPlans.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Current vs Next Year */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">{t('goals.currentGoals')} ({currentGoals.length})</TabsTrigger>
          <TabsTrigger value="nextYear">{t('goals.nextYearPlans')} ({nextYearPlans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {currentGoals.length === 0 ? (
              <Card className="bg-card border-border col-span-full">
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('goals.noGoalsYet')}</p>
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('goals.addFirstGoal')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              currentGoals.map(goal => renderGoalCard(goal))
            )}
          </div>
        </TabsContent>

        <TabsContent value="nextYear" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {nextYearPlans.length === 0 ? (
              <Card className="bg-card border-border col-span-full">
                <CardContent className="py-12 text-center">
                  <Flag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('goals.noNextYearPlans')}</p>
                  <Button className="mt-4" onClick={() => {
                    setFormData(f => ({ ...f, is_next_year_plan: true }));
                    setDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('goals.addNextYearPlan')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              nextYearPlans.map(goal => renderGoalCard(goal))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Goal Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedGoal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  {selectedGoal.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getCategoryColor(selectedGoal.category)}>{selectedGoal.category}</Badge>
                  <Badge className={getStatusColor(selectedGoal.status)}>{selectedGoal.status}</Badge>
                  {selectedGoal.is_next_year_plan && (
                    <Badge variant="outline"><Flag className="h-3 w-3 mr-1" />{t('goals.nextYear')}</Badge>
                  )}
                </div>

                {selectedGoal.description && (
                  <p className="text-sm text-muted-foreground">{selectedGoal.description}</p>
                )}

                {selectedGoal.target_amount && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('goals.financialProgress')}</span>
                      <span className="font-mono text-foreground">
                        ৳{Number(selectedGoal.current_amount || 0).toLocaleString()} / ৳{Number(selectedGoal.target_amount).toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((Number(selectedGoal.current_amount || 0) / Number(selectedGoal.target_amount)) * 100, 100)} 
                      className="h-2" 
                    />
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="number"
                        placeholder={t('goals.updateAmount')}
                        className="font-mono"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateProgress(selectedGoal, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                          if (input) {
                            handleUpdateProgress(selectedGoal, input.value);
                            input.value = '';
                          }
                        }}
                      >
                        {t('common.update')}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedGoal.target_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{t('goals.targetDate')}: {format(new Date(selectedGoal.target_date), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {/* Milestones */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">{t('goals.milestones')}</Label>
                    <span className="text-sm text-muted-foreground">
                      {milestones[selectedGoal.id]?.filter(m => m.is_completed).length || 0} / {milestones[selectedGoal.id]?.length || 0}
                    </span>
                  </div>
                  
                  {(milestones[selectedGoal.id]?.length || 0) > 0 && (
                    <Progress value={calculateMilestoneProgress(selectedGoal.id)} className="h-1.5" />
                  )}

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {milestones[selectedGoal.id]?.map(milestone => (
                      <div key={milestone.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 group">
                        <button
                          onClick={() => handleToggleMilestone(milestone)}
                          className="flex-shrink-0"
                        >
                          {milestone.is_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                        <span className={`flex-1 text-sm ${milestone.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {milestone.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive"
                          onClick={() => handleDeleteMilestone(milestone.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newMilestone}
                      onChange={(e) => setNewMilestone(e.target.value)}
                      placeholder={t('goals.addMilestone')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMilestone(selectedGoal.id);
                        }
                      }}
                    />
                    <Button size="sm" onClick={() => handleAddMilestone(selectedGoal.id)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderGoalCard(goal: Goal) {
    const progress = goal.target_amount && goal.current_amount 
      ? Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100) 
      : 0;
    const milestoneProgress = calculateMilestoneProgress(goal.id);
    const goalMilestones = milestones[goal.id] || [];

    return (
      <Card key={goal.id} className="bg-card border-border group hover:border-primary/30 transition-colors cursor-pointer" onClick={() => openDetailDialog(goal)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-foreground">{goal.title}</h3>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge className={getCategoryColor(goal.category)}>{goal.category}</Badge>
                <Badge className={getStatusColor(goal.status)}>{goal.status}</Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(goal); }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMoveGoal(goal); }}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Move to {goal.goal_type === 'office' ? 'Personal' : 'Office'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {goal.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
          )}

          {/* Financial Progress */}
          {goal.target_amount && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('goals.financialProgress')}</span>
                <span className="font-mono text-foreground">
                  ৳{Number(goal.current_amount || 0).toLocaleString()} / ৳{Number(goal.target_amount).toLocaleString()}
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Milestones Progress */}
          {goalMilestones.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('goals.milestones')}</span>
                <span className="text-foreground">
                  {goalMilestones.filter(m => m.is_completed).length}/{goalMilestones.length}
                </span>
              </div>
              <Progress value={milestoneProgress} className="h-1.5" />
            </div>
          )}

          {goal.target_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}
