import { useState } from 'react';
import { Settings as SettingsIcon, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SettingsNav, SettingsCategory } from '@/components/settings/SettingsNav';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { PreferencesSettings } from '@/components/settings/PreferencesSettings';
import { SecurityOverview } from '@/components/settings/SecurityOverview';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { SessionManagement } from '@/components/settings/SessionManagement';
import { PasswordChange } from '@/components/settings/PasswordChange';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { BiometricManagement } from '@/components/settings/BiometricManagement';
import { TrustedDevicesManagement } from '@/components/settings/TrustedDevicesManagement';
import { DataExport } from '@/components/settings/DataExport';
import { LicenseSettings } from '@/components/settings/LicenseSettings';
import { LocationReminders } from '@/components/pwa/LocationReminders';
import { CalendarIntegrationSettings } from '@/components/settings/CalendarIntegrationSettings';
import { AdminSettings } from '@/components/settings/AdminSettings';
import { AiSettings } from '@/components/settings/AiSettings';
import { AiHistory } from '@/components/settings/AiHistory';
import { SelfHostedHealthCard } from '@/components/settings/SelfHostedHealthCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';
import { floatingHeaderClass, pageTitleClass, surfaceCardClass } from '@/lib/design-tokens';
import { isSelfHosted } from '@/lib/selfHostedConfig';

export default function Settings() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');
  const { hasRole: isAdmin, recheckRoles } = useIsAdmin();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleCategoryChange = (category: SettingsCategory) => {
    setActiveCategory(category);
    setMobileNavOpen(false);
  };

  // Map admin sub-categories to their tab value for AdminSettings
  const getAdminTab = (): string | null => {
    const adminTabMap: Record<string, string> = {
      'admin-general': 'general',
      'admin-modules': 'modules',
      'admin-users': 'users',
      'admin-workspaces': 'workspaces',
      'admin-fields': 'custom-fields',
      'admin-visibility': 'field-visibility',
      'admin-email': 'email',
      'admin-security': 'security',
      'admin-integrations': 'integrations',
      'admin-license': 'license',
      'admin-desktop': 'desktop',
    };
    return adminTabMap[activeCategory] || null;
  };

  const renderContent = () => {
    const adminTab = getAdminTab();
    if (adminTab) {
      return <AdminSettings activeTab={adminTab} onAdminStatusChange={() => recheckRoles()} />;
    }

    switch (activeCategory) {
      case 'profile':
        return <ProfileSettings />;
      case 'language':
        return <LanguageSettings />;
      case 'preferences':
        return <PreferencesSettings />;
      case 'security':
        return <SecurityOverview />;
      case 'password':
        return <PasswordChange />;
      case '2fa':
        return <TwoFactorAuth />;
      case 'sessions':
        return <SessionManagement />;
      case 'devices':
        return <TrustedDevicesManagement />;
      case 'biometric':
        return <BiometricManagement />;
      case 'notifications':
        return <NotificationSettings />;
      case 'calendar':
        return <CalendarIntegrationSettings />;
      case 'backup':
        return <DataExport />;
      case 'ai':
        return <AiSettings />;
      case 'ai-history':
        return <AiHistory />;
      case 'license':
        return <LicenseSettings />;
      case 'location':
        return <LocationReminders />;
      case 'admin':
        return <AdminSettings activeTab="general" onAdminStatusChange={() => recheckRoles()} />;
      default:
        return <ProfileSettings />;
    }
  };

  const getCategoryTitle = () => {
    const titles: Record<string, { en: string; bn: string }> = {
      profile: { en: 'Profile', bn: 'প্রোফাইল' },
      language: { en: 'Language', bn: 'ভাষা' },
      preferences: { en: 'Preferences', bn: 'পছন্দসমূহ' },
      security: { en: 'Security Overview', bn: 'নিরাপত্তা ওভারভিউ' },
      password: { en: 'Password', bn: 'পাসওয়ার্ড' },
      '2fa': { en: 'Two-Factor Authentication', bn: 'টু-ফ্যাক্টর অথেন্টিকেশন' },
      sessions: { en: 'Active Sessions', bn: 'সক্রিয় সেশন' },
      devices: { en: 'Trusted Devices', bn: 'বিশ্বস্ত ডিভাইস' },
      biometric: { en: 'Biometric Authentication', bn: 'বায়োমেট্রিক অথেন্টিকেশন' },
      notifications: { en: 'Notifications', bn: 'নোটিফিকেশন' },
      calendar: { en: 'Calendar Sync', bn: 'ক্যালেন্ডার সিঙ্ক' },
      backup: { en: 'Backup & Restore', bn: 'ব্যাকআপ ও রিস্টোর' },
      license: { en: 'License', bn: 'লাইসেন্স' },
      admin: { en: 'Admin Panel', bn: 'এডমিন প্যানেল' },
      ai: { en: 'AI Settings', bn: 'AI সেটিংস' },
      'ai-history': { en: 'AI History', bn: 'AI ইতিহাস' },
      'admin-general': { en: 'Admin — General', bn: 'এডমিন — সাধারণ' },
      'admin-modules': { en: 'Admin — Modules', bn: 'এডমিন — মডিউল' },
      'admin-users': { en: 'Admin — Users & Roles', bn: 'এডমিন — ইউজার ও রোল' },
      'admin-workspaces': { en: 'Admin — Workspaces', bn: 'এডমিন — ওয়ার্কস্পেস' },
      'admin-fields': { en: 'Admin — Custom Fields', bn: 'এডমিন — কাস্টম ফিল্ড' },
      'admin-visibility': { en: 'Admin — Field Visibility', bn: 'এডমিন — দৃশ্যমানতা' },
      'admin-email': { en: 'Admin — Email Config', bn: 'এডমিন — ইমেইল কনফিগ' },
      'admin-security': { en: 'Admin — Security', bn: 'এডমিন — সিকিউরিটি' },
      'admin-integrations': { en: 'Admin — Integrations', bn: 'এডমিন — ইন্টিগ্রেশন' },
      'admin-license': { en: 'Admin — License', bn: 'এডমিন — লাইসেন্স' },
      'admin-desktop': { en: 'Admin — Desktop App', bn: 'এডমিন — ডেস্কটপ অ্যাপ' },
    };
    const title = titles[activeCategory] || titles.profile;
    return language === 'bn' ? title.bn : title.en;
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)]">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={`w-64 flex-shrink-0 border-r border-border/80 bg-card/60 backdrop-blur-sm ${surfaceCardClass}`}>
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              {t('settings.title')}
            </h1>
          </div>
          <SettingsNav
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            isAdmin={isAdmin}
          />
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        {isMobile && (
          <div className={`${floatingHeaderClass} z-10 flex items-center gap-3 p-4`}>
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-4 border-b border-border">
                  <h1 className="text-lg font-semibold flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    {t('settings.title')}
                  </h1>
                </div>
                <SettingsNav
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                  isAdmin={isAdmin}
                />
              </SheetContent>
            </Sheet>
            <h2 className="font-semibold">{getCategoryTitle()}</h2>
          </div>
        )}

        <div className="app-page-shell max-w-2xl p-4 md:p-6">
          {!isMobile && (
            <h2 className={`${pageTitleClass} mb-6 text-xl`}>{getCategoryTitle()}</h2>
          )}
          {isSelfHosted() ? <SelfHostedHealthCard /> : null}
          <SectionErrorBoundary sectionName={getCategoryTitle()}>
            {renderContent()}
          </SectionErrorBoundary>
        </div>
      </main>
    </div>
  );
}
