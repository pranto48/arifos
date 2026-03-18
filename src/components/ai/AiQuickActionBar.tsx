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
import { PRODUCT_ANALYTICS_EVENTS, trackProductAnalyticsEvent } from '@/lib/productAnalytics';

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
      void trackProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.quickActionOpen);
    }
  }, [open]);

  const groupedActions = useMemo(() => {
    return {
      navigation: actions.filter((action) => action.group === 'navigation'),
      createActions: actions.filter((action) => action.group === 'create-actions'),
      aiActions: actions.filter((action) => action.group === 'ai-actions'),
      adminSystem: actions.filter((action) => action.group === 'admin-system'),
    };
  }, [actions]);

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

  return (
    <>
      <Button
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'icon' : 'sm'}
        onClick={() => {
          setOpen(true);
        }}
        className={compact ? 'h-9 w-9' : ''}
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
                {recentActions.map(({ executedAt, action }, index) => (
                  <CommandItem
                    key={`${action.id}-${executedAt}-${index}`}
                    value={`${action.label} ${action.aliases.join(' ')} recent`}
                    onSelect={() => runAction(action.id)}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    <div className="flex flex-1 items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span>{action.label}</span>
                        <span className="text-xs text-muted-foreground">{action.hint}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Recent</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading={QUICK_ACTION_GROUP_LABELS.navigation}>
            {groupedActions.navigation.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${action.aliases.join(' ')} ${action.group}`}
                onSelect={() => runAction(action.id)}
              >
                <action.icon className="h-4 w-4 mr-2" />
                <div className="flex flex-1 items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span>{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.hint}</span>
                  </div>
                  <kbd className="text-xs text-muted-foreground border px-1.5 py-0.5 rounded">{action.shortcut}</kbd>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={QUICK_ACTION_GROUP_LABELS['create-actions']}>
            {groupedActions.createActions.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${action.aliases.join(' ')} ${action.group}`}
                onSelect={() => runAction(action.id)}
              >
                <action.icon className="h-4 w-4 mr-2" />
                <div className="flex flex-1 items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span>{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.hint}</span>
                  </div>
                  <kbd className="text-xs text-muted-foreground border px-1.5 py-0.5 rounded">{action.shortcut}</kbd>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={QUICK_ACTION_GROUP_LABELS['ai-actions']}>
            {groupedActions.aiActions.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${action.aliases.join(' ')} ${action.group}`}
                onSelect={() => runAction(action.id)}
              >
                <action.icon className="h-4 w-4 mr-2" />
                <div className="flex flex-1 items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span>{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.hint}</span>
                  </div>
                  <kbd className="text-xs text-muted-foreground border px-1.5 py-0.5 rounded">{action.shortcut}</kbd>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={QUICK_ACTION_GROUP_LABELS['admin-system']}>
            {groupedActions.adminSystem.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${action.aliases.join(' ')} ${action.group}`}
                onSelect={() => runAction(action.id)}
              >
                <action.icon className="h-4 w-4 mr-2" />
                <div className="flex flex-1 items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span>{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.hint}</span>
                  </div>
                  <kbd className="text-xs text-muted-foreground border px-1.5 py-0.5 rounded">{action.shortcut}</kbd>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
