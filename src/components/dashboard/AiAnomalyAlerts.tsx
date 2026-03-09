import { useState } from 'react';
import { ShieldAlert, Loader2, RefreshCw, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAiAssist } from '@/hooks/useAiAssist';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { AiIndicator } from '@/components/shared/AiIndicator';

interface Anomaly {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category?: string;
}

const severityConfig = {
  low: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  medium: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  high: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
};

export function AiAnomalyAlerts() {
  const { user } = useAuth();
  const { callAi, loading, config, isAvailable } = useAiAssist();
  const { language } = useLanguage();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [fetched, setFetched] = useState(false);

  const fetchAnomalies = async () => {
    if (!user) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [transThisMonth, transLastMonth, tasksRes] = await Promise.all([
      supabase.from('transactions').select('id,type,amount,category_id').eq('user_id', user.id).gte('date', startOfMonth),
      supabase.from('transactions').select('id,type,amount,category_id').eq('user_id', user.id).gte('date', lastMonth).lte('date', endOfLastMonth),
      supabase.from('tasks').select('id,status,due_date,priority').eq('user_id', user.id),
    ]);

    const thisMonth = transThisMonth.data || [];
    const prevMonth = transLastMonth.data || [];
    const tasks = tasksRes.data || [];

    const context = {
      this_month_expense: thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      this_month_income: thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      last_month_expense: prevMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      last_month_income: prevMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      this_month_transaction_count: thisMonth.length,
      last_month_transaction_count: prevMonth.length,
      overdue_tasks: tasks.filter(t => t.due_date && t.due_date < now.toISOString() && t.status !== 'completed').length,
      high_priority_overdue: tasks.filter(t => t.due_date && t.due_date < now.toISOString() && t.status !== 'completed' && (t.priority === 'high' || t.priority === 'urgent')).length,
      total_pending: tasks.filter(t => t.status !== 'completed').length,
    };

    const result = await callAi('anomaly_detection', context);
    if (result?.content) {
      try {
        const parsed = JSON.parse(result.content);
        setAnomalies(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
      } catch {
        setAnomalies([{ title: 'AI Alert', description: result.content, severity: 'low' }]);
      }
    }
    setFetched(true);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            {language === 'bn' ? 'অ্যানোমালি অ্যালার্ট' : 'Anomaly Alerts'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <AiIndicator variant="dot" loading={loading} provider={config?.provider} unavailable={!isAvailable} />
            {fetched && isAvailable && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchAnomalies} disabled={loading}>
                <RefreshCw className="h-3 w-3" />
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
        ) : !fetched && !loading ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {language === 'bn' ? 'আপনার ডেটায় অস্বাভাবিক প্যাটার্ন শনাক্ত করুন' : 'Detect unusual patterns in your data'}
            </p>
            <Button variant="outline" size="sm" onClick={fetchAnomalies}>
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
              {language === 'bn' ? 'স্ক্যান করুন' : 'Scan for Anomalies'}
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              {language === 'bn' ? 'বিশ্লেষণ করা হচ্ছে...' : 'Scanning your data...'}
            </span>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-green-500 font-medium">✓ {language === 'bn' ? 'কোনো অস্বাভাবিকতা পাওয়া যায়নি' : 'No anomalies detected'}</p>
            <p className="text-xs text-muted-foreground mt-1">{language === 'bn' ? 'সবকিছু স্বাভাবিক দেখাচ্ছে' : 'Everything looks normal'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a, i) => {
              const sev = severityConfig[a.severity] || severityConfig.low;
              const Icon = sev.icon;
              return (
                <div key={i} className={`p-3 rounded-lg border ${sev.bg} transition-colors`}>
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${sev.color}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
