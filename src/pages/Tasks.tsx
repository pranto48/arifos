import { useState, useEffect } from 'react';
import { CheckSquare, Pencil, Trash2, GripVertical, MoreVertical, ChevronDown, ChevronUp, ArrowRightLeft, Repeat, FolderOpen, Settings2, CheckCheck, UserPlus, Flag, CalendarClock, LayoutGrid, List, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TaskChecklist } from '@/components/tasks/TaskChecklist';
import { RecurringEventForm } from '@/components/calendar/RecurringEventForm';
import { getPatternLabel } from '@/lib/recurringEvents';
import { useTaskCategories, TaskCategory } from '@/hooks/useTaskCategories';
import { TaskCategoryManager } from '@/components/tasks/TaskCategoryManager';
import { BulkCategoryAssign } from '@/components/tasks/BulkCategoryAssign';
import { TaskAssignDialog } from '@/components/tasks/TaskAssignDialog';
import { PendingTaskAssignments } from '@/components/tasks/PendingTaskAssignments';
import { OutgoingTaskAssignments } from '@/components/tasks/OutgoingTaskAssignments';
import { TaskAssignmentHistory } from '@/components/tasks/TaskAssignmentHistory';
import { TaskFollowUp } from '@/components/tasks/TaskFollowUp';
import { TaskKanbanBoard } from '@/components/tasks/TaskKanbanBoard';
import { DataExportImportButton } from '@/components/shared/DataExportImportButton';
import { logAiUsage } from '@/lib/aiUsageLogger';
import { ReportActions } from '@/components/shared/ReportActions';
import { FieldVisibility } from '@/components/shared/FieldVisibility';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { pageHeaderClass, pageShellClass, pageTitleClass, surfaceCardClass } from '@/lib/design-tokens';

interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  sort_order: number | null;
  task_type: string;
  is_recurring: boolean | null;
  recurring_pattern: string | null;
  category_id: string | null;
  support_user_id: string | null;
  needs_follow_up: boolean | null;
  follow_up_date: string | null;
}

interface SupportUserInfo {
  id: string;
  name: string;
  department_name: string;
  unit_name: string;
}


const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

interface SortableTaskProps {
  task: Task;
  checklists: ChecklistItem[];
  categories: TaskCategory[];
  supportUserInfo?: SupportUserInfo;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, currentType: string) => void;
  onAssign: (task: Task) => void;
  onAiBreakdown: (task: Task) => void;
  onChecklistUpdate: () => void;
  priorityColors: Record<string, string>;
  selectionMode: boolean;
  isSelected: boolean;
  onSelectionChange: (id: string, selected: boolean) => void;
}

