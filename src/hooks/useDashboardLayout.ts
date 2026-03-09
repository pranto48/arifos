import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';

export interface DashboardWidget {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_OFFICE_WIDGETS: DashboardWidget[] = [
  { id: 'task-completion', name: 'Task Completion', enabled: true, order: 0 },
  { id: 'tasks-breakdown', name: 'Tasks Breakdown', enabled: true, order: 1 },
  { id: 'task-categories', name: 'Task Categories', enabled: true, order: 2 },
  { id: 'device-categories', name: 'Device Categories', enabled: true, order: 3 },
  { id: 'device-report', name: 'Device Inventory Report', enabled: true, order: 4 },
  { id: 'activity-feed', name: 'Activity Feed', enabled: true, order: 5 },
  { id: 'recent-notes', name: 'Recent Notes', enabled: true, order: 6 },
  { id: 'upcoming-tasks', name: 'Upcoming Tasks', enabled: true, order: 7 },
  { id: 'recent-time', name: 'Time Tracked Today', enabled: true, order: 8 },
  { id: 'goal-progress', name: 'Goal Progress', enabled: true, order: 9 },
  { id: 'ai-suggestions', name: 'AI Smart Suggestions', enabled: true, order: 10 },
  { id: 'ai-anomalies', name: 'AI Anomaly Alerts', enabled: true, order: 11 },
];

const DEFAULT_PERSONAL_WIDGETS: DashboardWidget[] = [
  { id: 'task-completion', name: 'Task Completion', enabled: true, order: 0 },
  { id: 'expense-breakdown', name: 'Expense Breakdown', enabled: true, order: 1 },
  { id: 'goal-cards', name: 'Goal Progress Cards', enabled: true, order: 2 },
  { id: 'goal-chart', name: 'Goal Progress Chart', enabled: true, order: 3 },
  { id: 'budget-summary', name: 'Budget Summary', enabled: true, order: 4 },
  { id: 'activity-feed', name: 'Activity Feed', enabled: true, order: 5 },
  { id: 'recent-notes', name: 'Recent Notes', enabled: true, order: 6 },
  { id: 'upcoming-tasks', name: 'Upcoming Tasks', enabled: true, order: 7 },
  { id: 'recent-time', name: 'Time Tracked Today', enabled: true, order: 8 },
  { id: 'family-events', name: 'Family Events', enabled: true, order: 9 },
  { id: 'ai-suggestions', name: 'AI Smart Suggestions', enabled: true, order: 10 },
  { id: 'ai-anomalies', name: 'AI Anomaly Alerts', enabled: true, order: 11 },
];

export function useDashboardLayout() {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const storageKey = `dashboard-layout-${mode}-${user?.id || 'default'}`;

  // Load layout from localStorage
  useEffect(() => {
    const defaultWidgets = mode === 'office' ? DEFAULT_OFFICE_WIDGETS : DEFAULT_PERSONAL_WIDGETS;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as DashboardWidget[];
        // Merge with defaults to handle new widgets
        const merged = defaultWidgets.map(defaultWidget => {
          const savedWidget = parsed.find(w => w.id === defaultWidget.id);
          return savedWidget || defaultWidget;
        });
        // Sort by order
        merged.sort((a, b) => a.order - b.order);
        setWidgets(merged);
      } else {
        setWidgets(defaultWidgets);
      }
    } catch {
      setWidgets(defaultWidgets);
    }
  }, [mode, storageKey]);

  // Save layout to localStorage
  const saveLayout = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem(storageKey, JSON.stringify(newWidgets));
  }, [storageKey]);

  // Toggle widget visibility
  const toggleWidget = useCallback((widgetId: string) => {
    const updated = widgets.map(w => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    saveLayout(updated);
  }, [widgets, saveLayout]);

  // Reorder widgets
  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    const enabledWidgets = widgets.filter(w => w.enabled);
    const reordered = [...enabledWidgets];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    
    // Update order values
    const updatedEnabled = reordered.map((w, i) => ({ ...w, order: i }));
    
    // Merge back with disabled widgets
    const disabledWidgets = widgets.filter(w => !w.enabled);
    const final = [...updatedEnabled, ...disabledWidgets];
    
    saveLayout(final);
  }, [widgets, saveLayout]);

  // Reset to defaults
  const resetLayout = useCallback(() => {
    const defaultWidgets = mode === 'office' ? DEFAULT_OFFICE_WIDGETS : DEFAULT_PERSONAL_WIDGETS;
    saveLayout(defaultWidgets);
  }, [mode, saveLayout]);

  const enabledWidgets = widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  return {
    widgets,
    enabledWidgets,
    isCustomizing,
    setIsCustomizing,
    toggleWidget,
    reorderWidgets,
    resetLayout,
  };
}
