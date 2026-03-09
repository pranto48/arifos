import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Webhook, Copy, ExternalLink } from 'lucide-react';
import { Webhook as WebhookType } from '@/hooks/useWorkflowAutomation';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  webhooks: WebhookType[];
  onCreate: (data: Partial<WebhookType>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
}

export function WebhookManager({ webhooks, onCreate, onDelete, onToggle }: Props) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', target_type: 'task' });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const getWebhookUrl = (key: string) => `${supabaseUrl}/functions/v1/webhook-receiver?key=${key}`;

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name: form.name.trim(), target_type: form.target_type } as any);
      toast({ title: language === 'bn' ? 'ওয়েবহুক তৈরি হয়েছে' : 'Webhook created' });
      setForm({ name: '', target_type: 'task' });
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = (key: string) => {
    navigator.clipboard.writeText(getWebhookUrl(key));
    toast({ title: language === 'bn' ? 'কপি হয়েছে' : 'Copied to clipboard' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          {language === 'bn' ? 'ইন্টিগ্রেশন ওয়েবহুক' : 'Integration Webhooks'}
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />{language === 'bn' ? 'নতুন ওয়েবহুক' : 'New Webhook'}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'bn' ? 'ওয়েবহুক তৈরি করুন' : 'Create Webhook'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={language === 'bn' ? 'ওয়েবহুক নাম' : 'Webhook name'} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'টার্গেট টাইপ' : 'Target Type'}</Label>
                <Select value={form.target_type} onValueChange={v => setForm(f => ({ ...f, target_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">{language === 'bn' ? 'কাজ তৈরি' : 'Create Task'}</SelectItem>
                    <SelectItem value="note">{language === 'bn' ? 'নোট তৈরি' : 'Create Note'}</SelectItem>
                    <SelectItem value="notification">{language === 'bn' ? 'নোটিফিকেশন' : 'Notification'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'bn'
                  ? 'এই ওয়েবহুক URL-এ POST করলে স্বয়ংক্রিয়ভাবে আইটেম তৈরি হবে।'
                  : 'Send a POST request to the webhook URL to automatically create items.'}
              </p>
              <Button onClick={handleCreate} disabled={!form.name.trim() || loading} className="w-full">
                {language === 'bn' ? 'ওয়েবহুক তৈরি করুন' : 'Create Webhook'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {webhooks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Webhook className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{language === 'bn' ? 'কোনো ওয়েবহুক নেই।' : 'No webhooks yet. Connect external tools.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {webhooks.map(w => (
            <Card key={w.id}>
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{w.name}</span>
                    <Badge variant="outline" className="text-xs">{w.target_type}</Badge>
                    {!w.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">{language === 'bn' ? 'নিষ্ক্রিয়' : 'Disabled'}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={w.is_active} onCheckedChange={v => onToggle(w.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => onDelete(w.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate font-mono">
                    {getWebhookUrl(w.webhook_key)}
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => copyUrl(w.webhook_key)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{language === 'bn' ? `${w.call_count} বার কল` : `${w.call_count} calls`}</span>
                  {w.last_called_at && (
                    <span>{language === 'bn' ? 'শেষ কল: ' : 'Last: '}{formatDistanceToNow(new Date(w.last_called_at), { addSuffix: true })}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
