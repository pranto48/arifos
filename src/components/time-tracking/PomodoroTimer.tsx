import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings2, Coffee, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { PomodoroSettings } from '@/hooks/useTimeTracking';

interface PomodoroTimerProps {
  settings: PomodoroSettings;
  onSaveSettings: (settings: Partial<Omit<PomodoroSettings, 'id' | 'user_id'>>) => void;
  onSessionComplete: (type: 'work' | 'break', durationSeconds: number) => void;
}

type TimerPhase = 'work' | 'short_break' | 'long_break';

export function PomodoroTimer({ settings, onSaveSettings, onSessionComplete }: PomodoroTimerProps) {
  const { language } = useLanguage();
  const [phase, setPhase] = useState<TimerPhase>('work');
  const [timeLeft, setTimeLeft] = useState(settings.work_duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Local settings state for the dialog
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const getPhaseDuration = useCallback((p: TimerPhase) => {
    switch (p) {
      case 'work': return settings.work_duration * 60;
      case 'short_break': return settings.short_break * 60;
      case 'long_break': return settings.long_break * 60;
    }
  }, [settings]);

  // Timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  // Phase complete
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);

      // Notify
      try {
        new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgkKWsi2A6O2+Qo6V+VUBSiKGfflRDWIugm31WRl+Oo5l4VEtki6SYdVRPaomjlXNTU2+HoJJwUVhzhZ6Ob1FdcoOcjG5SYnGBmotuUmZxgJmJblNpc3+YiG5Ub3N+l4duVXBzfZaHblZyc3yVhm5Xc3N8lIZuWHRzfJSGblh0c3yUhm5YdHN8lIZu').play();
      } catch {}

      if (phase === 'work') {
        const newSessions = sessionsCompleted + 1;
        setSessionsCompleted(newSessions);
        onSessionComplete('work', settings.work_duration * 60);

        // Determine next break
        const nextPhase = newSessions % settings.sessions_before_long_break === 0 ? 'long_break' : 'short_break';
        setPhase(nextPhase);
        setTimeLeft(getPhaseDuration(nextPhase));

        if (settings.auto_start_breaks) {
          setIsRunning(true);
        }
      } else {
        onSessionComplete('break', getPhaseDuration(phase));
        setPhase('work');
        setTimeLeft(settings.work_duration * 60);

        if (settings.auto_start_work) {
          setIsRunning(true);
        }
      }
    }
  }, [timeLeft, isRunning, phase, sessionsCompleted, settings, getPhaseDuration, onSessionComplete]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getPhaseDuration(phase));
  };

  const switchPhase = (newPhase: TimerPhase) => {
    setIsRunning(false);
    setPhase(newPhase);
    setTimeLeft(getPhaseDuration(newPhase));
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalDuration = getPhaseDuration(phase);
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  const phaseColors = {
    work: 'text-primary',
    short_break: 'text-green-500',
    long_break: 'text-blue-500',
  };

  const phaseLabels = {
    work: language === 'bn' ? 'কাজ' : 'Focus',
    short_break: language === 'bn' ? 'ছোট বিরতি' : 'Short Break',
    long_break: language === 'bn' ? 'দীর্ঘ বিরতি' : 'Long Break',
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {language === 'bn' ? 'পমোডোরো টাইমার' : 'Pomodoro Timer'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {sessionsCompleted}/{settings.sessions_before_long_break}
            </Badge>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings2 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{language === 'bn' ? 'পমোডোরো সেটিংস' : 'Pomodoro Settings'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">{language === 'bn' ? 'কাজ (মিনিট)' : 'Work (min)'}</Label>
                      <Input type="number" min={1} max={120} value={localSettings.work_duration}
                        onChange={e => setLocalSettings(prev => ({ ...prev, work_duration: +e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">{language === 'bn' ? 'ছোট বিরতি' : 'Short Break'}</Label>
                      <Input type="number" min={1} max={30} value={localSettings.short_break}
                        onChange={e => setLocalSettings(prev => ({ ...prev, short_break: +e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">{language === 'bn' ? 'দীর্ঘ বিরতি' : 'Long Break'}</Label>
                      <Input type="number" min={1} max={60} value={localSettings.long_break}
                        onChange={e => setLocalSettings(prev => ({ ...prev, long_break: +e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{language === 'bn' ? 'দীর্ঘ বিরতির আগে সেশন' : 'Sessions before long break'}</Label>
                    <Input type="number" min={1} max={10} value={localSettings.sessions_before_long_break}
                      onChange={e => setLocalSettings(prev => ({ ...prev, sessions_before_long_break: +e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{language === 'bn' ? 'অটো বিরতি শুরু' : 'Auto-start breaks'}</Label>
                    <Switch checked={localSettings.auto_start_breaks}
                      onCheckedChange={v => setLocalSettings(prev => ({ ...prev, auto_start_breaks: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{language === 'bn' ? 'অটো কাজ শুরু' : 'Auto-start work'}</Label>
                    <Switch checked={localSettings.auto_start_work}
                      onCheckedChange={v => setLocalSettings(prev => ({ ...prev, auto_start_work: v }))} />
                  </div>
                  <Button className="w-full" onClick={() => {
                    onSaveSettings(localSettings);
                    setSettingsOpen(false);
                  }}>
                    {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Settings'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Phase selector */}
        <div className="flex gap-1 mb-4">
          {(['work', 'short_break', 'long_break'] as TimerPhase[]).map(p => (
            <button
              key={p}
              onClick={() => switchPhase(p)}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                phase === p ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {p === 'work' && <Brain className="h-3 w-3 inline mr-1" />}
              {p !== 'work' && <Coffee className="h-3 w-3 inline mr-1" />}
              {phaseLabels[p]}
            </button>
          ))}
        </div>

        {/* Timer display */}
        <div className="relative flex items-center justify-center py-6">
          {/* Circular progress */}
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className="stroke-muted/30" />
            <motion.circle
              cx="60" cy="60" r="54" fill="none" strokeWidth="6"
              strokeLinecap="round"
              className={phase === 'work' ? 'stroke-primary' : phase === 'short_break' ? 'stroke-green-500' : 'stroke-blue-500'}
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - progress / 100)}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-4xl font-bold ${phaseColors[phase]}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground mt-1">{phaseLabels[phase]}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={resetTimer} className="h-10 w-10">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={toggleTimer}
            className={`h-14 w-14 rounded-full ${phase === 'work' ? '' : phase === 'short_break' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </Button>
          <div className="h-10 w-10" /> {/* Spacer for symmetry */}
        </div>
      </CardContent>
    </Card>
  );
}
