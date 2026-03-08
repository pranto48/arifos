import { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Loader2, ArrowRight, Check, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RestoreProgress {
  current: number;
  total: number;
  currentTable: string;
}

interface RestoreComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupData: any;
  onRestore: (selectedTypes: string[]) => void;
  restoring: boolean;
  restoreProgress?: RestoreProgress | null;
}

interface DataComparison {
  type: string;
  label: string;
  labelBn: string;
  current: number;
  backup: number;
  change: 'add' | 'remove' | 'replace' | 'same';
}

// Legacy camelCase → table name mapping for backward compat
const LEGACY_KEY_MAP: Record<string, string> = {
  tasks: 'tasks', notes: 'notes', goals: 'goals', projects: 'projects',
  transactions: 'transactions', habits: 'habits', investments: 'investments',
  salaries: 'salary_entries', family: 'family_members', familyEvents: 'family_events',
  budgets: 'budgets', budgetCategories: 'budget_categories',
  taskCategories: 'task_categories', habitCompletions: 'habit_completions',
  goalMilestones: 'goal_milestones', projectMilestones: 'project_milestones',
};

interface DataTypeInfo {
  key: string;
  label: string;
  labelBn: string;
  icon: string;
  group: 'productivity' | 'office' | 'finance' | 'personal' | 'system';
}

const DATA_TYPES: DataTypeInfo[] = [
  // Productivity
  { key: 'tasks', label: 'Tasks', labelBn: 'কাজ', icon: '📋', group: 'productivity' },
  { key: 'task_categories', label: 'Task Categories', labelBn: 'কাজের ক্যাটাগরি', icon: '📂', group: 'productivity' },
  { key: 'task_checklists', label: 'Task Checklists', labelBn: 'চেকলিস্ট', icon: '☑️', group: 'productivity' },
  { key: 'task_follow_up_notes', label: 'Follow-up Notes', labelBn: 'ফলোআপ নোট', icon: '📌', group: 'productivity' },
  { key: 'notes', label: 'Notes', labelBn: 'নোট', icon: '📝', group: 'productivity' },
  { key: 'goals', label: 'Goals', labelBn: 'গোল', icon: '🎯', group: 'productivity' },
  { key: 'goal_milestones', label: 'Goal Milestones', labelBn: 'গোল মাইলস্টোন', icon: '🏁', group: 'productivity' },
  { key: 'projects', label: 'Projects', labelBn: 'প্রজেক্ট', icon: '📁', group: 'productivity' },
  { key: 'project_milestones', label: 'Project Milestones', labelBn: 'প্রজেক্ট মাইলস্টোন', icon: '🚩', group: 'productivity' },
  { key: 'habits', label: 'Habits', labelBn: 'অভ্যাস', icon: '✅', group: 'productivity' },
  { key: 'habit_completions', label: 'Habit Completions', labelBn: 'অভ্যাস সম্পন্ন', icon: '✨', group: 'productivity' },

  // Office
  { key: 'support_units', label: 'Units', labelBn: 'ইউনিট', icon: '🏢', group: 'office' },
  { key: 'support_departments', label: 'Departments', labelBn: 'বিভাগ', icon: '🏛️', group: 'office' },
  { key: 'support_users', label: 'Support Users', labelBn: 'সাপোর্ট ইউজার', icon: '👥', group: 'office' },
  { key: 'support_user_devices', label: 'User Devices', labelBn: 'ইউজার ডিভাইস', icon: '📱', group: 'office' },
  { key: 'device_categories', label: 'Device Categories', labelBn: 'ডিভাইস ক্যাটাগরি', icon: '🏷️', group: 'office' },
  { key: 'device_suppliers', label: 'Suppliers', labelBn: 'সরবরাহকারী', icon: '🏭', group: 'office' },
  { key: 'device_inventory', label: 'Device Inventory', labelBn: 'ডিভাইস ইনভেন্টরি', icon: '💻', group: 'office' },
  { key: 'device_service_history', label: 'Service History', labelBn: 'সার্ভিস ইতিহাস', icon: '🔧', group: 'office' },
  { key: 'device_transfer_history', label: 'Transfer History', labelBn: 'ট্রান্সফার ইতিহাস', icon: '🔄', group: 'office' },
  { key: 'device_disposals', label: 'Disposals', labelBn: 'ডিসপোজাল', icon: '🗑️', group: 'office' },
  { key: 'support_tickets', label: 'Support Tickets', labelBn: 'সাপোর্ট টিকেট', icon: '🎫', group: 'office' },
  { key: 'ticket_activity_log', label: 'Ticket Activity', labelBn: 'টিকেট অ্যাক্টিভিটি', icon: '📊', group: 'office' },
  { key: 'ticket_requesters', label: 'Ticket Requesters', labelBn: 'টিকেট রিকোয়েস্টার', icon: '🙋', group: 'office' },

  // Finance
  { key: 'transactions', label: 'Transactions', labelBn: 'লেনদেন', icon: '💰', group: 'finance' },
  { key: 'budget_categories', label: 'Budget Categories', labelBn: 'বাজেট ক্যাটাগরি', icon: '🏷️', group: 'finance' },
  { key: 'budgets', label: 'Budgets', labelBn: 'বাজেট', icon: '📊', group: 'finance' },
  { key: 'investments', label: 'Investments', labelBn: 'বিনিয়োগ', icon: '📈', group: 'finance' },
  { key: 'salary_entries', label: 'Salary Entries', labelBn: 'বেতন', icon: '💵', group: 'finance' },
  { key: 'loans', label: 'Loans', labelBn: 'ঋণ', icon: '🏦', group: 'finance' },
  { key: 'loan_payments', label: 'Loan Payments', labelBn: 'ঋণ পরিশোধ', icon: '💳', group: 'finance' },

  // Personal
  { key: 'family_members', label: 'Family Members', labelBn: 'পরিবার', icon: '👨‍👩‍👧‍👦', group: 'personal' },
  { key: 'family_events', label: 'Family Events', labelBn: 'পারিবারিক ইভেন্ট', icon: '🎂', group: 'personal' },
  { key: 'family_member_connections', label: 'Family Connections', labelBn: 'পারিবারিক সম্পর্ক', icon: '🔗', group: 'personal' },
  { key: 'family_documents', label: 'Family Documents', labelBn: 'পারিবারিক ডকুমেন্ট', icon: '📄', group: 'personal' },
  { key: 'profiles', label: 'Profile', labelBn: 'প্রোফাইল', icon: '👤', group: 'personal' },
  { key: 'app_notifications', label: 'Notifications', labelBn: 'নোটিফিকেশন', icon: '🔔', group: 'personal' },

  // System
  { key: 'custom_form_fields', label: 'Custom Fields', labelBn: 'কাস্টম ফিল্ড', icon: '⚙️', group: 'system' },
  { key: 'form_field_config', label: 'Field Config', labelBn: 'ফিল্ড কনফিগ', icon: '🔧', group: 'system' },
  { key: 'module_config', label: 'Module Config', labelBn: 'মডিউল কনফিগ', icon: '📦', group: 'system' },
];

