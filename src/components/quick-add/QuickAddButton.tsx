import { useState, useEffect } from 'react';
import { Plus, X, CheckSquare, FileText, Wallet, Target, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickAddTask } from './QuickAddTask';
import { QuickAddNote } from './QuickAddNote';
import { QuickAddExpense } from './QuickAddExpense';
import { QuickAddGoal } from './QuickAddGoal';
import { VoiceCapture } from './VoiceCapture';

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      
      // Direct shortcuts when modal is closed
      if (!open && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        const tab = tabs.find(t => t.shortcut === e.key.toLowerCase());
        if (tab) {
          setActiveTab(tab.id);
          setOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-9 md:h-10 md:w-auto md:px-4"
      >
        <Plus className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden md:inline ml-2">Quick Add</span>
        <kbd className="hidden lg:inline-flex ml-2 h-5 select-none items-center gap-1 rounded border bg-primary-foreground/10 px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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
