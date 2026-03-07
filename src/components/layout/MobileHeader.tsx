import { useState } from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { DashboardModeSwitcher } from './DashboardModeSwitcher';
import { QuickAddButton } from '@/components/quick-add/QuickAddButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function MobileHeader() {
  const { signOut, user } = useAuth();
  const { t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border safe-area-pt">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">L</span>
          </div>
          <span className="font-semibold text-foreground">LifeOS</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          <DashboardModeSwitcher />
          <NotificationBell />
          <QuickAddButton />
          
          {/* User Profile Sheet */}
          <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-xs font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-sidebar border-sidebar-border z-[60]">
              <SheetHeader>
                <SheetTitle className="text-sidebar-foreground">
                  {t('settings.profile') || 'Profile'}
                </SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sidebar-foreground truncate">
                      {user?.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setProfileOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('settings.logout') || 'Sign Out'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <GlobalSearch />
      </div>
    </header>
  );
}
