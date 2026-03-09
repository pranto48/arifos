import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AiIndicator } from '@/components/shared/AiIndicator';
import { useAiAssist } from '@/hooks/useAiAssist';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Brain, Loader2, TrendingUp, AlertTriangle, Info, Target, Wallet, Clock } from 'lucide-react';

interface Prediction {
  title: string;
  description: string;
  category: 'deadline' | 'budget' | 'productivity' | 'goal';
  confidence: number;
  severity: 'info' | 'warning' | 'critical';
  suggested_action?: string;
}

export function PredictiveInsights() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { callAi, loading, config, getRemainingCalls, isAvailable } = useAiAssist();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!user) return;

    // Gather data for analysis
    const [tasksRes, goalsRes, transactionsRes] = await Promise.all([
      supabase.from('tasks').select('title, status, priority, due_date, created_at, completed_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('goals').select('title, status, target_date, target_amount, current_amount').eq('user_id', user.id).limit(20),
      supabase.from('transactions').select('amount, type, date, merchant').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
    ]);

    const context = {
      tasks: tasksRes.data || [],
      goals: goalsRes.data || [],
      transactions: transactionsRes.data || [],
      today: new Date().toISOString().split('T')[0],
    };

    const data = await callAi('predictive_insights', context);
    if (data?.content?.predictions) {
      setPredictions(data.content.predictions);
      setAnalyzed(true);
    }
  };

  const categoryIcons: Record<string, any> = {
    deadline: Clock,
    budget: Wallet,
    productivity: TrendingUp,
    goal: Target,
  };

  const severityStyles: Record<string, string> = {
    info: 'border-primary/30 bg-primary/5',
    warning: 'border-accent/30 bg-accent/5',
    critical: 'border-destructive/30 bg-destructive/5',
  };

  const severityBadge: Record<string, string> = {
    info: 'bg-primary/10 text-primary',
    warning: 'bg-accent/10 text-accent-foreground',
    critical: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'ভবিষ্যদ্বাণীমূলক অন্তর্দৃষ্টি' : 'Predictive Insights'}
          </CardTitle>
          <AiIndicator provider={config?.provider} remaining={getRemainingCalls()} loading={loading} unavailable={!isAvailable} />
        </div>
        <p className="text-sm text-muted-foreground">
          {language === 'bn' ? 'AI-চালিত পূর্বাভাস ও সতর্কতা' : 'AI-powered forecasts for deadlines, budgets & goals'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleAnalyze} disabled={loading || !isAvailable} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
          {analyzed
            ? (language === 'bn' ? 'পুনরায় বিশ্লেষণ' : 'Re-analyze')
            : (language === 'bn' ? 'বিশ্লেষণ শুরু করুন' : 'Generate Predictions')}
        </Button>

        {analyzed && predictions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {language === 'bn' ? 'বর্তমানে কোনো পূর্বাভাস নেই' : 'No predictions at this time. Everything looks on track!'}
          </p>
        )}

        {predictions.length > 0 && (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {predictions.map((p, i) => {
                const Icon = categoryIcons[p.category] || Info;
                return (
                  <div key={i} className={`p-3 rounded-lg border ${severityStyles[p.severity] || ''}`}>
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5 shrink-0 text-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{p.title}</span>
                          <Badge className={`text-xs ${severityBadge[p.severity] || ''}`}>
                            {p.severity === 'critical' ? (language === 'bn' ? 'জরুরি' : 'Critical')
                              : p.severity === 'warning' ? (language === 'bn' ? 'সতর্কতা' : 'Warning')
                              : (language === 'bn' ? 'তথ্য' : 'Info')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{Math.round(p.confidence * 100)}%</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                        {p.suggested_action && (
                          <p className="text-xs mt-2 font-medium text-primary">
                            💡 {p.suggested_action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
