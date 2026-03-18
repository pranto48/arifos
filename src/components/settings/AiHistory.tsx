import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Bot, Filter, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AiUsageLogRow {
  id: string;
  user_id?: string;
  action_type: string;
  input_summary: string | null;
  result_summary: string | null;
  source: 'web' | 'docker';
  created_at: string;
}

export function AiHistory() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [logs, setLogs] = useState<AiUsageLogRow[]>([]);
  const [actionType, setActionType] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      if (isSelfHosted()) {
        const data = await selfHostedApi.selectAll('ai_usage_log');
        const scopedRows = (data as AiUsageLogRow[])
          .filter((row: any) => row.user_id === user.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 300);
        setLogs(scopedRows);
        return;
      }

      const { data } = await supabase
        .from('ai_usage_log')
        .select('id,action_type,input_summary,result_summary,source,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300);
      setLogs((data as AiUsageLogRow[]) || []);
    };

    load();
  }, [user?.id]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (actionType !== 'all' && log.action_type !== actionType) return false;
      const created = new Date(log.created_at);
      if (fromDate && created < new Date(`${fromDate}T00:00:00`)) return false;
      if (toDate && created > new Date(`${toDate}T23:59:59`)) return false;
      return true;
    });
  }, [logs, actionType, fromDate, toDate]);

  const actionTypes = Array.from(new Set(logs.map((l) => l.action_type)));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          {language === 'bn' ? 'AI ইতিহাস' : 'AI History'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {language === 'bn' ? 'AI একশনগুলোর টাইমলাইন, ফিল্টারসহ।' : 'Chronological timeline of AI actions with filters.'}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Filter className="h-3 w-3" />Action Type</p>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">From</p>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">To</p>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {language === 'bn' ? 'কোনো AI history পাওয়া যায়নি।' : 'No AI history found.'}
            </CardContent>
          </Card>
        ) : (
          filtered.map((log) => (
            <Card key={log.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><Bot className="h-4 w-4" />{log.action_type}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.source}</Badge>
                    <span className="text-xs font-normal text-muted-foreground">{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Input:</span> {log.input_summary || '-'}</p>
                <p><span className="text-muted-foreground">Result:</span> {log.result_summary || '-'}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
