import { useState, useEffect } from 'react';
import { DataExportImportButton } from '@/components/shared/DataExportImportButton';
import { Shield, Users, Key, Loader2, Crown, UserPlus, Trash2, Search, Briefcase, Home, Settings, Calendar, AlertTriangle, Mail, Sparkles, FormInput, ToggleLeft, LayoutGrid, Star, Zap, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Download, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SmtpSettings } from './SmtpSettings';
import { ResendSettings } from './ResendSettings';
import { CustomFormFieldManager } from './CustomFormFieldManager';
import { FormFieldSettings } from './FormFieldSettings';
import { ModuleSettings } from './ModuleSettings';
import { RoleManagement } from './RoleManagement';
import { isSelfHosted, getApiUrl } from '@/lib/selfHostedConfig';
import { resetInternalAnalyticsSettingCache } from '@/lib/productAnalytics';
import {
  getLicenseInfo,
  saveLicenseInfo,
  verifyLicenseViaBackend,
  checkLicenseStatus,
  getPlanFromMaxDevices,
  getInstallationId,
  LICENSE_PLANS,
  LICENSE_PORTAL_URL,
  type LicenseInfo,
} from '@/lib/licenseConfig';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user' | 'inventory_manager' | 'support_manager';
  created_at: string;
}

interface UserSearchResult {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

interface OAuthCredential {
  provider: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  lastUpdated?: string;
}

interface WorkspacePermission {
  id: string;
  user_id: string;
  office_enabled: boolean;
  personal_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminSettingsProps {
  activeTab?: string;
  onAdminStatusChange?: (isAdmin: boolean) => void;
}

export function AdminSettings({ activeTab = 'general', onAdminStatusChange }: AdminSettingsProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { hasRole: isAdmin, loading: roleLoading, recheckRoles } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [oauthCredentials, setOAuthCredentials] = useState<OAuthCredential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  
  // User email cache for displaying in role list
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  
  // Workspace permissions state
  const [workspacePermissions, setWorkspacePermissions] = useState<WorkspacePermission[]>([]);
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [permEmailSearch, setPermEmailSearch] = useState('');
  const [permSearchResults, setPermSearchResults] = useState<UserSearchResult[]>([]);
  const [searchingPermEmail, setSearchingPermEmail] = useState(false);
  const [showPermSearchResults, setShowPermSearchResults] = useState(false);
  const [newPermUserId, setNewPermUserId] = useState('');
  const [newOfficeEnabled, setNewOfficeEnabled] = useState(true);
  const [newPersonalEnabled, setNewPersonalEnabled] = useState(true);
  const [addingPermission, setAddingPermission] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);

