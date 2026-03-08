import { useState } from 'react';
import { useModuleConfig, MODULE_LABELS, type ModuleConfig } from '@/hooks/useModuleConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, CheckSquare, FileText, HeadsetIcon, HardDrive, Ticket, Target, Lightbulb, Repeat, Users, Wallet, DollarSign, TrendingUp, Landmark } from 'lucide-react';

const MODULE_ICONS: Record<string, any> = {
  calendar: Calendar,
  tasks: CheckSquare,
  notes: FileText,
  support_users: HeadsetIcon,
  device_inventory: HardDrive,
  support_tickets: Ticket,
  goals: Target,
  projects: Lightbulb,
  habits: Repeat,
  family: Users,
  budget: Wallet,
  salary: DollarSign,
  investments: TrendingUp,
  loans: Landmark,
};

const MODULE_GROUPS = [
  { label: { en: 'Productivity', bn: 'উৎপাদনশীলতা' }, modules: ['tasks', 'notes', 'projects', 'goals', 'calendar'] },
  { label: { en: 'Office', bn: 'অফিস' }, modules: ['support_users', 'device_inventory', 'support_tickets'] },
  { label: { en: 'Personal', bn: 'ব্যক্তিগত' }, modules: ['habits', 'family'] },
  { label: { en: 'Finance', bn: 'আর্থিক' }, modules: ['budget', 'salary', 'investments', 'loans'] },
];

export function ModuleSettings() {
  const { modules, toggleModule } = useModuleConfig();
  const { language } = useLanguage();
  const [updating, setUpdating] = useState<string | null>(null);

  const isEnabled = (moduleName: string) => {
    const config = modules.find(m => m.module_name === moduleName);
    return config ? config.is_enabled : true;
  };

  const handleToggle = async (moduleName: string, enabled: boolean) => {
    setUpdating(moduleName);
    try {
      await toggleModule(moduleName, enabled);
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: `${MODULE_LABELS[moduleName]?.[language] || moduleName} ${enabled ? (language === 'bn' ? 'সক্রিয়' : 'enabled') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'disabled')}.`,
      });
    } catch (err: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-foreground">
          {language === 'bn' ? 'মডিউল ম্যানেজমেন্ট' : 'Module Management'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {language === 'bn' 
            ? 'অ্যাপ্লিকেশনের মডিউলগুলো সক্রিয় বা নিষ্ক্রিয় করুন। নিষ্ক্রিয় মডিউল সাইডবার ও নেভিগেশন থেকে লুকানো হবে।'
            : 'Enable or disable application modules. Disabled modules will be hidden from sidebar and navigation.'
          }
        </p>
      </div>

      {MODULE_GROUPS.map(group => (
        <div key={group.label.en} className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {language === 'bn' ? group.label.bn : group.label.en}
          </h4>
          <div className="space-y-1">
            {group.modules.map(moduleName => {
              const Icon = MODULE_ICONS[moduleName] || CheckSquare;
              const enabled = isEnabled(moduleName);
              const label = MODULE_LABELS[moduleName];

              return (
                <div key={moduleName} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${enabled ? 'bg-primary/15' : 'bg-muted'}`}>
                      <Icon className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        {label ? (language === 'bn' ? label.bn : label.en) : moduleName}
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {updating === moduleName && <Loader2 className="h-3 w-3 animate-spin" />}
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleToggle(moduleName, checked)}
                      disabled={updating === moduleName}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
