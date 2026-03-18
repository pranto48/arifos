import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  getQuickActionHistory,
  QUICK_ACTION_GROUP_LABELS,
  recordQuickActionUsage,
  useQuickActions,
} from '@/components/ai/quickActions';

interface AiQuickActionBarProps {
  compact?: boolean;
}

export function AiQuickActionBar({ compact = false }: AiQuickActionBarProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(getQuickActionHistory());
  const { actions, actionById } = useQuickActions();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setHistory(getQuickActionHistory());
    }
  }, [open]);

  const groups = useMemo(
    () => [
      {
        key: 'navigation',
        heading: QUICK_ACTION_GROUP_LABELS.navigation,
        actions: actions.filter((action) => action.group === 'navigation'),
      },
      {
        key: 'create-actions',
        heading: QUICK_ACTION_GROUP_LABELS['create-actions'],
        actions: actions.filter((action) => action.group === 'create-actions'),
      },
      {
        key: 'ai-actions',
        heading: QUICK_ACTION_GROUP_LABELS['ai-actions'],
        actions: actions.filter((action) => action.group === 'ai-actions'),
      },
      {
        key: 'admin-system',
        heading: QUICK_ACTION_GROUP_LABELS['admin-system'],
        actions: actions.filter((action) => action.group === 'admin-system'),
      },
    ],
    [actions],
  );

  const recentActions = useMemo(
    () =>
      history
        .map((entry) => ({ ...entry, action: actionById[entry.id] }))
        .filter((entry): entry is typeof entry & { action: NonNullable<typeof entry.action> } => Boolean(entry.action)),
    [actionById, history],
  );

  const runAction = async (actionId: string) => {
    const action = actionById[actionId];
    if (!action) return;

    setOpen(false);
    await action.run();
    recordQuickActionUsage(action.id);
    setHistory(getQuickActionHistory());
  };

  const renderActionRow = (actionId: string, recentLabel?: string) => {
    const action = actionById[actionId];
    if (!action) return null;

    return (
      <CommandItem
        key={`${action.id}-${recentLabel ?? 'default'}`}
        value={`${action.label} ${action.aliases.join(' ')} ${action.group} ${action.shortcut}`}
        onSelect={() => runAction(action.id)}
        className="py-3"
      >
        <action.icon className="mr-2 h-4 w-4 shrink-0" />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{action.label}</span>
              {recentLabel && <span className="text-xs text-muted-foreground">{recentLabel}</span>}
            </div>
            <p className="text-xs text-muted-foreground">{action.hint}</p>
            <div className="flex flex-wrap gap-1.5">
              {action.aliases.map((alias) => (
                <span
                  key={`${action.id}-${alias}`}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                >
                  {alias}
                </span>
              ))}
            </div>
          </div>
          <kbd className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">{action.shortcut}</kbd>
        </div>
      </CommandItem>
    );
  };

  return (
    <>
      <Button
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'icon' : 'sm'}
        onClick={() => setOpen(true)}
        className={compact ? `h-11 w-11 rounded-2xl transition-all duration-200 active:scale-[0.96] ${open ? 'bg-primary/10 text-primary shadow-sm' : ''}` : ''}
      >
        <Sparkles className="h-4 w-4" />
        {!compact && <span className="ml-2">AI Quick Action</span>}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Try: weekly report, review, overdue, create task" />
        <CommandList>
          <CommandEmpty>No action found.</CommandEmpty>

          {recentActions.length > 0 && (
            <>
              <CommandGroup heading="Recent Commands">
                {recentActions.map(({ action, executedAt }, index) =>
                  renderActionRow(action.id, index === 0 ? 'Most recent' : new Date(executedAt).toLocaleDateString()),
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groups.map((group, index) => (
            <div key={group.key}>
              <CommandGroup heading={group.heading}>{group.actions.map((action) => renderActionRow(action.id))}</CommandGroup>
              {index < groups.length - 1 && <CommandSeparator />}
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
