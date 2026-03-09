import { useState } from 'react';
import { 
  User, Shield, Bell, Languages, Calendar, Database, Crown, 
  ChevronRight, ChevronDown, Settings, Fingerprint, Smartphone, KeyRound, Lock, Key,
  LayoutGrid, Users, Briefcase, FormInput, ToggleLeft, Mail, Sparkles, MapPin
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export type SettingsCategory = 
  | 'profile' 
  | 'language' 
  | 'security' 
  | 'password'
  | '2fa'
  | 'sessions'
  | 'devices'
  | 'biometric'
  | 'notifications' 
  | 'calendar' 
  | 'backup' 
  | 'license'
  | 'ai'
  | 'location'
  | 'admin'
  | 'admin-general'
  | 'admin-modules'
  | 'admin-users'
  | 'admin-workspaces'
  | 'admin-fields'
  | 'admin-visibility'
  | 'admin-email'
  | 'admin-security'
  | 'admin-integrations'
  | 'admin-license'
  | 'preferences';

interface SettingsNavProps {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
  isAdmin: boolean;
}

interface NavItem {
  id: SettingsCategory;
  labelEn: string;
  labelBn: string;
  icon: React.ReactNode;
  group: 'account' | 'security' | 'app' | 'admin';
  isSubItem?: boolean;
  parentId?: SettingsCategory;
}

const navItems: NavItem[] = [
  // Account Group
  { id: 'profile', labelEn: 'Profile', labelBn: 'প্রোফাইল', icon: <User className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'account' },
  { id: 'language', labelEn: 'Language', labelBn: 'ভাষা', icon: <Languages className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'account' },
  { id: 'preferences', labelEn: 'Preferences', labelBn: 'পছন্দসমূহ', icon: <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'account' },
  
  // Security Group
  { id: 'password', labelEn: 'Password', labelBn: 'পাসওয়ার্ড', icon: <KeyRound className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'security' },
  { id: '2fa', labelEn: 'Two-Factor Auth', labelBn: 'টু-ফ্যাক্টর অথ', icon: <Lock className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'security' },
  { id: 'sessions', labelEn: 'Sessions', labelBn: 'সেশন', icon: <Shield className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'security' },
  { id: 'devices', labelEn: 'Trusted Devices', labelBn: 'বিশ্বস্ত ডিভাইস', icon: <Smartphone className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'security' },
  { id: 'biometric', labelEn: 'Biometrics', labelBn: 'বায়োমেট্রিক', icon: <Fingerprint className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'security' },
  
  // App Group
  { id: 'notifications', labelEn: 'Notifications', labelBn: 'নোটিফিকেশন', icon: <Bell className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'app' },
  { id: 'calendar', labelEn: 'Calendar Sync', labelBn: 'ক্যালেন্ডার সিঙ্ক', icon: <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'app' },
  { id: 'backup', labelEn: 'Backup & Restore', labelBn: 'ব্যাকআপ ও রিস্টোর', icon: <Database className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'app' },
  { id: 'ai', labelEn: 'AI Settings', labelBn: 'AI সেটিংস', icon: <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'app' },
  { id: 'license', labelEn: 'License', labelBn: 'লাইসেন্স', icon: <Key className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'app' },
  { id: 'location', labelEn: 'Location Reminders', labelBn: 'লোকেশন রিমাইন্ডার', icon: <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'app' },
  
  // Admin Group - Parent
  { id: 'admin', labelEn: 'Admin Panel', labelBn: 'এডমিন প্যানেল', icon: <Crown className="h-3.5 w-3.5 md:h-4 md:w-4" />, group: 'admin' },
  // Admin Sub-items
  { id: 'admin-general', labelEn: 'General', labelBn: 'সাধারণ', icon: <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-modules', labelEn: 'Modules', labelBn: 'মডিউল', icon: <LayoutGrid className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-users', labelEn: 'Users & Roles', labelBn: 'ইউজার ও রোল', icon: <Users className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-workspaces', labelEn: 'Workspaces', labelBn: 'ওয়ার্কস্পেস', icon: <Briefcase className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-fields', labelEn: 'Custom Fields', labelBn: 'কাস্টম ফিল্ড', icon: <FormInput className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-visibility', labelEn: 'Field Visibility', labelBn: 'দৃশ্যমানতা', icon: <ToggleLeft className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-email', labelEn: 'Email Config', labelBn: 'ইমেইল কনফিগ', icon: <Mail className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-security', labelEn: 'Security', labelBn: 'সিকিউরিটি', icon: <Shield className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-integrations', labelEn: 'Integrations', labelBn: 'ইন্টিগ্রেশন', icon: <Key className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
  { id: 'admin-license', labelEn: 'License', labelBn: 'লাইসেন্স', icon: <Crown className="h-3 w-3 md:h-3.5 md:w-3.5" />, group: 'admin', isSubItem: true, parentId: 'admin' },
];

const groupLabels = {
  account: { en: 'Account', bn: 'অ্যাকাউন্ট' },
  security: { en: 'Security', bn: 'নিরাপত্তা' },
  app: { en: 'Application', bn: 'অ্যাপ্লিকেশন' },
  admin: { en: 'Administration', bn: 'প্রশাসন' },
};

export function SettingsNav({ activeCategory, onCategoryChange, isAdmin }: SettingsNavProps) {
  const { language } = useLanguage();
  const [adminExpanded, setAdminExpanded] = useState(
    activeCategory.startsWith('admin')
  );

  const isAdminSubActive = activeCategory.startsWith('admin-');

  const filteredItems = navItems.filter(item => {
    if (item.group === 'admin' && !isAdmin) return false;
    return true;
  });

  const groups = ['account', 'security', 'app', 'admin'] as const;

  const handleItemClick = (item: NavItem) => {
    if (item.id === 'admin' && !item.isSubItem) {
      const willExpand = !adminExpanded;
      setAdminExpanded(willExpand);
      if (willExpand && !isAdminSubActive) {
        onCategoryChange('admin-general');
      }
    } else {
      onCategoryChange(item.id);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 md:space-y-6 p-3 md:p-4">
        {groups.map(group => {
          const groupItems = filteredItems.filter(item => item.group === group && !item.isSubItem);
          const subItems = filteredItems.filter(item => item.group === group && item.isSubItem);
          if (groupItems.length === 0) return null;

          return (
            <div key={group} className="space-y-1">
              <h3 className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 md:px-3 mb-1.5 md:mb-2">
                {language === 'bn' ? groupLabels[group].bn : groupLabels[group].en}
              </h3>
              {groupItems.map(item => {
                const isParentWithSubs = item.id === 'admin' && subItems.length > 0;
                const isActive = isParentWithSubs 
                  ? isAdminSubActive || activeCategory === 'admin'
                  : activeCategory === item.id;

                return (
                  <div key={item.id}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 md:gap-3 h-9 md:h-10 px-2 md:px-3",
                        isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                      )}
                      onClick={() => handleItemClick(item)}
                    >
                      {item.icon}
                      <span className="flex-1 text-left text-xs md:text-sm">
                        {language === 'bn' ? item.labelBn : item.labelEn}
                      </span>
                      {isParentWithSubs ? (
                        <ChevronDown className={cn(
                          "h-3 w-3 md:h-4 md:w-4 text-muted-foreground transition-transform duration-200",
                          !adminExpanded && "-rotate-90",
                          isActive && "text-primary"
                        )} />
                      ) : (
                        <ChevronRight className={cn(
                          "h-3 w-3 md:h-4 md:w-4 text-muted-foreground transition-transform",
                          activeCategory === item.id && "text-primary"
                        )} />
                      )}
                    </Button>

                    {/* Admin Sub-items */}
                    {isParentWithSubs && adminExpanded && (
                      <div className="ml-3 md:ml-4 mt-1 space-y-0.5 border-l-2 border-border pl-2 md:pl-3">
                        {subItems.map(sub => (
                          <Button
                            key={sub.id}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-2 h-8 md:h-9 px-2 md:px-3 text-muted-foreground",
                              activeCategory === sub.id && "bg-primary/10 text-primary hover:bg-primary/15"
                            )}
                            onClick={() => onCategoryChange(sub.id)}
                          >
                            {sub.icon}
                            <span className="flex-1 text-left text-[11px] md:text-xs">
                              {language === 'bn' ? sub.labelBn : sub.labelEn}
                            </span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
