import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { QuickAddButton } from '@/components/quick-add/QuickAddButton';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { MfaGuard } from '@/components/auth/MfaGuard';
import { LicenseGuard } from '@/components/auth/LicenseGuard';
import { DashboardModeSwitcher } from './DashboardModeSwitcher';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileHeader } from './MobileHeader';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your Life OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <LicenseGuard>
      <MfaGuard>
        <div className="min-h-screen bg-background">
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden md:block">
            <AppSidebar />
          </div>
          
          {/* Mobile Header - Only on mobile */}
          <MobileHeader />
          
          {/* Main Content */}
          <main className="md:ml-[72px] lg:ml-[240px] min-h-screen transition-all duration-200 pb-20 md:pb-0">
            {/* Desktop Top Bar - Hidden on mobile */}
            <header className="hidden md:flex sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <GlobalSearch />
                <DashboardModeSwitcher />
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <QuickAddButton />
              </div>
            </header>

            {/* Page Content */}
            <div className="p-4 md:p-6">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation - Only on mobile */}
          <MobileBottomNav />
        </div>
      </MfaGuard>
    </LicenseGuard>
  );
}
