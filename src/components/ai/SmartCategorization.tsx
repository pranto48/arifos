import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AiIndicator } from '@/components/shared/AiIndicator';
import { useAiAssist } from '@/hooks/useAiAssist';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tags, Loader2, Sparkles, CheckCheck } from 'lucide-react';

interface CategoryAssignment {
  task_id: string;
  category_id: string;
  confidence: number;
  reason?: string;
}

export function SmartCategorization() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { callAi, loading, config, getRemainingCalls, isAvailable } = useAiAssist();
  const { categories } = useTaskCategories();
  const [assignments, setAssignments] = useState<(CategoryAssignment & { task_title?: string; category_name?: string })[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!user) return;

    // Fetch uncategorized tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, priority')
      .eq('user_id', user.id)
      .is('category_id', null)
      .limit(20);

    if (!tasks?.length) {
      toast({ title: language === 'bn' ? 'সব কাজ ইতিমধ্যে শ্রেণীবদ্ধ' : 'All tasks are already categorized' });
      return;
    }

    const data = await callAi('smart_categorize', {
      tasks: tasks.map(t => ({ id: t.id, title: t.title, description: t.description, priority: t.priority })),
      categories: categories.map(c => ({ id: c.id, name: c.name })),
    });

    if (data?.content?.assignments) {
      const enriched = data.content.assignments.map((a: CategoryAssignment) => ({
        ...a,
        task_title: tasks.find(t => t.id === a.task_id)?.title,
        category_name: categories.find(c => c.id === a.category_id)?.name,
      }));
      setAssignments(enriched);
      setSelected(new Set(enriched.map((a: any) => a.task_id)));
      setAnalyzed(true);
    }
  };

  const handleApply = async () => {
    const toApply = assignments.filter(a => selected.has(a.task_id));
    if (!toApply.length) return;

    setApplying(true);
    try {
      let applied = 0;
      for (const a of toApply) {
        const { error } = await supabase.from('tasks').update({ category_id: a.category_id }).eq('id', a.task_id);
        if (!error) applied++;
      }
      toast({
        title: language === 'bn' ? `${applied}টি কাজ শ্রেণীবদ্ধ হয়েছে` : `${applied} tasks categorized`,
      });
      window.dispatchEvent(new CustomEvent('tasks-updated'));
      setAssignments([]);
      setSelected(new Set());
      setAnalyzed(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'স্মার্ট শ্রেণীবিভাগ' : 'Smart Categorization'}
          </CardTitle>
          <AiIndicator provider={config?.provider} remaining={getRemainingCalls()} loading={loading} unavailable={!isAvailable} />
        </div>
        <p className="text-sm text-muted-foreground">
          {language === 'bn' ? 'AI দিয়ে কাজগুলো স্বয়ংক্রিয়ভাবে শ্রেণীবদ্ধ করুন' : 'Auto-categorize uncategorized tasks using AI'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analyzed ? (
          <Button onClick={handleAnalyze} disabled={loading || !isAvailable} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {language === 'bn' ? 'বিশ্লেষণ করুন' : 'Analyze & Suggest Categories'}
          </Button>
        ) : (
          <>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {language === 'bn' ? 'কোনো সাজেশন নেই' : 'No suggestions available'}
              </p>
            ) : (
              <>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {assignments.map(a => (
                      <div key={a.task_id} className="flex items-center gap-3 p-2 rounded-md border border-border hover:bg-muted/30">
                        <Checkbox
                          checked={selected.has(a.task_id)}
                          onCheckedChange={() => toggleTask(a.task_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.task_title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">{a.category_name}</Badge>
                            <span className="text-xs text-muted-foreground">{Math.round(a.confidence * 100)}%</span>
                          </div>
                          {a.reason && <p className="text-xs text-muted-foreground mt-0.5">{a.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Button onClick={handleApply} disabled={applying || selected.size === 0} className="flex-1">
                    {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-2" />}
                    {language === 'bn' ? `${selected.size}টি প্রয়োগ করুন` : `Apply ${selected.size} suggestions`}
                  </Button>
                  <Button variant="ghost" onClick={() => { setAnalyzed(false); setAssignments([]); }}>
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