  // App settings state
  const [onboardingEnabled, setOnboardingEnabled] = useState(true);
  const [internalAnalyticsEnabled, setInternalAnalyticsEnabled] = useState(true);
  const [portalName, setPortalName] = useState('LifeOS');
  const [portalLogoUrl, setPortalLogoUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // License state
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [licenseServerStatus, setLicenseServerStatus] = useState<any>(null);
  const [loadingLicense, setLoadingLicense] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [verifyingLicense, setVerifyingLicense] = useState(false);
  const windowsExeUrl = (import.meta.env.VITE_WINDOWS_EXE_URL as string | undefined)?.trim() || `${window.location.origin}/downloads/lifeos-setup.exe`;

  useEffect(() => {
    checkAdminStatus();
  }, [user, isAdmin]);

  useEffect(() => {
    onAdminStatusChange?.(isAdmin);
  }, [isAdmin, onAdminStatusChange]);

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (isAdmin) {
        await loadUserRoles();
        await loadOAuthCredentials();
        await loadWorkspacePermissions();
        await loadAppSettings();
        await loadLicenseInfo();
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLicenseInfo = async () => {
    setLoadingLicense(true);
    try {
      const stored = await getLicenseInfo();
      setLicenseInfo(stored);

      if (isSelfHosted()) {
        try {
          const status = await checkLicenseStatus(getApiUrl());
          setLicenseServerStatus(status);
        } catch {}
      }
    } catch (error) {
      console.error('Failed to load license info:', error);
    } finally {
      setLoadingLicense(false);
    }
  };

  const handleLicenseVerify = async () => {
    if (!licenseKeyInput.trim()) return;
    setVerifyingLicense(true);
    try {
      const result = await verifyLicenseViaBackend(licenseKeyInput.trim(), getApiUrl());
      if (result.success) {
        const info: LicenseInfo = {
          licenseKey: licenseKeyInput.substring(0, 4) + '****',
          status: (result.actual_status as any) || 'active',
          maxDevices: result.max_devices || 5,
          expiresAt: result.expires_at || null,
          lastVerified: new Date().toISOString(),
          installationId: getInstallationId(),
          plan: getPlanFromMaxDevices(result.max_devices || 5),
        };
        await saveLicenseInfo(info);
        setLicenseInfo(info);
        setLicenseKeyInput('');
        toast({ title: language === 'bn' ? 'লাইসেন্স যাচাই সফল' : 'License Verified!', description: result.message });
        await loadLicenseInfo();
      } else {
        toast({ title: language === 'bn' ? 'যাচাই ব্যর্থ' : 'Verification Failed', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setVerifyingLicense(false);
    }
  };

  const handleLicenseRefresh = async () => {
    setLoadingLicense(true);
    try {
      if (licenseInfo?.licenseKey && licenseInfo.licenseKey !== 'FREE' && licenseInfo.licenseKey !== '***') {
        const result = await verifyLicenseViaBackend(licenseInfo.licenseKey, getApiUrl());
        if (result.success) {
          toast({ title: language === 'bn' ? 'লাইসেন্স রিফ্রেশ হয়েছে' : 'License Refreshed', description: result.message });
        }
      }
      await loadLicenseInfo();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingLicense(false);
    }
  };

  const handleDownloadWindowsExe = () => {
    const link = document.createElement('a');
    link.href = windowsExeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = 'lifeos-setup.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyExeUrl = async () => {
    try {
      await navigator.clipboard.writeText(windowsExeUrl);
      toast({
        title: language === 'bn' ? 'কপি করা হয়েছে' : 'Copied',
        description: language === 'bn' ? 'ডাউনলোড লিংক কপি হয়েছে।' : 'Download URL copied.',
      });
    } catch {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'লিংক কপি করা যায়নি।' : 'Failed to copy download URL.',
        variant: 'destructive',
      });
    }
  };

  const safeMaskLicenseKey = (value: unknown) => {
    if (typeof value !== 'string' || value.length === 0) return 'N/A';
    if (value === 'FREE') return value;
    return value.length > 8 ? `${value.slice(0, 8)}...` : value;
  };

  const safeInstallationId = (value: unknown) => {
    if (typeof value !== 'string' || value.length === 0) return 'N/A';
    return `${value.slice(0, 24)}...`;
  };

  const safeDateTime = (value: unknown, fallback = 'N/A') => {
    if (value === null || value === undefined || value === '') return fallback;
    let d: Date;
    if (typeof value === 'number') {
      const ms = value < 1e12 ? value * 1000 : value;
      d = new Date(ms);
    } else {
      d = new Date(String(value));
    }
    return Number.isNaN(d.getTime()) ? fallback : d.toLocaleString();
  };

  const safeDate = (value: unknown, fallback = 'N/A') => {
    if (value === null || value === undefined || value === '') return fallback;
    let d: Date;
    if (typeof value === 'number') {
      const ms = value < 1e12 ? value * 1000 : value;
      d = new Date(ms);
    } else {
      d = new Date(String(value));
    }
    return Number.isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
  };

  const getLicensePlanIcon = (plan: string) => {
    switch (plan) {
      case 'professional': return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'standard': return <Zap className="w-5 h-5 text-blue-400" />;
      default: return <Star className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getLicenseStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'free':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Star className="w-3 h-3 mr-1" /> Free</Badge>;
      case 'expired':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="w-3 h-3 mr-1" /> Revoked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const loadAppSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('onboarding_enabled, internal_analytics_enabled, portal_name, portal_logo_url')
        .eq('id', 'default')
        .maybeSingle();
      
      if (data) {
        setOnboardingEnabled(data.onboarding_enabled);
        setInternalAnalyticsEnabled(data.internal_analytics_enabled ?? true);
        setPortalName(data.portal_name?.trim() || 'LifeOS');
        setPortalLogoUrl(data.portal_logo_url?.trim() || '');
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  };

  const updateAppSetting = async (
    updates: {
      onboarding_enabled?: boolean;
      internal_analytics_enabled?: boolean;
      portal_name?: string;
      portal_logo_url?: string | null;
    },
    successMessage: string,
    successMessageBn: string,
  ) => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update(updates)
        .eq('id', 'default');

      if (error) throw error;

      if (typeof updates.onboarding_enabled === 'boolean') {
        setOnboardingEnabled(updates.onboarding_enabled);
      }
      if (typeof updates.internal_analytics_enabled === 'boolean') {
        setInternalAnalyticsEnabled(updates.internal_analytics_enabled);
        resetInternalAnalyticsSettingCache(updates.internal_analytics_enabled);
      }
      if (typeof updates.portal_name === 'string') {
        setPortalName(updates.portal_name.trim() || 'LifeOS');
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'portal_logo_url')) {
        setPortalLogoUrl((updates.portal_logo_url || '').trim());
      }

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? successMessageBn : successMessage,
      });
    } catch (error: any) {
      console.error('Failed to update setting:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' ? 'সেটিং আপডেট ব্যর্থ।' : 'Failed to update setting.'),
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const updateOnboardingSetting = async (enabled: boolean) => {
    await updateAppSetting(
      { onboarding_enabled: enabled },
      `Welcome screen ${enabled ? 'enabled' : 'disabled'}.`,
      `ওয়েলকাম স্ক্রিন ${enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`,
    );
  };

  const updateInternalAnalyticsSetting = async (enabled: boolean) => {
    await updateAppSetting(
      { internal_analytics_enabled: enabled },
      `Internal analytics ${enabled ? 'enabled' : 'disabled'}.`,
      `ইন্টারনাল অ্যানালিটিক্স ${enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`,
    );
  };

  const updatePortalBranding = async () => {
    await updateAppSetting(
      {
        portal_name: portalName.trim() || 'LifeOS',
        portal_logo_url: portalLogoUrl.trim() || null,
      },
      'Portal branding updated.',
      'পোর্টাল ব্র্যান্ডিং আপডেট হয়েছে।',
    );
  };

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setUserRoles(data);
        // Load emails for all user IDs
        const userIds = data.map(r => r.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, email, full_name')
            .in('user_id', userIds);
          
          if (profiles) {
            const emailMap: Record<string, string> = {};
            profiles.forEach(p => {
              emailMap[p.user_id] = p.email || p.full_name || '';
            });
            setUserEmails(emailMap);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user roles:', error);
    }
  };




  const loadWorkspacePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_workspace_permissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setWorkspacePermissions(data as WorkspacePermission[]);
        // Load emails for all user IDs
        const userIds = data.map(r => r.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, email, full_name')
            .in('user_id', userIds);
          
          if (profiles) {
            const emailMap: Record<string, string> = { ...userEmails };
            profiles.forEach(p => {
              emailMap[p.user_id] = p.email || p.full_name || '';
            });
            setUserEmails(emailMap);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load workspace permissions:', error);
    }
  };

  const searchByEmailForPerm = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setPermSearchResults([]);
      setShowPermSearchResults(false);
      return;
    }

    setSearchingPermEmail(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (data) {
        setPermSearchResults(data);
        setShowPermSearchResults(true);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchingPermEmail(false);
    }
  };

  const selectUserForPerm = (result: UserSearchResult) => {
    setNewPermUserId(result.user_id);
    setPermEmailSearch(result.email || result.full_name || result.user_id);
    setShowPermSearchResults(false);
  };

  const addWorkspacePermission = async () => {
    if (!newPermUserId.trim()) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'ইউজার আইডি প্রয়োজন।' : 'User ID is required.',
        variant: 'destructive',
      });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(newPermUserId.trim())) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'অবৈধ ইউজার আইডি ফরম্যাট।' : 'Invalid User ID format.',
        variant: 'destructive',
      });
      return;
    }

    setAddingPermission(true);
    try {
      // Check if permission already exists
      const existingPerm = workspacePermissions.find(p => p.user_id === newPermUserId.trim());

      if (existingPerm) {
        // Update existing
        const { error } = await supabase
          .from('user_workspace_permissions')
          .update({
            office_enabled: newOfficeEnabled,
            personal_enabled: newPersonalEnabled,
          })
          .eq('id', existingPerm.id);

        if (error) throw error;

        toast({
          title: language === 'bn' ? 'সফল' : 'Success',
          description: language === 'bn' ? 'অনুমতি আপডেট হয়েছে।' : 'Permissions updated.',
        });
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_workspace_permissions')
          .insert({
            user_id: newPermUserId.trim(),
            office_enabled: newOfficeEnabled,
            personal_enabled: newPersonalEnabled,
          });

        if (error) throw error;

        toast({
          title: language === 'bn' ? 'সফল' : 'Success',
          description: language === 'bn' ? 'অনুমতি যোগ করা হয়েছে।' : 'Permissions added.',
        });
      }

      setNewPermUserId('');
      setPermEmailSearch('');
      setNewOfficeEnabled(true);
      setNewPersonalEnabled(true);
      await loadWorkspacePermissions();
    } catch (error: any) {
      console.error('Failed to add permission:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' ? 'অনুমতি যোগ করতে ব্যর্থ।' : 'Failed to add permissions.'),
        variant: 'destructive',
      });
    } finally {
      setAddingPermission(false);
    }
  };

  const updateWorkspacePermission = async (perm: WorkspacePermission, field: 'office_enabled' | 'personal_enabled', value: boolean) => {
    setUpdatingPermission(perm.id);
    try {
      const { error } = await supabase
        .from('user_workspace_permissions')
        .update({ [field]: value })
        .eq('id', perm.id);

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'অনুমতি আপডেট হয়েছে।' : 'Permission updated.',
      });

      await loadWorkspacePermissions();
    } catch (error: any) {
      console.error('Failed to update permission:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' ? 'অনুমতি আপডেট ব্যর্থ।' : 'Failed to update permission.'),
        variant: 'destructive',
      });
    } finally {
      setUpdatingPermission(null);
    }
  };

  const deleteWorkspacePermission = async (permId: string) => {
    try {
      const { error } = await supabase
        .from('user_workspace_permissions')
        .delete()
        .eq('id', permId);

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'অনুমতি মুছে ফেলা হয়েছে।' : 'Permission removed.',
      });

      await loadWorkspacePermissions();
    } catch (error: any) {
      console.error('Failed to delete permission:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' ? 'অনুমতি মুছতে ব্যর্থ।' : 'Failed to remove permission.'),
        variant: 'destructive',
      });
    }
  };

  const filteredPermissions = workspacePermissions.filter(perm => 
    perm.user_id.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
    (userEmails[perm.user_id] || '').toLowerCase().includes(permSearchQuery.toLowerCase())
  );

  const loadOAuthCredentials = async () => {
    setLoadingCredentials(true);
    try {
      const response = await supabase.functions.invoke('save-calendar-credentials', {
        body: { action: 'get' }
      });

      if (response.data) {
        const creds: OAuthCredential[] = [];
        
        if (response.data.google) {
          creds.push({
            provider: 'Google',
            hasClientId: !!response.data.google.clientId,
            hasClientSecret: !!response.data.google.clientSecret,
          });
        }
        
        if (response.data.microsoft) {
          creds.push({
            provider: 'Microsoft',
            hasClientId: !!response.data.microsoft.clientId,
            hasClientSecret: !!response.data.microsoft.clientSecret,
          });
        }
        
        setOAuthCredentials(creds);
      }
    } catch (error) {
      console.error('Failed to load OAuth credentials:', error);
    } finally {
      setLoadingCredentials(false);
    }
  };




  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
            <Crown className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
            {language === 'bn' ? 'এডমিন সেটিংস' : 'Admin Settings'}
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {language === 'bn' 
              ? 'অ্যাডমিনিস্ট্রেটর-শুধুমাত্র কনফিগারেশন এবং সেটিংস পরিচালনা করুন।'
              : 'Manage administrator-only configurations and settings.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          <div className="w-full">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {language === 'bn' ? 'ওয়েলকাম স্ক্রিন' : 'Welcome Screen'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'bn' 
                          ? 'নতুন ইউজারদের জন্য স্টার্টআপ ওয়েলকাম/অনবোর্ডিং স্ক্রিন দেখানো হবে।'
                          : 'Show startup welcome/onboarding screen for new users.'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingSettings && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Switch
                      id="onboarding-toggle"
                      checked={onboardingEnabled}
                      onCheckedChange={updateOnboardingSetting}
                      disabled={savingSettings}
                    />
                  </div>
                </div>


                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {language === 'bn' ? 'ইন্টারনাল অ্যানালিটিক্স' : 'Internal Analytics'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'bn'
                          ? 'গোপনীয়তা-সুরক্ষিত দৈনিক কাউন্টার ট্র্যাকিং চালু/বন্ধ করুন। নোটের কনটেন্ট বা এআই প্রম্পট সংরক্ষণ করা হয় না।'
                          : 'Enable or disable privacy-friendly daily counters. No note content or AI prompts are stored.'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingSettings && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Switch
                      id="internal-analytics-toggle"
                      checked={internalAnalyticsEnabled}
                      onCheckedChange={updateInternalAnalyticsSetting}
                      disabled={savingSettings}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {language === 'bn' ? 'পোর্টাল ব্র্যান্ডিং' : 'Portal Branding'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'bn'
                          ? 'লোগো URL এবং পোর্টালের নাম সেট করুন।'
                          : 'Set a portal name and logo URL for auth, sidebar, and mobile header.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="portal-name">
                        {language === 'bn' ? 'পোর্টালের নাম' : 'Portal Name'}
                      </Label>
                      <Input
                        id="portal-name"
                        value={portalName}
                        maxLength={120}
                        onChange={(e) => setPortalName(e.target.value)}
                        placeholder="LifeOS"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portal-logo-url">
                        {language === 'bn' ? 'লোগো URL' : 'Logo URL'}
                      </Label>
                      <Input
                        id="portal-logo-url"
                        value={portalLogoUrl}
                        onChange={(e) => setPortalLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
                    <div className="h-10 w-10 rounded-md border border-border flex items-center justify-center bg-muted/20 overflow-hidden">
                      {portalLogoUrl.trim() ? (
                        <img src={portalLogoUrl.trim()} alt="Portal logo preview" className="h-8 w-8 object-contain" />
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          {(portalName.trim() || 'LifeOS').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{portalName.trim() || 'LifeOS'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {language === 'bn' ? 'লাইভ প্রিভিউ' : 'Live preview'}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setPortalName('LifeOS');
                          setPortalLogoUrl('');
                        }}
                        disabled={savingSettings}
                      >
                        {language === 'bn' ? 'রিসেট' : 'Reset'}
                      </Button>
                      <Button
                        type="button"
                        onClick={updatePortalBranding}
                        disabled={savingSettings}
                      >
                        {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'bn' ? 'সেভ' : 'Save')}
                      </Button>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    {language === 'bn' 
                      ? 'এই সেটিংস সব ইউজারের জন্য প্রযোজ্য হবে। সাবধানে পরিবর্তন করুন।'
                      : 'These settings apply to all users. Change with caution.'
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Module Management */}
            {activeTab === 'modules' && (
              <ModuleSettings />
            )}

            {/* Custom Form Fields */}
            {activeTab === 'custom-fields' && (
              <CustomFormFieldManager />
            )}

            {/* Field Visibility */}
            {activeTab === 'field-visibility' && (
              <FormFieldSettings />
            )}

            {activeTab === 'users' && (
              <RoleManagement />
            )}

            {/* Workspace Permissions */}
            {activeTab === 'workspaces' && (
            <div className="space-y-4">
              {/* Add Permission Section */}
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {language === 'bn' ? 'ওয়ার্কস্পেস অনুমতি সেট করুন' : 'Set Workspace Permissions'}
                </h4>
                <div className="space-y-3">
                  {/* Email Search */}
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={language === 'bn' ? 'ইমেইল বা নাম দিয়ে খুঁজুন...' : 'Search by email or name...'}
                        value={permEmailSearch}
                        onChange={(e) => {
                          setPermEmailSearch(e.target.value);
                          searchByEmailForPerm(e.target.value);
                        }}
                        onFocus={() => permSearchResults.length > 0 && setShowPermSearchResults(true)}
                        className="pl-9 bg-background"
                      />
                      {searchingPermEmail && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {showPermSearchResults && permSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {permSearchResults.map((result) => (
                          <button
                            key={result.user_id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3 transition-colors"
                            onClick={() => selectUserForPerm(result)}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {result.email || result.full_name || 'No email'}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {result.user_id}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showPermSearchResults && permSearchResults.length === 0 && permEmailSearch.length >= 2 && !searchingPermEmail && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
                        {language === 'bn' ? 'কোনো ইউজার পাওয়া যায়নি' : 'No users found'}
                      </div>
                    )}
                  </div>

                  <Input
                    placeholder={language === 'bn' ? 'ইউজার আইডি (UUID)' : 'User ID (UUID)'}
                    value={newPermUserId}
                    onChange={(e) => setNewPermUserId(e.target.value)}
                    className="bg-background font-mono text-sm"
                  />

                  <div className="flex flex-col sm:flex-row gap-4 p-3 bg-background rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="new-office"
                        checked={newOfficeEnabled}
                        onCheckedChange={setNewOfficeEnabled}
                      />
                      <Label htmlFor="new-office" className="flex items-center gap-2 cursor-pointer">
                        <Briefcase className="h-4 w-4" />
                        {language === 'bn' ? 'অফিস মোড' : 'Office Mode'}
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="new-personal"
                        checked={newPersonalEnabled}
                        onCheckedChange={setNewPersonalEnabled}
                      />
                      <Label htmlFor="new-personal" className="flex items-center gap-2 cursor-pointer">
                        <Home className="h-4 w-4" />
                        {language === 'bn' ? 'পার্সোনাল মোড' : 'Personal Mode'}
                      </Label>
                    </div>
                  </div>

                  <Button onClick={addWorkspacePermission} disabled={addingPermission || !newPermUserId.trim()}>
                    {addingPermission ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    <span className="ml-2">{language === 'bn' ? 'সেট করুন' : 'Set Permissions'}</span>
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' 
                      ? 'ইউজারের জন্য কোন ওয়ার্কস্পেস মোড সক্রিয় থাকবে তা নির্ধারণ করুন। ডিফল্টভাবে সব মোড সক্রিয়।'
                      : 'Set which workspace modes are enabled for a user. All modes are enabled by default.'
                    }
                  </p>
                </div>
              </div>

              {/* Existing Permissions */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">
                  {language === 'bn' ? 'বর্তমান অনুমতিসমূহ' : 'Current Permissions'}
                </h4>
                <Badge variant="outline">
                  {workspacePermissions.length} {language === 'bn' ? 'ইউজার' : 'users'}
                </Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'bn' ? 'অনুমতি খুঁজুন...' : 'Search permissions...'}
                  value={permSearchQuery}
                  onChange={(e) => setPermSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50"
                />
              </div>

              <ScrollArea className="h-[250px] rounded-lg border border-border">
                <div className="p-3 space-y-2">
                  {filteredPermissions.map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                            {userEmails[perm.user_id] || (
                              <span className="text-muted-foreground italic">
                                {language === 'bn' ? 'ইমেইল নেই' : 'No email'}
                              </span>
                            )}
                            {perm.user_id === user?.id && (
                              <span className="ml-2 text-primary text-xs">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px] sm:max-w-[180px]">
                            {perm.user_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={perm.office_enabled}
                              onCheckedChange={(checked) => updateWorkspacePermission(perm, 'office_enabled', checked)}
                              disabled={updatingPermission === perm.id}
                            />
                            <Briefcase className={`h-3 w-3 ${perm.office_enabled ? 'text-foreground' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={perm.personal_enabled}
                              onCheckedChange={(checked) => updateWorkspacePermission(perm, 'personal_enabled', checked)}
                              disabled={updatingPermission === perm.id}
                            />
                            <Home className={`h-3 w-3 ${perm.personal_enabled ? 'text-foreground' : 'text-muted-foreground'}`} />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteWorkspacePermission(perm.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredPermissions.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      {permSearchQuery 
                        ? (language === 'bn' ? 'কোনো মিল পাওয়া যায়নি।' : 'No matches found.')
                        : (language === 'bn' ? 'কোনো কাস্টম অনুমতি নেই। সব ইউজারের সব মোড সক্রিয়।' : 'No custom permissions. All users have all modes enabled.')
                      }
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            )}

            {/* Email/SMTP Settings */}
            {activeTab === 'email' && (
            <div className="space-y-6">
              {/* Resend API Settings */}
              <ResendSettings />
              
              {/* SMTP Settings */}
              <SmtpSettings />
            </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {language === 'bn' ? 'রো লেভেল সিকিউরিটি (RLS)' : 'Row Level Security (RLS)'}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'bn' 
                        ? 'সমস্ত টেবিলে RLS সক্রিয় আছে। ব্যবহারকারীরা শুধুমাত্র তাদের নিজস্ব ডেটা অ্যাক্সেস করতে পারেন।'
                        : 'RLS is enabled on all tables. Users can only access their own data.'
                      }
                    </p>
                    <Badge variant="outline" className="mt-2 text-green-500 border-green-500/30">
                      {language === 'bn' ? 'সুরক্ষিত' : 'Secured'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {language === 'bn' ? 'এনক্রিপশন' : 'Encryption'}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'bn' 
                        ? 'ভল্ট নোটে AES-256-GCM এনক্রিপশন ব্যবহার করা হয়। পাসফ্রেজ ব্রাউজারে থাকে।'
                        : 'Vault notes use AES-256-GCM encryption. Passphrase stays in browser.'
                      }
                    </p>
                    <Badge variant="outline" className="mt-2 text-primary border-primary/30">
                      {language === 'bn' ? 'সক্রিয়' : 'Active'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Settings className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {language === 'bn' ? 'অডিট লগিং' : 'Audit Logging'}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'bn' 
                        ? 'সমস্ত সংবেদনশীল ক্রিয়াকলাপ অডিট লগে রেকর্ড করা হয়।'
                        : 'All sensitive operations are recorded in audit logs.'
                      }
                    </p>
                    <Badge variant="outline" className="mt-2 text-blue-500 border-blue-500/30">
                      {language === 'bn' ? 'সক্রিয়' : 'Enabled'}
                    </Badge>
                  </div>
                </div>
                </div>

              </div>
            )}

            {/* Integrations Settings */}
            {activeTab === 'integrations' && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'bn' 
                    ? 'OAuth ক্রেডেনশিয়াল শুধুমাত্র অ্যাডমিন দ্বারা পরিবর্তন করা যাবে।'
                    : 'OAuth credentials can only be modified by administrators.'
                  }
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {language === 'bn' ? 'ক্যালেন্ডার ইন্টিগ্রেশন' : 'Calendar Integrations'}
                </h4>

                {loadingCredentials ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : oauthCredentials.length > 0 ? (
                  <div className="space-y-2">
                    {oauthCredentials.map((cred) => (
                      <div key={cred.provider} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            cred.provider === 'Google' ? 'bg-red-500/20' : 'bg-blue-500/20'
                          }`}>
                            <span className="text-sm font-bold">
                              {cred.provider === 'Google' ? 'G' : 'M'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{cred.provider} Calendar</p>
                            <p className="text-xs text-muted-foreground">
                              OAuth 2.0 {language === 'bn' ? 'ক্রেডেনশিয়াল' : 'Credentials'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cred.hasClientId && cred.hasClientSecret ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                              {language === 'bn' ? 'কনফিগার করা হয়েছে' : 'Configured'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {language === 'bn' ? 'সেটআপ প্রয়োজন' : 'Needs Setup'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {language === 'bn' ? 'কোনো OAuth ক্রেডেনশিয়াল কনফিগার করা হয়নি।' : 'No OAuth credentials configured.'}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'ক্যালেন্ডার সিঙ্ক সেটিংসে OAuth ক্রেডেনশিয়াল কনফিগার করুন।'
                    : 'Configure OAuth credentials in Calendar Sync settings.'
                  }
                </p>
              </div>
            </div>
            )}

            {/* Desktop App Download */}
            {activeTab === 'desktop' && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {language === 'bn' ? 'Windows LifeOS Setup (.exe)' : 'Windows LifeOS Setup (.exe)'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {language === 'bn'
                      ? 'এই বাটনে ক্লিক করলে LifeOS Windows সেটআপ ফাইল ডাউনলোড হবে।'
                      : 'Click the button below to download the LifeOS Windows setup file.'}
                  </p>

                  <div className="rounded-md border bg-background p-2 text-xs font-mono break-all">
                    {windowsExeUrl}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleDownloadWindowsExe}>
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'bn' ? 'LifeOS.exe ডাউনলোড' : 'Download lifeos.exe'}
                    </Button>
                    <Button variant="outline" onClick={handleCopyExeUrl}>
                      <Copy className="h-4 w-4 mr-2" />
                      {language === 'bn' ? 'লিংক কপি' : 'Copy Link'}
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={windowsExeUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {language === 'bn' ? 'লিংক খুলুন' : 'Open Link'}
                      </a>
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {language === 'bn'
                      ? 'সার্ভারে `lifeos-setup.exe` ফাইল হোস্ট করুন। কাস্টম লিংক ব্যবহার করতে `.env`-এ `VITE_WINDOWS_EXE_URL` সেট করুন।'
                      : 'Host `lifeos-setup.exe` on your server. To use a custom link, set `VITE_WINDOWS_EXE_URL` in `.env`.'}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* License Information */}
            {activeTab === 'license' && (
            <div className="space-y-4">
              {loadingLicense ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current License Info */}
                  {licenseInfo && (
                    <div className="p-5 rounded-xl border border-border bg-card space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getLicensePlanIcon(licenseInfo.plan)}
                          <div>
                            <h3 className="font-semibold text-foreground capitalize">
                              {licenseInfo.plan} {language === 'bn' ? 'প্ল্যান' : 'Plan'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {language === 'bn' ? 'সর্বোচ্চ' : 'Max'}{' '}
                              {licenseInfo.maxDevices >= 99999 ? (language === 'bn' ? 'আনলিমিটেড' : 'Unlimited') : licenseInfo.maxDevices}{' '}
                              {language === 'bn' ? 'ইউজার' : 'users'}
                            </p>
                          </div>
                        </div>
                        {getLicenseStatusBadge(licenseInfo.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">{language === 'bn' ? 'লাইসেন্স কী' : 'License Key'}</p>
                          <p className="font-mono text-foreground text-xs">
                            {safeMaskLicenseKey(licenseInfo.licenseKey)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{language === 'bn' ? 'মেয়াদ শেষ' : 'Expires'}</p>
                          <p className="text-foreground">
                            {licenseInfo.expiresAt
                              ? safeDate(licenseInfo.expiresAt, language === 'bn' ? 'অজানা' : 'Unknown')
                              : (language === 'bn' ? 'কখনো না' : 'Never')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{language === 'bn' ? 'ইনস্টলেশন আইডি' : 'Installation ID'}</p>
                          <p className="font-mono text-foreground text-xs truncate">{safeInstallationId(licenseInfo.installationId)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{language === 'bn' ? 'শেষ যাচাই' : 'Last Verified'}</p>
                          <p className="text-foreground">{safeDateTime(licenseInfo.lastVerified, language === 'bn' ? 'অজানা' : 'Unknown')}</p>
                        </div>
                      </div>

                      {/* Expiry Warning */}
                      {licenseInfo.expiresAt && licenseInfo.status !== 'free' && (() => {
                        const daysLeft = Math.ceil((new Date(licenseInfo.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        if (daysLeft <= 30 && daysLeft > 0) {
                          return (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                              <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                              <span className="text-foreground">
                                {language === 'bn'
                                  ? `লাইসেন্সের মেয়াদ ${daysLeft} দিনে শেষ হবে।`
                                  : `License expires in ${daysLeft} days.`}
                              </span>
                            </div>
                          );
                        }
                        if (daysLeft <= 0) {
                          return (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                              <span className="text-destructive">
                                {language === 'bn'
                                  ? `লাইসেন্সের মেয়াদ ${Math.abs(daysLeft)} দিন আগে শেষ হয়েছে!`
                                  : `License expired ${Math.abs(daysLeft)} days ago!`}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleLicenseRefresh} disabled={loadingLicense}>
                          {loadingLicense ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                          {language === 'bn' ? 'পুনরায় যাচাই' : 'Re-verify'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`${LICENSE_PORTAL_URL}/products.php`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          {language === 'bn' ? 'পোর্টাল' : 'Portal'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!licenseInfo && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>{language === 'bn' ? 'কোনো লাইসেন্স তথ্য পাওয়া যায়নি।' : 'No license information found.'}</p>
                    </div>
                  )}

                  {/* Server Status */}
                  {licenseServerStatus && (
                    <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-2">
                      <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {language === 'bn' ? 'সার্ভার স্ট্যাটাস' : 'Server Status'}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">{language === 'bn' ? 'কনফিগার করা' : 'Configured'}</p>
                          <p className="font-medium text-foreground">{licenseServerStatus.configured ? '✅ Yes' : '❌ No'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</p>
                          <p className="font-medium text-foreground capitalize">{(licenseServerStatus as any).status || 'Unknown'}</p>
                        </div>
                        {(licenseServerStatus as any).max_devices && (
                          <div>
                            <p className="text-muted-foreground">{language === 'bn' ? 'সর্বোচ্চ ডিভাইস' : 'Max Devices'}</p>
                            <p className="font-medium text-foreground">{(licenseServerStatus as any).max_devices}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Change / Import License */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-foreground">
                        {language === 'bn' ? 'লাইসেন্স কী পরিবর্তন / ইমপোর্ট' : 'Change / Import License Key'}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn'
                        ? 'নতুন লাইসেন্স কী প্রবেশ করুন।'
                        : 'Enter a new license key to activate or change your plan.'}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={licenseKeyInput}
                        onChange={(e) => setLicenseKeyInput(e.target.value)}
                        placeholder="LIFEOS-XXXX-XXXX-XXXX-XXXX"
                        className="font-mono flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleLicenseVerify()}
                      />
                      <Button onClick={handleLicenseVerify} disabled={verifyingLicense || !licenseKeyInput.trim()}>
                        {verifyingLicense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Plan Comparison */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground text-sm">{language === 'bn' ? 'উপলব্ধ প্ল্যান' : 'Available Plans'}</h4>
                    <div className="grid gap-2">
                      {LICENSE_PLANS.map((plan) => (
                        <div
                          key={plan.id}
                          className={`p-3 rounded-lg border transition-all ${
                            licenseInfo?.plan === plan.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getLicensePlanIcon(plan.id)}
                              <div>
                                <p className="text-sm font-medium text-foreground">{plan.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {plan.maxDevices >= 99999 ? (language === 'bn' ? 'আনলিমিটেড' : 'Unlimited') : plan.maxDevices} {language === 'bn' ? 'ইউজার' : 'users'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-primary">{plan.price}</span>
                              {licenseInfo?.plan === plan.id && (
                                <Badge variant="secondary" className="text-xs">{language === 'bn' ? 'বর্তমান' : 'Current'}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(`${LICENSE_PORTAL_URL}/products.php`, '_blank')}
                    >
                      {language === 'bn' ? 'লাইসেন্স কিনুন' : 'Purchase License'}
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </CardContent>
      </Card>

    </>
  );
}