const GROUPS = [
  { key: 'productivity', label: 'Productivity', labelBn: 'প্রোডাক্টিভিটি', icon: '📋' },
  { key: 'office', label: 'Office & Support', labelBn: 'অফিস ও সাপোর্ট', icon: '🏢' },
  { key: 'finance', label: 'Finance', labelBn: 'ফাইন্যান্স', icon: '💰' },
  { key: 'personal', label: 'Personal', labelBn: 'ব্যক্তিগত', icon: '👤' },
  { key: 'system', label: 'System Config', labelBn: 'সিস্টেম কনফিগ', icon: '⚙️' },
];

// Tables that have user_id for counting
const TABLES_WITH_USER_ID = new Set([
  'profiles', 'tasks', 'notes', 'goals', 'projects', 'transactions',
  'habits', 'investments', 'salary_entries', 'family_members', 'family_events',
  'budgets', 'budget_categories', 'task_categories', 'habit_completions',
  'goal_milestones', 'project_milestones', 'loans', 'loan_payments',
  'task_checklists', 'task_follow_up_notes', 'app_notifications',
  'family_member_connections', 'family_documents',
  'support_units', 'support_departments', 'support_users',
  'device_categories', 'device_suppliers', 'device_inventory',
  'device_service_history', 'device_transfer_history', 'device_disposals',
  'support_user_devices',
  'custom_form_fields',
]);

function getBackupCount(backupData: any, key: string): number {
  // v3 format
  if (backupData?.tables?.[key]?.length) return backupData.tables[key].length;
  // v2 legacy format
  if (backupData?.[key]?.length) return backupData[key].length;
  // Check legacy key mapping
  for (const [legacyKey, tableName] of Object.entries(LEGACY_KEY_MAP)) {
    if (tableName === key && backupData?.[legacyKey]?.length) return backupData[legacyKey].length;
  }
  return 0;
}