function SortableTask({ task, checklists, categories, supportUserInfo, onToggle, onEdit, onDelete, onMove, onAssign, onAiBreakdown, onChecklistUpdate, priorityColors, selectionMode, isSelected, onSelectionChange }: SortableTaskProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const completedCount = checklists.filter(c => c.is_completed).length;
  const category = categories.find(c => c.id === task.category_id);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`${surfaceCardClass} hover:bg-muted/30 transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {selectionMode ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(c) => onSelectionChange(task.id, !!c)}
            />
          ) : (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={(c) => onToggle(task.id, !!c)}
          />
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm md:text-base ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs md:text-sm text-muted-foreground truncate">{task.description}</p>
            )}
            {/* Support User Info for Office Tasks */}
            {supportUserInfo && (
              <div className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-muted-foreground mt-1">
                <span className="font-medium text-primary truncate max-w-[60px] md:max-w-none">{supportUserInfo.name}</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">{supportUserInfo.unit_name}</span>
                <span className="hidden md:inline">→</span>
                <span className="hidden md:inline">{supportUserInfo.department_name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {task.priority && (
              <Badge className={`text-[10px] md:text-xs ${priorityColors[task.priority] || 'bg-muted text-muted-foreground'}`}>
                {task.priority}
              </Badge>
            )}
            {task.due_date && (
              <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            {checklists.length > 0 && (
              <Badge variant="outline" className="text-[10px] md:text-xs hidden sm:flex">
                {completedCount}/{checklists.length}
              </Badge>
            )}
            {category && (
              <Badge
                variant="outline" 
                className="text-[10px] md:text-xs items-center gap-1 max-w-[60px] md:max-w-none truncate hidden sm:flex"
                style={{ borderColor: category.color, color: category.color }}
              >
                <FolderOpen className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{category.name}</span>
              </Badge>
            )}
            {task.needs_follow_up && (
              <Badge variant="outline" className="text-[10px] flex items-center gap-0.5 border-amber-500/50 text-amber-500">
                <Flag className="h-2.5 w-2.5" />
              </Badge>
            )}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(task.id, task.task_type)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Move to {task.task_type === 'office' ? 'Personal' : 'Office'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAssign(task)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign to User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAiBreakdown(task)}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Assist: Breakdown
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="pt-4 border-t border-border mt-4">
            <TaskChecklist
              taskId={task.id}
              items={checklists}
              onUpdate={onChecklistUpdate}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

const TASKS_PER_PAGE = 20;

export default function Tasks() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mode } = useDashboardMode();
  const { categories, reload: reloadCategories } = useTaskCategories();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>({});
  const [supportUserInfoMap, setSupportUserInfoMap] = useState<Record<string, SupportUserInfo>>({});
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supportUserFilter, setSupportUserFilter] = useState<string>('all');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    is_recurring: false,
    recurring_pattern: 'weekly',
    category_id: '',
    support_user_id: '',
    needs_follow_up: false,
    follow_up_date: '',
  });
  
  // Support users for office mode task editing
  const [allSupportUsers, setAllSupportUsers] = useState<{ id: string; name: string; department_name: string; unit_name: string }[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user) {
      setTasks([]);
      setPage(0);
      setHasMore(true);
      loadData(0, true);
      
      // Load support users for office mode
      if (mode === 'office') {
        loadAllSupportUsers();
      }
    }
  }, [user, mode]);

  // Listen for task creation events (e.g. from QuickAddTask)
  useEffect(() => {
    const handleTasksUpdated = () => {
      loadData(0, true);
    };
    window.addEventListener('tasks-updated', handleTasksUpdated);
    return () => window.removeEventListener('tasks-updated', handleTasksUpdated);
  }, [user, mode]);

  const loadAllSupportUsers = async () => {
    const { data: usersData } = await supabase
      .from('support_users')
      .select('id, name, department_id')
      .eq('is_active', true);
    
    if (usersData && usersData.length > 0) {
      const deptIds = [...new Set(usersData.map(u => u.department_id))];
      const { data: deptsData } = await supabase
        .from('support_departments')
        .select('id, name, unit_id')
        .in('id', deptIds);
      
      const unitIds = deptsData ? [...new Set(deptsData.map(d => d.unit_id))] : [];
      const { data: unitsData } = await supabase
        .from('support_units')
        .select('id, name')
        .in('id', unitIds);
      
      const users = usersData.map(sUser => {
        const dept = deptsData?.find(d => d.id === sUser.department_id);
        const unit = dept ? unitsData?.find(u => u.id === dept.unit_id) : null;
        return {
          id: sUser.id,
          name: sUser.name,
          department_name: dept?.name || 'N/A',
          unit_name: unit?.name || 'N/A',
        };
      });
      setAllSupportUsers(users);
    }
  };

  const loadData = async (pageNum: number = page, reset: boolean = false) => {
    if (loading) return;
    setLoading(true);
    
    // Load tasks filtered by current mode (office/personal)
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .eq('task_type', mode)
      .order('sort_order', { ascending: true })
      .range(pageNum * TASKS_PER_PAGE, (pageNum + 1) * TASKS_PER_PAGE - 1);

    const newTasks = tasksData || [];
    setTasks(prev => reset ? newTasks : [...prev, ...newTasks]);
    setHasMore(newTasks.length === TASKS_PER_PAGE);
    setPage(pageNum);

    // Load all checklists for the loaded tasks
    const taskIds = reset ? newTasks.map(t => t.id) : [...tasks, ...newTasks].map(t => t.id);
    if (taskIds.length > 0) {
      const { data: checklistData } = await supabase
        .from('task_checklists')
        .select('*')
        .eq('user_id', user?.id)
        .in('task_id', taskIds)
        .order('sort_order', { ascending: true });

      const grouped: Record<string, ChecklistItem[]> = {};
      (checklistData || []).forEach((c) => {
        if (!grouped[c.task_id]) grouped[c.task_id] = [];
        grouped[c.task_id].push(c);
      });
      setChecklists(prev => reset ? grouped : { ...prev, ...grouped });
    }

    // Load support user info for office tasks
    const supportUserIds = (reset ? newTasks : [...tasks, ...newTasks])
      .filter(t => t.support_user_id)
      .map(t => t.support_user_id as string);
    
    if (supportUserIds.length > 0) {
      const uniqueIds = [...new Set(supportUserIds)];
      
      // Fetch support users with department info
      const { data: supportUsersData } = await supabase
        .from('support_users')
        .select('id, name, department_id')
        .in('id', uniqueIds);
      
      if (supportUsersData && supportUsersData.length > 0) {
        const deptIds = [...new Set(supportUsersData.map(u => u.department_id))];
        
        const { data: deptsData } = await supabase
          .from('support_departments')
          .select('id, name, unit_id')
          .in('id', deptIds);
        
        const unitIds = deptsData ? [...new Set(deptsData.map(d => d.unit_id))] : [];
        
        const { data: unitsData } = await supabase
          .from('support_units')
          .select('id, name')
          .in('id', unitIds);
        
        const newInfoMap: Record<string, SupportUserInfo> = {};
        supportUsersData.forEach(sUser => {
          const dept = deptsData?.find(d => d.id === sUser.department_id);
          const unit = dept ? unitsData?.find(u => u.id === dept.unit_id) : null;
          
          newInfoMap[sUser.id] = {
            id: sUser.id,
            name: sUser.name,
            department_name: dept?.name || 'N/A',
            unit_name: unit?.name || 'N/A',
          };
        });
        
        setSupportUserInfoMap(prev => reset ? newInfoMap : { ...prev, ...newInfoMap });
      }
    }
    
    setLoading(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadData(page + 1);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    triggerHaptic(completed ? 14 : 8);
    await supabase.from('tasks').update({
      status: completed ? 'completed' : 'todo',
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', id);
    // Update local state instead of full reload
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: completed ? 'completed' : 'todo' } : t));
    toast.success(completed ? 'Task marked complete' : 'Task marked active', {
      description: completed ? 'Nice work — it has been moved out of your active list.' : 'The task is back in your active queue.',
      duration: 1800,
    });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      due_date: task.due_date?.split('T')[0] || '',
      is_recurring: task.is_recurring || false,
      recurring_pattern: task.recurring_pattern || 'weekly',
      category_id: task.category_id || '',
      support_user_id: task.support_user_id || '',
      needs_follow_up: task.needs_follow_up || false,
      follow_up_date: task.follow_up_date || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !formData.title.trim()) return;

    const updatedData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      priority: formData.priority,
      due_date: formData.due_date || null,
      is_recurring: formData.is_recurring,
      recurring_pattern: formData.is_recurring ? formData.recurring_pattern : null,
      category_id: formData.category_id || null,
      support_user_id: mode === 'office' ? (formData.support_user_id || null) : null,
      needs_follow_up: formData.needs_follow_up,
      follow_up_date: formData.needs_follow_up && formData.follow_up_date ? formData.follow_up_date : null,
    };

    const { error } = await supabase.from('tasks').update(updatedData).eq('id', editingTask.id);

    if (error) {
      toast.error('Failed to update task');
    } else {
      toast.success('Task updated');
      setEditDialogOpen(false);
      setEditingTask(null);
      // Update local state
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updatedData } : t));
      
      // Update support user info map if changed
      if (updatedData.support_user_id) {
        const sUser = allSupportUsers.find(u => u.id === updatedData.support_user_id);
        if (sUser) {
          setSupportUserInfoMap(prev => ({
            ...prev,
            [updatedData.support_user_id!]: sUser,
          }));
        }
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    // Delete checklists first
    await supabase.from('task_checklists').delete().eq('task_id', id);
    
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete task');
    } else {
      toast.success('Task deleted');
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleMove = async (id: string, currentType: string) => {
    const newType = currentType === 'office' ? 'personal' : 'office';
    const { error } = await supabase.from('tasks').update({ task_type: newType }).eq('id', id);
    if (error) {
      toast.error('Failed to move task');
    } else {
      toast.success(`Task moved to ${newType}`);
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleAssign = (task: Task) => {
    setAssigningTask(task);
    setAssignDialogOpen(true);
  };

  const generateChecklistSteps = (task: Task): string[] => {
    const source = `${task.title}. ${task.description || ''}`.trim();
    const sentenceSteps = source
      .split(/\n|\.|;|,/)
      .map((s) => s.replace(/^[-*\d.\s]+/, '').trim())
      .filter((s) => s.length > 10)
      .slice(0, 8);

    if (sentenceSteps.length >= 3) {
      return sentenceSteps.map((s, idx) => `${idx + 1}. ${s.charAt(0).toUpperCase()}${s.slice(1)}`);
    }

    return [
      `Define expected outcome for: ${task.title}`,
      'List required resources or dependencies',
      'Execute the first concrete action',
      'Review progress and adjust next step',
    ];
  };

  const handleAiBreakdown = async (task: Task) => {
    if (!user) return;

    const items = generateChecklistSteps(task);
    const existing = new Set((checklists[task.id] || []).map((c) => c.title.toLowerCase().trim()));
    const newItems = items.filter((title) => !existing.has(title.toLowerCase().trim()));

    if (newItems.length === 0) {
      toast.info('Checklist already contains these breakdown steps');
      return;
    }

    const rows = newItems.map((title, i) => ({
      task_id: task.id,
      user_id: user.id,
      title,
      is_completed: false,
      sort_order: (checklists[task.id]?.length || 0) + i + 1,
    }));

    const { error } = await supabase.from('task_checklists').insert(rows as any);
    if (error) {
      toast.error('Failed to auto-generate checklist');
      return;
    }

    toast.success(`AI Assist added ${newItems.length} subtask${newItems.length > 1 ? 's' : ''}`);
    loadData(0, true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);

      // Update sort_order in database
      const updates = newTasks.map((task, index) => ({
        id: task.id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        await supabase.from('tasks').update({ sort_order: update.sort_order }).eq('id', update.id);
      }
    }
  };

  const handleKanbanStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', taskId);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  const filteredTasks = tasks.filter((t) => {
    // Status filter
    if (filter === 'completed' && t.status !== 'completed') return false;
    if (filter === 'active' && t.status === 'completed') return false;
    if (filter === 'follow-up' && !t.needs_follow_up) return false;
    // Category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'uncategorized') return !t.category_id;
      if (t.category_id !== categoryFilter) return false;
    }
    // Support user filter (office mode only)
    if (mode === 'office' && supportUserFilter !== 'all') {
      if (supportUserFilter === 'unassigned') return !t.support_user_id;
      if (t.support_user_id !== supportUserFilter) return false;
    }
    return true;
  });

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  };

  const filterLabels: Record<string, string> = {
    all: t('common.all'),
    active: t('tasks.active'),
    completed: t('tasks.completed'),
    'follow-up': 'Follow-Up',
  };

  return (
    <div className={pageShellClass}>
      <div className={pageHeaderClass}>
        <h1 className={`${pageTitleClass} text-2xl`}>{t('tasks.title')}</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {/* View Toggle */}
          <div className="flex items-center gap-0.5 bg-muted/30 rounded-md p-0.5">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Status Filters */}
          {['all', 'active', 'completed', 'follow-up'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className={f === 'follow-up' ? 'gap-1' : ''}
            >
              {f === 'follow-up' && <Flag className="h-3 w-3" />}
              {filterLabels[f]}
            </Button>
          ))}

          {/* Actions Submenu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings2 className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                setSelectionMode(!selectionMode);
                setSelectedTaskIds([]);
              }}>
                <CheckCheck className="h-4 w-4 mr-2" />
                {selectionMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCategoryManager(!showCategoryManager)}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {showCategoryManager ? 'Hide Categories' : 'Manage Categories'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <div className="p-0">
                  <ReportActions
                    variant="compact"
                    headers={['Title', 'Priority', 'Status', 'Due Date', 'Category']}
                    rows={tasks.map(t => [t.title, t.priority || '', t.status || '', t.due_date || '', categories.find(c => c.id === t.category_id)?.name || ''])}
                    filename={`lifeos-tasks-${new Date().toISOString().split('T')[0]}`}
                    title="Tasks Report"
                    summaryCards={[
                      { label: 'Total', value: tasks.length },
                      { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length },
                      { label: 'Active', value: tasks.filter(t => t.status !== 'completed').length },
                    ]}
                  />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="p-0">
                  <DataExportImportButton preset="tasks" />
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px] md:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Support User Filter - Office Mode Only */}
        {mode === 'office' && allSupportUsers.length > 0 && (
          <Select value={supportUserFilter} onValueChange={setSupportUserFilter}>
            <SelectTrigger className="w-[140px] md:w-[220px]">
              <SelectValue placeholder="Support User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Support Users</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {allSupportUsers.map((su) => (
                <SelectItem key={su.id} value={su.id}>
                  <div className="flex flex-col">
                    <span>{su.name}</span>
                    <span className="text-xs text-muted-foreground">{su.unit_name} → {su.department_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {showCategoryManager && (
        <TaskCategoryManager />
      )}

      {/* Pending Task Assignments */}
      <PendingTaskAssignments onAccepted={() => loadData(0, true)} />

      {/* Outgoing Task Assignments */}
      <OutgoingTaskAssignments />

      {/* Assignment History */}
      <TaskAssignmentHistory />

      {viewMode === 'kanban' ? (
        <TaskKanbanBoard
          tasks={filteredTasks}
          categories={categories}
          priorityColors={priorityColors}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMove={handleMove}
          onAssign={handleAssign}
          onStatusChange={handleKanbanStatusChange}
        />
      ) : (
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <Card className={surfaceCardClass}>
            <CardContent className="py-12 text-center">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('tasks.noTasksYet')}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {selectionMode && selectedTaskIds.length > 0 && (
              <BulkCategoryAssign
                selectedTaskIds={selectedTaskIds}
                categories={categories}
                onComplete={() => {
                  setSelectedTaskIds([]);
                  setSelectionMode(false);
                  loadData(0, true);
                }}
                onCancel={() => {
                  setSelectedTaskIds([]);
                  setSelectionMode(false);
                }}
              />
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {filteredTasks.map((task) => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    checklists={checklists[task.id] || []}
                    categories={categories}
                    supportUserInfo={task.support_user_id ? supportUserInfoMap[task.support_user_id] : undefined}
                    onToggle={toggleTask}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    onAssign={handleAssign}
                    onAiBreakdown={handleAiBreakdown}
                    onChecklistUpdate={() => loadData(0, true)}
                    priorityColors={priorityColors}
                    selectionMode={selectionMode}
                    isSelected={selectedTaskIds.includes(task.id)}
                    onSelectionChange={(id, selected) => {
                      setSelectedTaskIds(prev => 
                        selected ? [...prev, id] : prev.filter(tid => tid !== id)
                      );
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {hasMore && (
              <div className="pt-4 text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                required
              />
            </div>
            <FieldVisibility entityType="task" fieldName="description">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Add details..."
                  rows={3}
                />
              </div>
            </FieldVisibility>
            <div className="grid grid-cols-2 gap-4">
              <FieldVisibility entityType="task" fieldName="priority">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData((f) => ({ ...f, priority: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FieldVisibility>
              <FieldVisibility entityType="task" fieldName="category_id">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) => setFormData((f) => ({ ...f, category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FieldVisibility>
            </div>
            {mode === 'office' && (
              <FieldVisibility entityType="task" fieldName="support_user_id">
                <div className="space-y-2">
                  <Label>Support User</Label>
                  <Select
                    value={formData.support_user_id}
                    onValueChange={(v) => setFormData((f) => ({ ...f, support_user_id: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select support user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Support User</SelectItem>
                      {allSupportUsers.map((sUser) => (
                        <SelectItem key={sUser.id} value={sUser.id}>
                          <div className="flex flex-col">
                            <span>{sUser.name}</span>
                            <span className="text-xs text-muted-foreground">{sUser.unit_name} → {sUser.department_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FieldVisibility>
            )}
            <FieldVisibility entityType="task" fieldName="due_date">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </FieldVisibility>
            <FieldVisibility entityType="task" fieldName="is_recurring">
              <RecurringEventForm
                isRecurring={formData.is_recurring}
                onIsRecurringChange={(v) => setFormData((f) => ({ ...f, is_recurring: v }))}
                recurringPattern={formData.recurring_pattern}
                onRecurringPatternChange={(v) => setFormData((f) => ({ ...f, recurring_pattern: v }))}
              />
            </FieldVisibility>
            {editingTask && (
              <FieldVisibility entityType="task" fieldName="follow_up_date">
                <TaskFollowUp
                  taskId={editingTask.id}
                  needsFollowUp={formData.needs_follow_up}
                  followUpDate={formData.follow_up_date || null}
                  onUpdate={(data) => setFormData((f) => ({
                    ...f,
                    needs_follow_up: data.needs_follow_up,
                    follow_up_date: data.follow_up_date || '',
                  }))}
                />
              </FieldVisibility>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      {assigningTask && (
        <TaskAssignDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          taskId={assigningTask.id}
          taskTitle={assigningTask.title}
          onAssigned={() => {
            toast.success('Task assigned successfully');
          }}
        />
      )}
    </div>
  );
}
