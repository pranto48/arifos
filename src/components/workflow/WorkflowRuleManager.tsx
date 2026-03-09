import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Zap, ArrowRight, GitBranch } from 'lucide-react';
import { WorkflowRule } from '@/hooks/useWorkflowAutomation';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

const TRIGGER_TYPES = [
  { value: 'task_completed', label: 'Task Completed', labelBn: 'কাজ সম্পন্ন' },
  { value: 'task_created', label: 'Task Created', labelBn: 'কাজ তৈরি' },
  { value: 'goal_reached', label: 'Goal Reached', labelBn: 'লক্ষ্য পূরণ' },
  { value: 'due_date_approaching', label: 'Due Date Approaching', labelBn: 'শেষ তারিখ আসছে' },
  { value: 'status_changed', label: 'Status Changed', labelBn: 'স্ট্যাটাস পরিবর্তিত' },
];

const ACTION_TYPES = [
  { value: 'create_task', label: 'Create Follow-up Task', labelBn: 'ফলো-আপ কাজ তৈরি' },
  { value: 'create_notification', label: 'Send Notification', labelBn: 'নোটিফিকেশন পাঠান' },
  { value: 'update_status', label: 'Update Status', labelBn: 'স্ট্যাটাস আপডেট' },
  { value: 'assign_task', label: 'Assign to User', labelBn: 'ইউজারকে অ্যাসাইন' },
];

interface Props {
  rules: WorkflowRule[];
  onCreate: (data: Partial<WorkflowRule>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
}

export function WorkflowRuleManager({ rules, onCreate, onDelete, onToggle }: Props) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '',
    trigger_type: 'task_completed',
    trigger_config: { task_type: 'any', priority: 'any', days_before: 1 } as Record<string, any>,
    action_type: 'create_task',
    action_config: { title: '', priority: 'medium' },
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onCreate({
        name: form.name.trim(),
        description: form.description.trim() || null,
        trigger_type: form.trigger_type,
        trigger_config: form.trigger_config,
        action_type: form.action_type,
        action_config: form.action_config,
      } as any);
      toast({ title: language === 'bn' ? 'রুল তৈরি হয়েছে' : 'Rule created' });
      setForm({ name: '', description: '', trigger_type: 'task_completed', trigger_config: { task_type: 'any', priority: 'any' }, action_type: 'create_task', action_config: { title: '', priority: 'medium' } });
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getTriggerLabel = (type: string) => {
    const t = TRIGGER_TYPES.find(tt => tt.value === type);
    return t ? (language === 'bn' ? t.labelBn : t.label) : type;
  };

  const getActionLabel = (type: string) => {
    const a = ACTION_TYPES.find(at => at.value === type);
    return a ? (language === 'bn' ? a.labelBn : a.label) : type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          {language === 'bn' ? 'ওয়ার্কফ্লো রুল' : 'Workflow Rules'}
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />{language === 'bn' ? 'নতুন রুল' : 'New Rule'}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{language === 'bn' ? 'অটোমেশন রুল তৈরি করুন' : 'Create Automation Rule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={language === 'bn' ? 'রুলের নাম' : 'Rule name'} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="resize-none h-16" />
              </div>

              {/* Trigger */}
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {language === 'bn' ? 'যখন (ট্রিগার)' : 'When (Trigger)'}
                </Label>
                <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{language === 'bn' ? t.labelBn : t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.trigger_type === 'task_completed' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{language === 'bn' ? 'কাজের ধরন ফিল্টার' : 'Task Type Filter'}</Label>
                    <Select value={form.trigger_config.task_type} onValueChange={v => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, task_type: v } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">{language === 'bn' ? 'সব' : 'Any'}</SelectItem>
                        <SelectItem value="office">{language === 'bn' ? 'অফিস' : 'Office'}</SelectItem>
                        <SelectItem value="personal">{language === 'bn' ? 'ব্যক্তিগত' : 'Personal'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.trigger_type === 'due_date_approaching' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{language === 'bn' ? 'কত দিন আগে' : 'Days before'}</Label>
                    <Input type="number" min={1} max={30} value={form.trigger_config.days_before || 1}
                      onChange={e => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, days_before: parseInt(e.target.value) } }))} />
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Action */}
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  {language === 'bn' ? 'তখন (অ্যাকশন)' : 'Then (Action)'}
                </Label>
                <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(a => (
                      <SelectItem key={a.value} value={a.value}>{language === 'bn' ? a.labelBn : a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.action_type === 'create_task' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{language === 'bn' ? 'ফলো-আপ কাজের শিরোনাম' : 'Follow-up task title'}</Label>
                    <Input value={form.action_config.title} onChange={e => setForm(f => ({ ...f, action_config: { ...f.action_config, title: e.target.value } }))}
                      placeholder={language === 'bn' ? 'শিরোনাম' : 'Task title'} />
                  </div>
                )}
              </div>

              <Button onClick={handleCreate} disabled={!form.name.trim() || loading} className="w-full">
                {language === 'bn' ? 'রুল তৈরি করুন' : 'Create Rule'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <GitBranch className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{language === 'bn' ? 'কোনো অটোমেশন রুল নেই।' : 'No automation rules yet. Create if-then workflows.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rules.map(r => (
            <Card key={r.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.name}</span>
                    {!r.is_active && <Badge variant="outline" className="text-xs">{language === 'bn' ? 'নিষ্ক্রিয়' : 'Disabled'}</Badge>}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{getTriggerLabel(r.trigger_type)}</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="secondary" className="text-xs">{getActionLabel(r.action_type)}</Badge>
                  </div>
                  {r.execution_count > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'bn' ? `${r.execution_count} বার চলেছে` : `Executed ${r.execution_count} times`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <Switch checked={r.is_active} onCheckedChange={v => onToggle(r.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)}>
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

function Play(props: any) {
  return <Zap {...props} />;
}
