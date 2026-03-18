import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Theme = 'dark-modern' | 'clean-light' | 'system';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.classList.remove('theme-dark-modern', 'theme-clean-light', 'dark', 'light');

  if (theme === 'system') {
    const sys = getSystemTheme();
    if (sys === 'dark') {
      root.classList.add('theme-dark-modern', 'dark');
    } else {
      root.classList.add('theme-clean-light', 'light');
    }
  } else {
    if (theme === 'dark-modern') {
      root.classList.add('theme-dark-modern', 'dark');
    } else {
      root.classList.add('theme-clean-light', 'light');
    }
  }
}

export function ThemeSettings() {
  const { language } = useLanguage();
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('lifeos-theme');
    if (savedTheme === 'dark') return 'dark-modern';
    if (savedTheme === 'light') return 'clean-light';
    return (savedTheme as Theme) || 'dark-modern';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('lifeos-theme', theme);
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const options: { value: Theme; icon: typeof Sun; labelEn: string; labelBn: string }[] = [
    { value: 'dark-modern', icon: Moon, labelEn: 'Default dark modern', labelBn: 'ডিফল্ট ডার্ক মডার্ন' },
    { value: 'clean-light', icon: Sun, labelEn: 'Clean light', labelBn: 'ক্লিন লাইট' },
    { value: 'system', icon: Monitor, labelEn: 'System', labelBn: 'সিস্টেম' },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Sun className="h-5 w-5" />
          {language === 'bn' ? 'থিম' : 'Theme'}
        </CardTitle>
        <CardDescription>
          {language === 'bn' ? 'অ্যাপের রঙের থিম নির্বাচন করুন।' : 'Choose your preferred color theme.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {options.map(opt => (
            <Button
              key={opt.value}
              variant={theme === opt.value ? 'default' : 'outline'}
              className={cn(
                'flex flex-col items-center gap-2 h-auto py-4',
                theme === opt.value && 'ring-2 ring-primary'
              )}
              onClick={() => setTheme(opt.value)}
            >
              <opt.icon className="h-5 w-5" />
              <span className="text-xs">{language === 'bn' ? opt.labelBn : opt.labelEn}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Export for use on app mount
export function initializeTheme() {
  const savedTheme = localStorage.getItem('lifeos-theme');
  const theme = savedTheme === 'dark'
    ? 'dark-modern'
    : savedTheme === 'light'
      ? 'clean-light'
      : (savedTheme as Theme) || 'dark-modern';
  applyTheme(theme);
}
