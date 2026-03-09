import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Trash2, FileText, CalendarClock } from 'lucide-react';
import { TaskTemplate } from '@/hooks/useWorkflowAutomation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  templates: TaskTemplate[];
  onCreate: (data: Partial<TaskTemplate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGenerate: (template: TaskTemplate) => Promise<void>;
  onUpdate: (id: string, data: Partial<TaskTemplate>) => Promise<void>;
}

export function TaskTemplateManager({ templates, onCreate, onDelete, onGenerate, onUpdate }: Props) {
  const { language } = useLanguage();
  const { categories } = useTaskCategories();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', category_id: '',
    task_type: 'office', schedule_type: 'manual',
    schedule_config: { pattern: 'daily', days: [] as string[] },
  });

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await onCreate({
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        category_id: form.category_id || null,
        task_type: form.task_type,
        schedule_type: form.schedule_type,
        schedule_config: form.schedule_config,
      } as any);
      toast({ title: language === 'bn' ? 'টেমপ্লেট তৈরি হয়েছে' : 'Template created' });
      setForm({ title: '', description: '', priority: 'medium', category_id: '', task_type: 'office', schedule_type: 'manual', schedule_config: { pattern: 'daily', days: [] } });
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const scheduleLabels: Record<string, string> = {
    manual: language === 'bn' ? 'ম্যানুয়াল' : 'Manual',
    daily: language === 'bn' ? 'প্রতিদিন' : 'Daily',
    weekly: language === 'bn' ? 'সাপ্তাহিক' : 'Weekly',
    monthly: language === 'bn' ? 'মাসিক' : 'Monthly',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {language === 'bn' ? 'টাস্ক টেমপ্লেট' : 'Task Templates'}
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />{language === 'bn' ? 'নতুন টেমপ্লেট' : 'New Template'}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'bn' ? 'টাস্ক টেমপ্লেট তৈরি করুন' : 'Create Task Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'শিরোনাম' : 'Title'}</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={language === 'bn' ? 'টেমপ্লেট শিরোনাম' : 'Template title'} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="resize-none h-20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{language === 'bn' ? 'অগ্রাধিকার' : 'Priority'}</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{language === 'bn' ? 'নিম্ন' : 'Low'}</SelectItem>
                      <SelectItem value="medium">{language === 'bn' ? 'মাঝারি' : 'Medium'}</SelectItem>
                      <SelectItem value="high">{language === 'bn' ? 'উচ্চ' : 'High'}</SelectItem>
                      <SelectItem value="urgent">{language === 'bn' ? 'জরুরি' : 'Urgent'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'bn' ? 'বিভাগ' : 'Category'}</Label>
                  <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'সময়সূচী' : 'Schedule'}</Label>
                <Select value={form.schedule_type} onValueChange={v => setForm(f => ({ ...f, schedule_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{language === 'bn' ? 'ম্যানুয়াল' : 'Manual (On Demand)'}</SelectItem>
                    <SelectItem value="daily">{language === 'bn' ? 'প্রতিদিন' : 'Daily'}</SelectItem>
                    <SelectItem value="weekly">{language === 'bn' ? 'সাপ্তাহিক' : 'Weekly'}</SelectItem>
                    <SelectItem value="monthly">{language === 'bn' ? 'মাসিক' : 'Monthly'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!form.title.trim() || loading} className="w-full">
                {language === 'bn' ? 'টেমপ্লেট তৈরি করুন' : 'Create Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{language === 'bn' ? 'কোনো টেমপ্লেট নেই। নতুন তৈরি করুন।' : 'No templates yet. Create one to get started.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map(t => (
            <Card key={t.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{t.title}</span>
                    <Badge variant="outline" className="text-xs">{scheduleLabels[t.schedule_type] || t.schedule_type}</Badge>
                    <Badge variant={t.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">{t.priority}</Badge>
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{t.description}</p>}
                  {t.last_generated_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <CalendarClock className="h-3 w-3 inline mr-1" />
                      {language === 'bn' ? 'শেষ তৈরি: ' : 'Last generated: '}{formatDistanceToNow(new Date(t.last_generated_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <Switch checked={t.is_active} onCheckedChange={v => onUpdate(t.id, { is_active: v } as any)} />
                  <Button variant="ghost" size="icon" onClick={() => onGenerate(t)} title="Generate task">
                    <Play className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
