import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  Calendar,
  Settings,
  Menu,
  HeadsetIcon,
  Target,
  Wallet,
  Repeat,
  Users as UsersIcon,
  HardDrive,
  DollarSign,
  TrendingUp,
  Landmark,
  Lightbulb,
  Ticket,
  Timer,
  PhoneCall,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { TranslationKey } from '@/translations';

interface NavItem {
  titleKey: TranslationKey;
  url: string;
  icon: any;
  personalOnly?: boolean;
  officeOnly?: boolean;
  moduleName?: string;
}

// Primary nav items for bottom bar (max 4 + more)
const primaryNavItems: NavItem[] = [
  { titleKey: 'nav.dashboard', url: '/', icon: LayoutDashboard },
  { titleKey: 'nav.tasks', url: '/tasks', icon: CheckSquare, moduleName: 'tasks' },
  { titleKey: 'nav.calendar', url: '/calendar', icon: Calendar, moduleName: 'calendar' },
  { titleKey: 'nav.notes', url: '/notes', icon: FileText, moduleName: 'notes' },
];

// All nav items for the "more" menu
const allNavItems: NavItem[] = [
  { titleKey: 'nav.dashboard', url: '/', icon: LayoutDashboard },
  { titleKey: 'nav.calendar', url: '/calendar', icon: Calendar, moduleName: 'calendar' },
  { titleKey: 'nav.tasks', url: '/tasks', icon: CheckSquare, moduleName: 'tasks' },
  { titleKey: 'nav.notes', url: '/notes', icon: FileText, moduleName: 'notes' },
  { titleKey: 'nav.supportUsers', url: '/support-users', icon: HeadsetIcon, officeOnly: true, moduleName: 'support_users' },
  { titleKey: 'nav.deviceInventory', url: '/device-inventory', icon: HardDrive, officeOnly: true, moduleName: 'device_inventory' },
  { titleKey: 'nav.ipbxInventory', url: '/ipbx-inventory', icon: PhoneCall, officeOnly: true, moduleName: 'ipbx_inventory' },
  { titleKey: 'nav.supportTickets', url: '/support-tickets', icon: Ticket, officeOnly: true, moduleName: 'support_tickets' },
  { titleKey: 'nav.habits', url: '/habits', icon: Repeat, personalOnly: true, moduleName: 'habits' },
  { titleKey: 'nav.family', url: '/family', icon: UsersIcon, personalOnly: true, moduleName: 'family' },
  { titleKey: 'nav.budget', url: '/budget', icon: Wallet, personalOnly: true, moduleName: 'budget' },
  { titleKey: 'nav.salary', url: '/salary', icon: DollarSign, personalOnly: true, moduleName: 'salary' },
  { titleKey: 'nav.investments', url: '/investments', icon: TrendingUp, personalOnly: true, moduleName: 'investments' },
  { titleKey: 'nav.loans', url: '/loans', icon: Landmark, personalOnly: true, moduleName: 'loans' },
  { titleKey: 'nav.goals', url: '/goals', icon: Target, moduleName: 'goals' },
  { titleKey: 'nav.projects', url: '/projects', icon: Lightbulb, moduleName: 'projects' },
  { titleKey: 'nav.timeTracking', url: '/time-tracking', icon: Timer, moduleName: 'time_tracking' },
  { titleKey: 'nav.settings', url: '/settings', icon: Settings },
];

export function MobileBottomNav() {
  const { t } = useLanguage();
  const { mode } = useDashboardMode();
  const { isModuleEnabled } = useModuleConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { toast } = useToast();


  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const filterItems = (items: NavItem[]) => {
    return items.filter(item => {
      if (mode === 'office' && item.personalOnly) return false;
      if (mode === 'personal' && item.officeOnly) return false;
      if (item.moduleName && !isModuleEnabled(item.moduleName)) return false;
      return true;
    });
  };

  const filteredPrimaryItems = filterItems(primaryNavItems);
  const filteredAllNavItems = filterItems(allNavItems);

  const navFeedback = {
    base: 'group relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 min-h-[60px] transition-all duration-200 ease-out active:scale-[0.96] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    active: 'text-primary bg-primary/12 shadow-[0_8px_24px_-18px_hsl(var(--primary))] ring-1 ring-primary/15',
    inactive: 'text-muted-foreground hover:bg-muted/40 active:bg-muted/60',
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-sidebar-border bg-sidebar/95 backdrop-blur-xl safe-area-pb">
      <div className="mx-auto flex max-w-screen-sm items-center justify-around gap-2 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {filteredPrimaryItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            onClick={() => triggerHaptic(8)}
            className={cn(
              navFeedback.base,
              isActive(item.url) ? navFeedback.active : navFeedback.inactive
            )}
          >
            <item.icon className={cn(
              'h-5 w-5 transition-all duration-200 group-active:scale-90',
              isActive(item.url) ? 'text-primary scale-110' : 'group-hover:-translate-y-0.5'
            )} />
            <span className="text-[11px] font-medium leading-none">{t(item.titleKey)}</span>
            <span
              className={cn(
                'absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-primary transition-opacity duration-200',
                isActive(item.url) ? 'opacity-100' : 'opacity-0'
              )}
            />
          </NavLink>
        ))}
        
        {/* More Menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              onClick={() => {
                triggerHaptic([10, 15, 10]);
                toast({
                  title: 'Navigation menu open',
                  description: 'Use one tap to jump to any feature.',
                });
              }}
              className={cn(
                navFeedback.base,
                menuOpen ? navFeedback.active : navFeedback.inactive
              )}
            >
              <Menu className={cn('h-5 w-5 transition-all duration-200', menuOpen && 'scale-110 text-primary')} />
              <span className="text-[11px] font-medium leading-none">{t('nav.more') || 'More'}</span>
              <span
                className={cn(
                  'absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-primary transition-opacity duration-200',
                  menuOpen ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="z-[60] h-[72vh] rounded-t-[28px] border-sidebar-border bg-sidebar px-4 pt-3">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-sidebar-foreground text-left">
                {t('nav.allFeatures') || 'All Features'}
              </SheetTitle>
            </SheetHeader>
            <div className="grid max-h-[calc(72vh-100px)] grid-cols-4 gap-3 overflow-y-auto pb-safe">
              {filteredAllNavItems.map(item => (
                <button
                  key={item.url}
                  onClick={() => {
                    triggerHaptic(12);
                    setMenuOpen(false);
                    navigate(item.url);
                  }}
                  className={cn(
                    'group flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-[22px] p-3.5 transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    isActive(item.url)
                      ? 'bg-primary/18 text-primary shadow-[0_14px_30px_-24px_hsl(var(--primary))] ring-1 ring-primary/20'
                      : 'bg-secondary/50 text-sidebar-foreground hover:bg-secondary active:bg-secondary/80'
                  )}
                >
                  <item.icon className={cn('h-6 w-6 transition-transform duration-200 group-active:scale-90', isActive(item.url) && 'scale-105')} />
                  <span className="text-xs font-medium text-center leading-tight">
                    {t(item.titleKey)}
                  </span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
