import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Database, Download, RotateCcw, HardDrive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

export interface TableProgress {
  table: string;
  status: 'pending' | 'fetching' | 'done' | 'error';
  itemCount?: number;
  errorMessage?: string;
}

export interface BackupRestoreProgressState {
  mode: 'backup' | 'restore';
  phase: 'preparing' | 'processing' | 'finalizing' | 'complete' | 'error';
  tables: TableProgress[];
  currentTable: string;
  processedTables: number;
  totalTables: number;
  processedItems: number;
  totalItems: number;
  startTime: number;
  errors: string[];
}

interface BackupRestoreProgressProps {
  state: BackupRestoreProgressState | null;
}

const TABLE_LABELS: Record<string, { en: string; bn: string }> = {
  profiles: { en: 'Profiles', bn: 'প্রোফাইল' },
  tasks: { en: 'Tasks', bn: 'কাজ' },
  task_categories: { en: 'Task Categories', bn: 'কাজের ক্যাটাগরি' },
  task_checklists: { en: 'Checklists', bn: 'চেকলিস্ট' },
  task_follow_up_notes: { en: 'Follow-up Notes', bn: 'ফলোআপ নোট' },
  task_assignments: { en: 'Task Assignments', bn: 'কাজ অ্যাসাইনমেন্ট' },
  notes: { en: 'Notes', bn: 'নোট' },
  goals: { en: 'Goals', bn: 'গোল' },
  goal_milestones: { en: 'Goal Milestones', bn: 'গোল মাইলস্টোন' },
  projects: { en: 'Projects', bn: 'প্রজেক্ট' },
  project_milestones: { en: 'Project Milestones', bn: 'প্রজেক্ট মাইলস্টোন' },
  transactions: { en: 'Transactions', bn: 'লেনদেন' },
  budgets: { en: 'Budgets', bn: 'বাজেট' },
  budget_categories: { en: 'Budget Categories', bn: 'বাজেট ক্যাটাগরি' },
  habits: { en: 'Habits', bn: 'অভ্যাস' },
  habit_completions: { en: 'Habit Completions', bn: 'অভ্যাস সম্পন্ন' },
  investments: { en: 'Investments', bn: 'বিনিয়োগ' },
  salary_entries: { en: 'Salary Entries', bn: 'বেতন' },
  family_members: { en: 'Family Members', bn: 'পরিবার' },
  family_events: { en: 'Family Events', bn: 'পারিবারিক ইভেন্ট' },
  family_member_connections: { en: 'Family Connections', bn: 'পারিবারিক সম্পর্ক' },
  family_documents: { en: 'Family Documents', bn: 'পারিবারিক ডকুমেন্ট' },
  support_units: { en: 'Units', bn: 'ইউনিট' },
  support_departments: { en: 'Departments', bn: 'বিভাগ' },
  support_users: { en: 'Support Users', bn: 'সাপোর্ট ইউজার' },
  support_user_devices: { en: 'User Devices', bn: 'ইউজার ডিভাইস' },
  device_categories: { en: 'Device Categories', bn: 'ডিভাইস ক্যাটাগরি' },
  device_suppliers: { en: 'Suppliers', bn: 'সরবরাহকারী' },
  device_inventory: { en: 'Device Inventory', bn: 'ডিভাইস ইনভেন্টরি' },
  device_service_history: { en: 'Service History', bn: 'সার্ভিস ইতিহাস' },
  device_transfer_history: { en: 'Transfer History', bn: 'ট্রান্সফার ইতিহাস' },
  device_disposals: { en: 'Disposals', bn: 'ডিসপোজাল' },
  support_tickets: { en: 'Support Tickets', bn: 'সাপোর্ট টিকেট' },
  ticket_activity_log: { en: 'Ticket Activity', bn: 'টিকেট অ্যাক্টিভিটি' },
  ticket_requesters: { en: 'Ticket Requesters', bn: 'টিকেট রিকোয়েস্টার' },
  ticket_categories: { en: 'Ticket Categories', bn: 'টিকেট ক্যাটাগরি' },
  loans: { en: 'Loans', bn: 'ঋণ' },
  loan_payments: { en: 'Loan Payments', bn: 'ঋণ পরিশোধ' },
  custom_form_fields: { en: 'Custom Fields', bn: 'কাস্টম ফিল্ড' },
  form_field_config: { en: 'Field Config', bn: 'ফিল্ড কনফিগ' },
  module_config: { en: 'Module Config', bn: 'মডিউল কনফিগ' },
  app_notifications: { en: 'Notifications', bn: 'নোটিফিকেশন' },
};

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function BackupRestoreProgress({ state }: BackupRestoreProgressProps) {
  const { language } = useLanguage();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!state || state.phase === 'complete' || state.phase === 'error') return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - state.startTime);
    }, 500);
    return () => clearInterval(interval);
  }, [state?.startTime, state?.phase]);

  if (!state) return null;

  const percentage = state.totalTables > 0
    ? Math.round((state.processedTables / state.totalTables) * 100)
    : 0;

  const isBackup = state.mode === 'backup';
  const isComplete = state.phase === 'complete';
  const isError = state.phase === 'error';
  const ModeIcon = isBackup ? Download : RotateCcw;

  const getTableLabel = (table: string) => {
    const labels = TABLE_LABELS[table];
    if (labels) return language === 'bn' ? labels.bn : labels.en;
    return table.replace(/_/g, ' ');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fetching': return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
      case 'done': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'error': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const phaseLabel = () => {
    if (isComplete) return language === 'bn' ? 'সম্পন্ন!' : 'Complete!';
    if (isError) return language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error occurred';
    switch (state.phase) {
      case 'preparing': return language === 'bn' ? 'প্রস্তুত হচ্ছে...' : 'Preparing...';
      case 'processing': return language === 'bn'
        ? (isBackup ? 'ডেটা সংগ্রহ হচ্ছে...' : 'পুনরুদ্ধার হচ্ছে...')
        : (isBackup ? 'Fetching data...' : 'Restoring data...');
      case 'finalizing': return language === 'bn' ? 'চূড়ান্ত করা হচ্ছে...' : 'Finalizing...';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="rounded-xl border border-border bg-card shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className={`px-4 py-3 flex items-center gap-3 ${
          isComplete ? 'bg-green-500/10' : isError ? 'bg-destructive/10' : 'bg-primary/5'
        }`}>
          <div className={`p-2 rounded-lg ${
            isComplete ? 'bg-green-500/20' : isError ? 'bg-destructive/20' : 'bg-primary/10'
          }`}>
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : isError ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <ModeIcon className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground">
              {isBackup
                ? (language === 'bn' ? 'ডাটাবেস ব্যাকআপ' : 'Database Backup')
                : (language === 'bn' ? 'ডাটাবেস রিস্টোর' : 'Database Restore')}
            </h4>
            <p className="text-xs text-muted-foreground">{phaseLabel()}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{percentage}%</p>
            <p className="text-xs text-muted-foreground">{formatElapsed(elapsed)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pt-3">
          <Progress value={percentage} className="h-2.5" />
          <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
            <span>
              {state.processedTables} / {state.totalTables}{' '}
              {language === 'bn' ? 'টেবিল' : 'tables'}
            </span>
            <span>
              {state.processedItems.toLocaleString()}{' '}
              {language === 'bn' ? 'আইটেম' : 'items'}
            </span>
          </div>
        </div>

        {/* Current Table */}
        {state.phase === 'processing' && state.currentTable && (
          <div className="px-4 py-2">
            <motion.div
              key={state.currentTable}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 py-1.5 px-3 bg-primary/5 rounded-lg"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">
                {getTableLabel(state.currentTable)}
              </span>
              <HardDrive className="h-3 w-3 text-muted-foreground ml-auto" />
            </motion.div>
          </div>
        )}

        {/* Table List */}
        <ScrollArea className="max-h-[200px] px-4 pb-3">
          <div className="space-y-0.5 mt-1">
            {state.tables.filter(t => t.status !== 'pending').map((t) => (
              <motion.div
                key={t.table}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 py-1 text-xs"
              >
                {getStatusIcon(t.status)}
                <span className={`flex-1 ${t.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {getTableLabel(t.table)}
                </span>
                {t.itemCount !== undefined && t.itemCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {t.itemCount}
                  </Badge>
                )}
                {t.errorMessage && (
                  <span className="text-[10px] text-destructive truncate max-w-[120px]">{t.errorMessage}</span>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {/* Errors Summary */}
        {state.errors.length > 0 && (
          <div className="px-4 pb-3">
            <div className="p-2 bg-destructive/10 rounded-lg text-xs text-destructive space-y-0.5">
              <p className="font-medium">
                {language === 'bn' ? `${state.errors.length}টি ত্রুটি` : `${state.errors.length} error(s)`}
              </p>
              {state.errors.slice(0, 3).map((err, i) => (
                <p key={i} className="truncate opacity-80">• {err}</p>
              ))}
              {state.errors.length > 3 && (
                <p className="opacity-60">...+{state.errors.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {/* Complete Summary */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 pb-3"
          >
            <div className="p-3 bg-green-500/10 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {isBackup
                    ? (language === 'bn' ? 'ব্যাকআপ সফল!' : 'Backup successful!')
                    : (language === 'bn' ? 'রিস্টোর সফল!' : 'Restore successful!')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {state.processedItems.toLocaleString()} {language === 'bn' ? 'আইটেম প্রসেস হয়েছে' : 'items processed'}{' '}
                  ({formatElapsed(elapsed)})
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
