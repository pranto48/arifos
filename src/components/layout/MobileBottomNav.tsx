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
  Timer
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { useModuleConfig } from '@/hooks/useModuleConfig';
import { cn } from '@/lib/utils';
import { useState } from 'react';
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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {filteredPrimaryItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              'flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg transition-all active:scale-95 relative',
              isActive(item.url)
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <item.icon className={cn(
              'h-5 w-5',
              isActive(item.url) && 'text-primary'
            )} />
            <span className="text-[10px] font-medium">{t(item.titleKey)}</span>
            {isActive(item.url) && (
              <div className="absolute bottom-1 w-6 h-0.5 bg-primary rounded-full" />
            )}
          </NavLink>
        ))}
        
        {/* More Menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg transition-all active:scale-95',
                menuOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t('nav.more') || 'More'}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-sidebar border-sidebar-border z-[60]">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-sidebar-foreground text-left">
                {t('nav.allFeatures') || 'All Features'}
              </SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-3 pb-safe overflow-y-auto max-h-[calc(70vh-100px)]">
              {filteredAllNavItems.map(item => (
                <button
                  key={item.url}
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(item.url);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all active:scale-95',
                    isActive(item.url)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary/50 text-sidebar-foreground hover:bg-secondary'
                  )}
                >
                  <item.icon className="h-6 w-6" />
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