export function RestoreComparisonDialog({
  open,
  onOpenChange,
  backupData,
  onRestore,
  restoring,
  restoreProgress,
}: RestoreComparisonDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [comparisons, setComparisons] = useState<DataComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    productivity: true, office: true, finance: true, personal: true, system: true,
  });

  useEffect(() => {
    if (open && backupData) {
      loadCurrentData();
      // Select all types that have data in backup
      const typesWithData = DATA_TYPES
        .filter(t => getBackupCount(backupData, t.key) > 0)
        .map(t => t.key);
      setSelectedTypes(typesWithData);
    }
  }, [open, backupData]);

  const loadCurrentData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const selfHosted = isSelfHosted();
      const currentCounts: Record<string, number> = {};

      // Fetch counts in parallel chunks
      const allKeys = DATA_TYPES.map(t => t.key);
      const CHUNK = 6;

      for (let i = 0; i < allKeys.length; i += CHUNK) {
        const chunk = allKeys.slice(i, i + CHUNK);
        const results = await Promise.all(
          chunk.map(async (key) => {
            try {
              if (selfHosted) {
                const rows = await selfHostedApi.selectAll(key);
                return { key, count: rows.length };
              } else {
                const hasUserId = TABLES_WITH_USER_ID.has(key);
                let query = supabase.from(key as any).select('id', { count: 'exact', head: true });
                if (hasUserId) query = query.eq('user_id', user.id);
                const { count } = await query;
                return { key, count: count || 0 };
              }
            } catch {
              return { key, count: 0 };
            }
          })
        );
        for (const r of results) currentCounts[r.key] = r.count;
      }

      const newComparisons: DataComparison[] = DATA_TYPES.map(type => {
        const current = currentCounts[type.key] || 0;
        const backup = getBackupCount(backupData, type.key);

        let change: 'add' | 'remove' | 'replace' | 'same' = 'same';
        if (current === 0 && backup > 0) change = 'add';
        else if (current > 0 && backup === 0) change = 'remove';
        else if (current !== backup) change = 'replace';

        return { type: type.key, label: type.label, labelBn: type.labelBn, current, backup, change };
      });

      setComparisons(newComparisons);
    } catch (error) {
      console.error('Failed to load current data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleGroup = (groupKey: string) => {
    const groupTypes = DATA_TYPES.filter(t => t.group === groupKey).map(t => t.key);
    const allSelected = groupTypes.every(t => selectedTypes.includes(t));
    if (allSelected) {
      setSelectedTypes(prev => prev.filter(t => !groupTypes.includes(t)));
    } else {
      setSelectedTypes(prev => [...new Set([...prev, ...groupTypes])]);
    }
  };

  const selectAll = () => setSelectedTypes(DATA_TYPES.map(t => t.key));
  const deselectAll = () => setSelectedTypes([]);

  const getChangeIcon = (change: string) => {
    switch (change) {
      case 'add': return <Plus className="h-3 w-3 text-green-500" />;
      case 'remove': return <Minus className="h-3 w-3 text-destructive" />;
      case 'replace': return <ArrowRight className="h-3 w-3 text-yellow-500" />;
      default: return <Check className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getChangeBadge = (change: string) => {
    switch (change) {
      case 'add': return <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">{language === 'bn' ? 'নতুন' : 'New'}</Badge>;
      case 'remove': return <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">{language === 'bn' ? 'মুছে যাবে' : 'Remove'}</Badge>;
      case 'replace': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs">{language === 'bn' ? 'প্রতিস্থাপন' : 'Replace'}</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground text-xs">{language === 'bn' ? 'একই' : 'Same'}</Badge>;
    }
  };

  const selectedCount = selectedTypes.length;
  const totalItems = comparisons.filter(c => selectedTypes.includes(c.type)).reduce((sum, c) => sum + c.backup, 0);
  const currentItems = comparisons.filter(c => selectedTypes.includes(c.type)).reduce((sum, c) => sum + c.current, 0);

  // Detect backup source
  const backupSource = backupData?.source || (backupData?.version === '3.0' ? 'unknown' : 'legacy');
  const backupVersion = backupData?.version || '2.0';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {language === 'bn' ? 'পুনরুদ্ধার পূর্বরূপ ও নির্বাচন' : 'Restore Preview & Selection'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {language === 'bn'
              ? 'কোন ডেটা পুনরুদ্ধার করতে চান তা নির্বাচন করুন। নির্বাচিত ধরনের বিদ্যমান ডেটা মুছে যাবে।'
              : 'Select which data types to restore. Existing data for selected types will be deleted.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-muted-foreground">
              {language === 'bn' ? 'ডেটা তুলনা করা হচ্ছে...' : 'Comparing data...'}
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{language === 'bn' ? 'ব্যাকআপ তারিখ' : 'Backup Date'}:</span>
                <span className="font-medium">{backupData?.exportedAt ? new Date(backupData.exportedAt).toLocaleString() : (language === 'bn' ? 'অজানা' : 'Unknown')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{language === 'bn' ? 'ফরম্যাট / সোর্স' : 'Format / Source'}:</span>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">v{backupVersion}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{backupSource}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{language === 'bn' ? 'নির্বাচিত ধরন' : 'Selected Types'}:</span>
                <span className="font-medium">{selectedCount} / {DATA_TYPES.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{language === 'bn' ? 'বর্তমান → ব্যাকআপ' : 'Current → Backup'}:</span>
                <span className="font-medium">{currentItems} → {totalItems} {language === 'bn' ? 'আইটেম' : 'items'}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs text-primary hover:underline">
                {language === 'bn' ? 'সব নির্বাচন করুন' : 'Select All'}
              </button>
              <span className="text-muted-foreground">•</span>
              <button onClick={deselectAll} className="text-xs text-primary hover:underline">
                {language === 'bn' ? 'সব বাদ দিন' : 'Deselect All'}
              </button>
            </div>

            {/* Data Type Selection - Grouped */}
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-3">
                {GROUPS.map((group) => {
                  const groupTypes = DATA_TYPES.filter(t => t.group === group.key);
                  const groupComparisons = comparisons.filter(c => groupTypes.some(t => t.key === c.type));
                  const groupSelected = groupTypes.filter(t => selectedTypes.includes(t.key)).length;
                  const isOpen = openGroups[group.key] ?? true;

                  return (
                    <Collapsible key={group.key} open={isOpen} onOpenChange={(o) => setOpenGroups(prev => ({ ...prev, [group.key]: o }))}>
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-sm font-medium text-foreground hover:text-primary transition-colors py-1">
                          <span>{group.icon}</span>
                          <span>{language === 'bn' ? group.labelBn : group.label}</span>
                          <Badge variant="secondary" className="text-xs ml-1">{groupSelected}/{groupTypes.length}</Badge>
                          {isOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                        </CollapsibleTrigger>
                        <button onClick={() => toggleGroup(group.key)} className="text-xs text-primary hover:underline px-2">
                          {groupTypes.every(t => selectedTypes.includes(t.key)) ? (language === 'bn' ? 'বাদ' : 'None') : (language === 'bn' ? 'সব' : 'All')}
                        </button>
                      </div>

                      <CollapsibleContent>
                        <div className="space-y-1.5 mt-1.5 ml-2">
                          {groupComparisons.map((comp) => {
                            const typeInfo = groupTypes.find(t => t.key === comp.type);
                            const isSelected = selectedTypes.includes(comp.type);

                            return (
                              <div
                                key={comp.type}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                                  isSelected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border'
                                }`}
                              >
                                <Checkbox id={comp.type} checked={isSelected} onCheckedChange={() => toggleType(comp.type)} />
                                <span className="text-base">{typeInfo?.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <Label htmlFor={comp.type} className="font-medium cursor-pointer text-sm">
                                    {language === 'bn' ? comp.labelBn : comp.label}
                                  </Label>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>{comp.current} {language === 'bn' ? 'বর্তমান' : 'current'}</span>
                                    {getChangeIcon(comp.change)}
                                    <span>{comp.backup} {language === 'bn' ? 'ব্যাকআপে' : 'in backup'}</span>
                                  </div>
                                </div>
                                {getChangeBadge(comp.change)}
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                {language === 'bn'
                  ? 'সতর্কতা: নির্বাচিত ধরনের সমস্ত বিদ্যমান ডেটা স্থায়ীভাবে মুছে যাবে এবং ব্যাকআপ থেকে প্রতিস্থাপিত হবে। Docker ↔ Cloud ক্রস-প্ল্যাটফর্ম সমর্থিত।'
                  : 'Warning: All existing data for selected types will be permanently deleted and replaced from backup. Cross-platform Docker ↔ Cloud supported.'}
              </p>
            </div>

            {/* Restore Progress */}
            {restoring && restoreProgress && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {language === 'bn' ? 'পুনরুদ্ধার হচ্ছে:' : 'Restoring:'}{' '}
                    <span className="font-medium text-foreground">{restoreProgress.currentTable.replace(/_/g, ' ')}</span>
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {restoreProgress.current} / {restoreProgress.total}
                  </span>
                </div>
                <Progress value={restoreProgress.total > 0 ? (restoreProgress.current / restoreProgress.total) * 100 : 0} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {Math.round(restoreProgress.total > 0 ? (restoreProgress.current / restoreProgress.total) * 100 : 0)}%{' '}
                  {language === 'bn' ? 'সম্পন্ন' : 'complete'}
                </p>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={restoring}>
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onRestore(selectedTypes)}
            disabled={selectedTypes.length === 0 || restoring || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {restoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'bn' ? 'পুনরুদ্ধার হচ্ছে...' : 'Restoring...'}
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                {language === 'bn' ? `${selectedCount} ধরন পুনরুদ্ধার করুন` : `Restore ${selectedCount} Types`}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
