import { Clock, Trash2, Tag, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimeEntry, formatDuration } from '@/hooks/useTimeTracking';

interface TimeEntryListProps {
  entries: TimeEntry[];
  tasks: { id: string; title: string }[];
  projects: { id: string; title: string }[];
  onDelete: (id: string) => void;
}

export function TimeEntryList({ entries, tasks, projects, onDelete }: TimeEntryListProps) {
  const { language } = useLanguage();

  const getTaskName = (taskId: string | null) => tasks.find(t => t.id === taskId)?.title;
  const getProjectName = (projectId: string | null) => projects.find(p => p.id === projectId)?.title;

  // Group entries by date
  const grouped: Record<string, TimeEntry[]> = {};
  entries.forEach(e => {
    const date = format(new Date(e.start_time), 'yyyy-MM-dd');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(e);
  });

  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {language === 'bn' ? 'সাম্প্রতিক এন্ট্রি' : 'Recent Entries'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {language === 'bn' ? 'কোনো টাইম এন্ট্রি নেই' : 'No time entries yet'}
          </p>
        ) : (
          <div className="space-y-4">
            {dateKeys.map(date => {
              const dayEntries = grouped[date];
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {format(new Date(date), 'EEE, MMM d')}
                    </span>
                    <span className="text-xs font-mono text-primary">
                      {formatDuration(dayTotal)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dayEntries.map(entry => {
                      const taskName = getTaskName(entry.task_id);
                      const projectName = getProjectName(entry.project_id);
                      return (
                        <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                          <div className={`w-1 h-8 rounded-full ${
                            entry.entry_type === 'pomodoro' ? 'bg-red-500' :
                            entry.entry_type === 'timer' ? 'bg-primary' : 'bg-muted-foreground'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {taskName && (
                                <span className="text-sm font-medium text-foreground truncate">{taskName}</span>
                              )}
                              {projectName && (
                                <Badge variant="outline" className="text-[10px] gap-0.5 h-4">
                                  <Briefcase className="h-2.5 w-2.5" />
                                  {projectName}
                                </Badge>
                              )}
                              {!taskName && !projectName && (
                                <span className="text-sm text-muted-foreground italic">
                                  {language === 'bn' ? 'সাধারণ সেশন' : 'General session'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {format(new Date(entry.start_time), 'HH:mm')}
                                {entry.end_time && ` - ${format(new Date(entry.end_time), 'HH:mm')}`}
                              </span>
                              {entry.notes && <span className="truncate">• {entry.notes}</span>}
                            </div>
                          </div>
                          <span className="font-mono text-sm font-medium text-foreground whitespace-nowrap">
                            {formatDuration(entry.duration_seconds || 0)}
                          </span>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => onDelete(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
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
