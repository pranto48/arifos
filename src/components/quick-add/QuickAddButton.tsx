import { useState, useEffect } from 'react';
import { Plus, CheckSquare, FileText, Wallet, Target, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickAddTask } from './QuickAddTask';
import { QuickAddNote } from './QuickAddNote';
import { QuickAddExpense } from './QuickAddExpense';
import { QuickAddGoal } from './QuickAddGoal';
import { VoiceCapture } from './VoiceCapture';
import { useToast } from '@/hooks/use-toast';

const tabs = [
  { id: 'task', label: 'Task', icon: CheckSquare, shortcut: 't' },
  { id: 'note', label: 'Note', icon: FileText, shortcut: 'n' },
  { id: 'expense', label: 'Expense', icon: Wallet, shortcut: 'e' },
  { id: 'goal', label: 'Goal', icon: Target, shortcut: 'g' },
  { id: 'voice', label: 'Voice', icon: Mic, shortcut: 'v' },
];

export function QuickAddButton() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('task');
  const [pressed, setPressed] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const { toast } = useToast();


  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleOpen = (tabId?: string) => {
    if (tabId) setActiveTab(tabId);
    triggerHaptic([10, 20, 10]);
    setPressed(true);
    window.setTimeout(() => setPressed(false), 180);
    setOpen(true);
    setAnnounceOpen(true);
    toast({ title: 'Quick action open', description: 'Choose what you want to add.' });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpen();
      }
      
      // Direct shortcuts when modal is closed
      if (!open && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        const tab = tabs.find(t => t.shortcut === e.key.toLowerCase());
        if (tab) {
          handleOpen(tab.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!announceOpen) return;

    const timer = window.setTimeout(() => setAnnounceOpen(false), 220);
    return () => window.clearTimeout(timer);
  }, [announceOpen]);

  const handleClose = () => {
    setOpen(false);
    setAnnounceOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => handleOpen()}
        size="icon"
        className={`h-11 w-11 rounded-2xl bg-primary text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 active:scale-95 md:h-10 md:w-auto md:px-4 ${pressed ? 'scale-95 shadow-inner' : 'scale-100'} ${announceOpen || open ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background' : ''}`}
      >
        <Plus className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline ml-2">Quick Add</span>
        <kbd className="hidden lg:inline-flex ml-2 h-5 select-none items-center gap-1 rounded border bg-primary-foreground/10 px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          triggerHaptic(8);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border mx-4 md:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Quick Add</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 bg-muted/50 p-1">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center justify-center gap-1 data-[state=active]:bg-background data-[state=active]:text-foreground px-1.5 py-2"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-xs md:text-sm">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-4">
              <TabsContent value="task" className="mt-0">
                <QuickAddTask onClose={handleClose} />
              </TabsContent>
              <TabsContent value="note" className="mt-0">
                <QuickAddNote onClose={handleClose} />
              </TabsContent>
              <TabsContent value="expense" className="mt-0">
                <QuickAddExpense onClose={handleClose} />
              </TabsContent>
              <TabsContent value="goal" className="mt-0">
                <QuickAddGoal onClose={handleClose} />
              </TabsContent>
              <TabsContent value="voice" className="mt-0">
                <VoiceCapture onClose={handleClose} />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
