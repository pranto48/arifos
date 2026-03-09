import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiIndicator } from '@/components/shared/AiIndicator';
import { useAiAssist } from '@/hooks/useAiAssist';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Loader2, Send, CheckCircle, Calendar, Flag } from 'lucide-react';

interface ParsedTask {
  title: string;
  description?: string;
  priority: string;
  due_date?: string;
  category_name?: string;
  is_recurring?: boolean;
  recurring_pattern?: string;
}

export function NaturalLanguageInput() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const { callAi, loading, config, getRemainingCalls, isAvailable } = useAiAssist();
  const { categories } = useTaskCategories();
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) return;
    const data = await callAi('natural_language_task', {
      input: input.trim(),
      categories: categories.map(c => ({ id: c.id, name: c.name })),
    });
    if (data?.content) {
      setParsed(data.content as ParsedTask);
    }
  };

  const handleCreate = async () => {
    if (!parsed || !user) return;
    setSaving(true);
    try {
      // Match category by name
      const matchedCat = categories.find(c =>
        c.name.toLowerCase() === (parsed.category_name || '').toLowerCase()
      );

      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: parsed.title,
        description: parsed.description || null,
        priority: parsed.priority || 'medium',
        due_date: parsed.due_date || null,
        category_id: matchedCat?.id || null,
        status: 'todo',
        task_type: mode,
        is_recurring: parsed.is_recurring || false,
        recurring_pattern: parsed.is_recurring ? parsed.recurring_pattern : null,
      });

      if (error) throw error;

      toast({ title: language === 'bn' ? 'কাজ তৈরি হয়েছে!' : 'Task created!' });
      window.dispatchEvent(new CustomEvent('tasks-updated'));
      setInput('');
      setParsed(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (parsed) handleCreate();
      else handleParse();
    }
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-primary/10 text-primary',
    high: 'bg-destructive/10 text-destructive',
    urgent: 'bg-destructive text-destructive-foreground',
  };

  const examples = language === 'bn'
    ? ['"আগামী শুক্রবার বাজেট রিভিউ করতে হবে"', '"প্রতি সোমবার মিটিং নোট তৈরি করো"']
    : ['"Review budget next Friday"', '"Create weekly meeting notes every Monday"', '"Urgent: Fix login bug by tomorrow"'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'প্রাকৃতিক ভাষায় কাজ তৈরি' : 'Natural Language Task'}
          </CardTitle>
          <AiIndicator provider={config?.provider} remaining={getRemainingCalls()} loading={loading} unavailable={!isAvailable} />
        </div>
        <p className="text-sm text-muted-foreground">
          {language === 'bn' ? 'সাধারণ ভাষায় কাজ যোগ করুন' : 'Add tasks using natural language'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => { setInput(e.target.value); setParsed(null); }}
            onKeyDown={handleKeyDown}
            placeholder={language === 'bn' ? 'যেমন: "আগামীকাল বাজেট রিভিউ করো"' : 'e.g. "Review budget next Friday with high priority"'}
            className="flex-1"
            disabled={loading || !isAvailable}
          />
          <Button onClick={parsed ? handleCreate : handleParse} disabled={loading || saving || !input.trim() || !isAvailable}>
            {loading || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : parsed ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {!parsed && !loading && (
          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer hover:bg-muted transition-colors text-xs"
                onClick={() => { setInput(ex.replace(/"/g, '')); setParsed(null); }}
              >
                {ex}
              </Badge>
            ))}
          </div>
        )}

        {/* Parsed preview */}
        {parsed && (
          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{parsed.title}</span>
              <Badge className={priorityColors[parsed.priority] || 'bg-muted'}>
                <Flag className="h-3 w-3 mr-1" />{parsed.priority}
              </Badge>
            </div>
            {parsed.description && <p className="text-sm text-muted-foreground">{parsed.description}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {parsed.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{parsed.due_date}
                </span>
              )}
              {parsed.category_name && <Badge variant="outline" className="text-xs">{parsed.category_name}</Badge>}
              {parsed.is_recurring && <Badge variant="outline" className="text-xs">{parsed.recurring_pattern}</Badge>}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                {language === 'bn' ? 'কাজ তৈরি করুন' : 'Create Task'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setParsed(null)}>
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
