import { useState } from 'react';
import { Sparkles, Loader2, Plus, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useAiAssist } from '@/hooks/useAiAssist';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { AiIndicator } from '@/components/shared/AiIndicator';
import { toast } from 'sonner';

interface Subtask {
  title: string;
  reason?: string;
  priority?: string;
}

interface AiTaskBreakdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  onSubtasksAdded: () => void;
}

const priorityBadgeColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

export function AiTaskBreakdown({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  taskDescription,
  onSubtasksAdded,
}: AiTaskBreakdownProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { callAi, loading, isAvailable, config, getRemainingCalls } = useAiAssist();

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [overview, setOverview] = useState('');
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    const data = await callAi('task_breakdown', {
      title: taskTitle,
      description: taskDescription,
      today: new Date().toISOString().split('T')[0],
    });

    if (!data) {
      toast.error('Failed to generate breakdown');
      return;
    }

    const fetchedSubtasks: Subtask[] = data.content?.subtasks ?? [];
    const fetchedOverview: string = data.content?.overview ?? '';

    setSubtasks(fetchedSubtasks);
    setOverview(fetchedOverview);
    setSelected(new Set(fetchedSubtasks.map((_, i) => i)));
    setGenerated(true);
  };

  const handleAddSelected = async () => {
    if (!user || selected.size === 0) return;
    setSaving(true);

    try {
      const selectedArray = Array.from(selected);
      await Promise.all(
        selectedArray.map((i) => {
          const subtask = subtasks[i];
          return supabase.from('task_checklists').insert({
            task_id: taskId,
            user_id: user.id,
            title: subtask.title,
            sort_order: i,
            is_completed: false,
          });
        })
      );

      toast.success(`${selected.size} subtask${selected.size !== 1 ? 's' : ''} added`);
      onSubtasksAdded();
      onOpenChange(false);

      // Reset state
      setSubtasks([]);
      setSelected(new Set());
      setOverview('');
      setGenerated(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add subtasks');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAll = () => {
    if (selected.size === subtasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(subtasks.map((_, i) => i)));
    }
  };

  const handleToggleOne = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setSubtasks([]);
      setSelected(new Set());
      setOverview('');
      setGenerated(false);
    }
    onOpenChange(val);
  };

  const remaining = getRemainingCalls();
  const isAllSelected = subtasks.length > 0 && selected.size === subtasks.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'AI কাজ বিভাজন' : 'AI Task Breakdown'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task title row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 rounded-md bg-muted/50 px-3 py-2">
              <p className="text-sm font-medium text-foreground truncate">{taskTitle}</p>
            </div>
            <AiIndicator
              variant="badge"
              loading={loading}
              provider={config?.provider}
              remaining={remaining}
              unavailable={!isAvailable}
            />
          </div>

          {/* Offline message */}
          {!isAvailable && (
            <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground text-center">
              AI features are not available in self-hosted mode.
            </div>
          )}

          {/* Generate button — only before generation, when available and not loading */}
          {!generated && isAvailable && !loading && (
            <Button
              className="w-full gap-2"
              onClick={handleGenerate}
            >
              <Sparkles className="h-4 w-4" />
              {language === 'bn' ? 'ব্রেকডাউন তৈরি করুন' : 'Generate Breakdown'}
            </Button>
          )}

          {/* Skeleton loader */}
          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-md bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Generated subtasks */}
          {generated && !loading && (
            <div className="space-y-3">
              {/* Overview */}
              {overview && (
                <p className="text-sm text-muted-foreground italic">{overview}</p>
              )}

              {/* Header row */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {language === 'bn' ? 'যোগ করার জন্য সাবটাস্ক নির্বাচন করুন:' : 'Select subtasks to add:'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-xs text-primary hover:underline focus:outline-none"
                >
                  {isAllSelected
                    ? (language === 'bn' ? 'সব বাতিল করুন' : 'Deselect All')
                    : (language === 'bn' ? 'সব নির্বাচন করুন' : 'Select All')}
                </button>
              </div>

              {/* Subtask list */}
              <ScrollArea className="max-h-[260px] pr-1">
                <div className="space-y-1.5">
                  {subtasks.map((subtask, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                        selected.has(i)
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-muted/20 hover:bg-muted/40'
                      }`}
                      onClick={() => handleToggleOne(i)}
                    >
                      <Checkbox
                        checked={selected.has(i)}
                        onCheckedChange={() => handleToggleOne(i)}
                        className="mt-0.5 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground leading-snug">
                            {subtask.title}
                          </span>
                          {subtask.priority && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 h-4 ${priorityBadgeColors[subtask.priority.toLowerCase()] ?? 'bg-muted text-muted-foreground'}`}
                            >
                              {subtask.priority}
                            </Badge>
                          )}
                        </div>
                        {subtask.reason && (
                          <p className="text-xs text-muted-foreground leading-snug">
                            {subtask.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Selected count */}
              <p className="text-xs text-muted-foreground text-right">
                {selected.size} {language === 'bn' ? 'এর মধ্যে' : 'of'} {subtasks.length}{' '}
                {language === 'bn' ? 'নির্বাচিত' : 'selected'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={saving}
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={handleAddSelected}
            disabled={selected.size === 0 || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {language === 'bn'
              ? `${selected.size}টি সাবটাস্ক যোগ করুন`
              : `Add ${selected.size} Subtask${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
