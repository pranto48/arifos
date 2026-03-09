import { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2, ArrowRightLeft, UserPlus, Flag, FolderOpen, CalendarClock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

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

interface TaskCategory {
  id: string;
  name: string;
  color: string;
}

interface KanbanCardProps {
  task: Task;
  categories: TaskCategory[];
  priorityColors: Record<string, string>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, currentType: string) => void;
  onAssign: (task: Task) => void;
}

function KanbanCard({ task, categories, priorityColors, onEdit, onDelete, onMove, onAssign }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id,
    data: { status: task.status }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const category = categories.find(c => c.id === task.category_id);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card border-border hover:border-primary/30 transition-colors cursor-grab active:cursor-grabbing shadow-sm"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-sm font-medium leading-tight ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(task.id, task.task_type)}>
                <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                Move to {task.task_type === 'office' ? 'Personal' : 'Office'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAssign(task)}>
                <UserPlus className="h-3.5 w-3.5 mr-2" /> Assign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1">
          {task.priority && (
            <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority] || 'bg-muted text-muted-foreground'}`}>
              {task.priority}
            </Badge>
          )}
          {task.due_date && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
              <CalendarClock className="h-2.5 w-2.5" />
              {format(new Date(task.due_date), 'MMM d')}
            </Badge>
          )}
          {category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5" style={{ borderColor: category.color, color: category.color }}>
              <FolderOpen className="h-2.5 w-2.5" />
              {category.name}
            </Badge>
          )}
          {task.needs_follow_up && (
            <Flag className="h-3 w-3 text-amber-500" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DroppableColumnProps {
  id: string;
  title: string;
  count: number;
  colorClass: string;
  children: React.ReactNode;
}

function DroppableColumn({ id, title, count, colorClass, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border bg-muted/20 min-h-[300px] transition-colors ${isOver ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colorClass}`} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
        {children}
      </div>
    </div>
  );
}

interface TaskKanbanBoardProps {
  tasks: Task[];
  categories: TaskCategory[];
  priorityColors: Record<string, string>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, currentType: string) => void;
  onAssign: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export function TaskKanbanBoard({ tasks, categories, priorityColors, onEdit, onDelete, onMove, onAssign, onStatusChange }: TaskKanbanBoardProps) {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = [
    { id: 'todo', title: 'To Do', colorClass: 'bg-blue-500' },
    { id: 'in_progress', title: 'In Progress', colorClass: 'bg-yellow-500' },
    { id: 'completed', title: 'Completed', colorClass: 'bg-green-500' },
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => {
      const taskStatus = t.status || 'todo';
      return taskStatus === status;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = columns.find(c => c.id === overId);
    if (targetColumn) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== targetColumn.id) {
        onStatusChange(taskId, targetColumn.id);
      }
      return;
    }

    // Check if dropped on another task - get that task's status
    const targetTask = tasks.find(t => t.id === overId);
    if (targetTask) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== targetTask.status) {
        onStatusChange(taskId, targetTask.status || 'todo');
      }
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <DroppableColumn
              key={column.id}
              id={column.id}
              title={column.title}
              count={columnTasks.length}
              colorClass={column.colorClass}
            >
              <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {columnTasks.map(task => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    categories={categories}
                    priorityColors={priorityColors}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                    onAssign={onAssign}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                    Drop tasks here
                  </div>
                )}
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <Card className="bg-card border-primary shadow-lg rotate-2 w-64">
            <CardContent className="p-3">
              <p className="text-sm font-medium text-foreground">{activeTask.title}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
