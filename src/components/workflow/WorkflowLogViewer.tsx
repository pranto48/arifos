import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, CheckCircle, XCircle } from 'lucide-react';
import { WorkflowLog } from '@/hooks/useWorkflowAutomation';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';

interface Props {
  logs: WorkflowLog[];
}

export function WorkflowLogViewer({ logs }: Props) {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        {language === 'bn' ? 'এক্সিকিউশন লগ' : 'Execution Log'}
      </h3>

      {logs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{language === 'bn' ? 'এখনো কোনো লগ নেই।' : 'No execution logs yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {logs.map(log => (
              <Card key={log.id}>
                <CardContent className="py-2 px-4 flex items-center gap-3">
                  {log.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-destructive mt-0.5 truncate">{log.error_message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
