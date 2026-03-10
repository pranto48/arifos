import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAiAssist } from '@/hooks/useAiAssist';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { AiIndicator } from '@/components/shared/AiIndicator';
import { useNavigate } from 'react-router-dom';

interface Suggestion {
  title: string;
  description: string;
  action?: string;
  link?: string;
}

const STORAGE_KEY = 'lifeos_smart_suggestions';

function loadCachedSuggestions(): Suggestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSuggestions(suggestions: Suggestion[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suggestions));
  } catch {}
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

export function AiSmartSuggestions() {
  const { user } = useAuth();
  const { callAi, loading, config, isAvailable } = useAiAssist();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>(loadCachedSuggestions);
  const hasCached = suggestions.length > 0;

  const fetchSuggestions = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [tasksRes, goalsRes, transRes] = await Promise.all([
      supabase.from('tasks').select('id,status,priority,due_date').eq('user_id', user.id),
      supabase.from('goals').select('id,status,current_amount,target_amount').eq('user_id', user.id).in('status', ['active', 'in_progress']),
      supabase.from('transactions').select('id,type,amount').eq('user_id', user.id).gte('date', startOfMonth),
    ]);

    const tasks = tasksRes.data || [];
    const goals = goalsRes.data || [];
    const transactions = transRes.data || [];

    const context = {
      total_tasks: tasks.length,
      completed_tasks: tasks.filter(t => t.status === 'completed').length,
      overdue_tasks: tasks.filter(t => t.due_date && t.due_date < new Date().toISOString() && t.status !== 'completed').length,
      high_priority_pending: tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'completed').length,
      active_goals: goals.length,
      goals_near_target: goals.filter(g => g.target_amount && g.current_amount && (g.current_amount / g.target_amount) > 0.8).length,
      monthly_income: transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      monthly_expense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      today,
    };

    const result = await callAi('smart_suggestions', context);
    if (result?.content) {
      let parsed: Suggestion[] = [];
      try {
        const raw = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
        const cleaned = stripMarkdown(raw);
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        const jsonStr = start !== -1 && end !== -1 ? cleaned.substring(start, end + 1) : cleaned;
        const data = JSON.parse(jsonStr);
        parsed = Array.isArray(data) ? data.slice(0, 4) : [];
      } catch {
        const cleanText = stripMarkdown(
          typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
        );
        parsed = [{ title: language === 'bn' ? 'AI ইনসাইট' : 'AI Insight', description: cleanText }];
      }
      setSuggestions(parsed);
      saveSuggestions(parsed);
    }
  };

  const linkMap: Record<string, string> = {
    tasks: '/tasks',
    goals: '/goals',
    budget: '/budget',
    notes: '/notes',
    habits: '/habits',
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {language === 'bn' ? 'স্মার্ট সাজেশন' : 'Smart Suggestions'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <AiIndicator variant="dot" loading={loading} provider={config?.provider} unavailable={!isAvailable} />
            {isAvailable && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchSuggestions} disabled={loading} title={language === 'bn' ? 'আবার তৈরি করুন' : 'Regenerate'}>
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isAvailable ? (
          <div className="flex flex-col items-center py-6 gap-2">
            <AiIndicator variant="inline" unavailable />
            <p className="text-xs text-muted-foreground text-center">
              {language === 'bn' ? 'AI ফিচার সেলফ-হোস্টেড মোডে পাওয়া যায় না' : 'AI features are not available in self-hosted mode'}
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              {language === 'bn' ? 'বিশ্লেষণ করা হচ্ছে...' : 'Analyzing your data...'}
            </span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {language === 'bn' ? 'আপনার কার্যকলাপের উপর ভিত্তি করে AI সাজেশন পান' : 'Get AI-powered suggestions based on your activity'}
            </p>
            <Button variant="outline" size="sm" onClick={fetchSuggestions}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {language === 'bn' ? 'সাজেশন তৈরি করুন' : 'Generate Suggestions'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => s.link && linkMap[s.link] && navigate(linkMap[s.link])}
              >
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                {s.link && linkMap[s.link] && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {s.action || 'Go'} <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
