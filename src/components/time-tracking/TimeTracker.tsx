import { useState } from 'react';
import { Play, Square, Clock, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimeEntry, formatDurationShort, formatDuration } from '@/hooks/useTimeTracking';

interface TimeTrackerProps {
  activeEntry: TimeEntry | null;
  elapsed: number;
  tasks: { id: string; title: string }[];
  projects: { id: string; title: string }[];
  onStart: (opts?: { taskId?: string; projectId?: string; entryType?: string }) => void;
  onStop: () => void;
  onAddManual: (entry: { taskId?: string; projectId?: string; startTime: string; endTime: string; notes?: string }) => void;
}

export function TimeTracker({ activeEntry, elapsed, tasks, projects, onStart, onStop, onAddManual }: TimeTrackerProps) {
  const { language } = useLanguage();
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    taskId: '', projectId: '', startTime: '', endTime: '', notes: '',
  });

  const handleStart = () => {
    onStart({
      taskId: selectedTask || undefined,
      projectId: selectedProject || undefined,
    });
  };

  const handleManualSubmit = () => {
    onAddManual({
      taskId: manualForm.taskId || undefined,
      projectId: manualForm.projectId || undefined,
      startTime: manualForm.startTime,
      endTime: manualForm.endTime,
      notes: manualForm.notes || undefined,
    });
    setManualOpen(false);
    setManualForm({ taskId: '', projectId: '', startTime: '', endTime: '', notes: '' });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {language === 'bn' ? 'টাইম ট্র্যাকার' : 'Time Tracker'}
          </CardTitle>
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" />
                {language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{language === 'bn' ? 'ম্যানুয়াল এন্ট্রি যোগ করুন' : 'Add Manual Entry'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">{language === 'bn' ? 'কাজ' : 'Task'}</Label>
                  <Select value={manualForm.taskId} onValueChange={v => setManualForm(p => ({ ...p, taskId: v }))}>
                    <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'ঐচ্ছিক' : 'Optional'} /></SelectTrigger>
                    <SelectContent>
                      {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{language === 'bn' ? 'প্রকল্প' : 'Project'}</Label>
                  <Select value={manualForm.projectId} onValueChange={v => setManualForm(p => ({ ...p, projectId: v }))}>
                    <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'ঐচ্ছিক' : 'Optional'} /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{language === 'bn' ? 'শুরু' : 'Start Time'}</Label>
                    <Input type="datetime-local" value={manualForm.startTime}
                      onChange={e => setManualForm(p => ({ ...p, startTime: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">{language === 'bn' ? 'শেষ' : 'End Time'}</Label>
                    <Input type="datetime-local" value={manualForm.endTime}
                      onChange={e => setManualForm(p => ({ ...p, endTime: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{language === 'bn' ? 'নোট' : 'Notes'}</Label>
                  <Textarea value={manualForm.notes} onChange={e => setManualForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder={language === 'bn' ? 'ঐচ্ছিক নোট...' : 'Optional notes...'} rows={2} />
                </div>
                <Button className="w-full" onClick={handleManualSubmit}
                  disabled={!manualForm.startTime || !manualForm.endTime}>
                  {language === 'bn' ? 'যোগ করুন' : 'Add Entry'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Active timer display */}
        {activeEntry ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="font-mono text-4xl font-bold text-primary mb-2">
              {formatDurationShort(elapsed)}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {language === 'bn' ? 'টাইমার চলছে...' : 'Timer running...'}
            </p>
            <Button onClick={onStop} variant="destructive" size="lg" className="gap-2">
              <Square className="h-4 w-4" />
              {language === 'bn' ? 'থামান' : 'Stop'}
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {/* Task/Project selectors */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder={language === 'bn' ? 'কাজ নির্বাচন...' : 'Select task...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'bn' ? 'কোনো কাজ নেই' : 'No task'}</SelectItem>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder={language === 'bn' ? 'প্রকল্প...' : 'Project...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'bn' ? 'কোনো প্রকল্প নেই' : 'No project'}</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStart} className="w-full gap-2" size="lg">
              <Play className="h-4 w-4" />
              {language === 'bn' ? 'টাইমার শুরু করুন' : 'Start Timer'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
