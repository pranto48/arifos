import { useState } from 'react';
import { Bell, Mail, CheckSquare, Repeat, Heart, Banknote, UserCheck, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const PREF_OPTIONS = [
  { key: 'task_reminders' as const, icon: CheckSquare, en: 'Task Reminders', bn: 'কাজের রিমাইন্ডার', descEn: 'Get notified about tasks due today or overdue.', descBn: 'আজ বা অতিরিক্ত বকেয়া কাজের বিজ্ঞপ্তি পান।' },
  { key: 'habit_reminders' as const, icon: Repeat, en: 'Habit Reminders', bn: 'অভ্যাসের রিমাইন্ডার', descEn: 'Receive reminders for your daily habits.', descBn: 'আপনার দৈনিক অভ্যাসের জন্য রিমাইন্ডার পান।' },
  { key: 'family_event_reminders' as const, icon: Heart, en: 'Family Event Reminders', bn: 'পারিবারিক ইভেন্ট রিমাইন্ডার', descEn: 'Get alerts for upcoming birthdays and family events.', descBn: 'আসন্ন জন্মদিন ও পারিবারিক ইভেন্টের সতর্কতা পান।' },
  { key: 'loan_reminders' as const, icon: Banknote, en: 'Loan Payment Reminders', bn: 'ঋণ পরিশোধের রিমাইন্ডার', descEn: 'Get notified before loan payment due dates.', descBn: 'ঋণ পরিশোধের তারিখের আগে বিজ্ঞপ্তি পান।' },
  { key: 'task_assignment_alerts' as const, icon: UserCheck, en: 'Task Assignment Alerts', bn: 'কাজ অ্যাসাইনমেন্ট সতর্কতা', descEn: 'Get notified when tasks are assigned to you.', descBn: 'আপনাকে কাজ অ্যাসাইন করা হলে বিজ্ঞপ্তি পান।' },
  { key: 'follow_up_reminders' as const, icon: CalendarClock, en: 'Follow-up Reminders', bn: 'ফলো-আপ রিমাইন্ডার', descEn: 'Get reminded about tasks that need follow-up.', descBn: 'ফলো-আপ প্রয়োজন এমন কাজের রিমাইন্ডার পান।' },
];

export function NotificationSettings() {
  const { language } = useLanguage();
  const [sendingReminders, setSendingReminders] = useState(false);
  const { prefs, loading, saving, updatePref } = useNotificationPreferences();

  const sendTestReminder = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-task-reminders');
      if (error) throw error;
      toast({
        title: language === 'bn' ? 'রিমাইন্ডার পাঠানো হয়েছে' : 'Reminders Sent',
        description: data?.message || (language === 'bn' ? 'কাজের রিমাইন্ডার প্রসেস করা হয়েছে।' : 'Task reminders have been processed.')
      });
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('self-hosted') || msg.includes('local mode') || msg.includes('Failed to fetch')) {
        toast({
          title: language === 'bn' ? 'স্থানীয় মোড' : 'Local Mode',
          description: language === 'bn' ? 'ইমেইল রিমাইন্ডার স্থানীয় মোডে উপলব্ধ নয়।' : 'Email reminders are not available in local/Docker mode.',
        });
      } else {
        toast({ title: 'Error', description: msg || 'Failed to send reminders', variant: 'destructive' });
      }
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div className="space-y-6">
      <PushNotificationSettings />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Mail className="h-5 w-5" /> {language === 'bn' ? 'ইমেইল নোটিফিকেশন' : 'Email Notifications'}
          </CardTitle>
          <CardDescription>
            {language === 'bn'
              ? 'কোন ধরনের ইমেইল নোটিফিকেশন আপনি পেতে চান তা নির্বাচন করুন।'
              : 'Choose which email notifications you want to receive.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {PREF_OPTIONS.map((opt, idx) => {
                const Icon = opt.icon;
                return (
                  <div key={opt.key}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <Label htmlFor={opt.key} className="text-sm font-medium cursor-pointer">
                            {language === 'bn' ? opt.bn : opt.en}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === 'bn' ? opt.descBn : opt.descEn}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={opt.key}
                        checked={prefs[opt.key]}
                        onCheckedChange={(val) => updatePref(opt.key, val)}
                        disabled={saving}
                      />
                    </div>
                    {idx < PREF_OPTIONS.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {language === 'bn'
                ? 'এখনই একটি টেস্ট রিমাইন্ডার পাঠিয়ে আপনার সেটিংস পরীক্ষা করুন।'
                : 'Test your settings by sending a reminder now.'
              }
            </p>
            <Button
              variant="outline"
              onClick={sendTestReminder}
              disabled={sendingReminders}
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingReminders
                ? (language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...')
                : (language === 'bn' ? 'এখনই রিমাইন্ডার পাঠান' : 'Send Test Reminder')
              }
            </Button>
            <p className="text-xs text-muted-foreground">
              {language === 'bn'
                ? '💡 কাজ (সকাল ৮টা), অভ্যাস (প্রতি ঘণ্টা), এবং পারিবারিক ইভেন্টের (সকাল ৭টা) জন্য স্বয়ংক্রিয় দৈনিক রিমাইন্ডার সক্রিয় আছে।'
                : '💡 Automated daily reminders are active for tasks (8 AM), habits (hourly), and family events (7 AM).'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
