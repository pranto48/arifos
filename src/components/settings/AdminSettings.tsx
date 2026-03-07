import { useState, useEffect } from 'react';
import { DataExportImportButton } from '@/components/shared/DataExportImportButton';
import { Shield, Users, Key, Loader2, Crown, UserPlus, Trash2, Search, Briefcase, Home, Settings, Calendar, AlertTriangle, Mail, Sparkles, FormInput, ToggleLeft } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  onAdminStatusChange?: (isAdmin: boolean) => void;
}

export function AdminSettings({ onAdminStatusChange }: AdminSettingsProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { hasRole: isAdmin, loading: roleLoading, recheckRoles } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [oauthCredentials, setOAuthCredentials] = useState<OAuthCredential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  
  // Role management state
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user' | 'inventory_manager' | 'support_manager'>('user');
  const [addingRole, setAddingRole] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<UserRole | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  
  // Email lookup state
  const [emailSearch, setEmailSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchingEmail, setSearchingEmail] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
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
  const [savingSettings, setSavingSettings] = useState(false);

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
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('onboarding_enabled')
        .eq('id', 'default')
        .maybeSingle();
      
      if (data) {
        setOnboardingEnabled(data.onboarding_enabled);
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  };

  const updateOnboardingSetting = async (enabled: boolean) => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ onboarding_enabled: enabled })
        .eq('id', 'default');

      if (error) throw error;

      setOnboardingEnabled(enabled);
      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' 
          ? `ওয়েলকাম স্ক্রিন ${enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`
          : `Welcome screen ${enabled ? 'enabled' : 'disabled'}.`,
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

  const searchByEmail = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchingEmail(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (data) {
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchingEmail(false);
    }
  };

  const selectUser = (result: UserSearchResult) => {
    setNewUserId(result.user_id);
    setEmailSearch(result.email || result.full_name || result.user_id);
    setShowSearchResults(false);
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

  const assignRole = async () => {
    if (!newUserId.trim()) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'ইউজার আইডি প্রয়োজন।' : 'User ID is required.',
        variant: 'destructive',
      });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(newUserId.trim())) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'অবৈধ ইউজার আইডি ফরম্যাট।' : 'Invalid User ID format.',
        variant: 'destructive',
      });
      return;
    }

    setAddingRole(true);
    try {
      // Check if role already exists
      const existingRole = userRoles.find(
        r => r.user_id === newUserId.trim() && r.role === newRole
      );

      if (existingRole) {
        toast({
          title: language === 'bn' ? 'ত্রুটি' : 'Error',
          description: language === 'bn' ? 'এই রোল ইতিমধ্যে বিদ্যমান।' : 'This role already exists.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUserId.trim(),
          role: newRole,
        });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'রোল সফলভাবে যোগ করা হয়েছে।' : 'Role assigned successfully.',
      });

      setNewUserId('');
      await loadUserRoles();
    } catch (error: any) {
      console.error('Failed to assign role:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' ? 'রোল যোগ করতে ব্যর্থ।' : 'Failed to assign role.'),
        variant: 'destructive',
      });
    } finally {
      setAddingRole(false);
    }
  };

  const confirmDeleteRole = (role: UserRole) => {
    // Prevent deleting own admin role
    if (role.user_id === user?.id && role.role === 'admin') {
      toast({
        title: language === 'bn' ? 'নিষেধ' : 'Not Allowed',
        description: language === 'bn' ? 'আপনি নিজের এডমিন রোল মুছতে পারবেন না।' : 'You cannot revoke your own admin role.',
        variant: 'destructive',
      });
      return;
    }
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const deleteRole = async () => {
    if (!roleToDelete) return;

    setDeletingRole(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleToDelete.id);

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সফল' : 'Success',
        description: language === 'bn' ? 'রোল সফলভাবে মুছে ফেলা হয়েছে।' : 'Role revoked successfully.',
      });

      await loadUserRoles();
    } catch (error: any) {
      console.error('Failed to delete role:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || (language === 'bn' ? 'রোল মুছতে ব্যর্থ।' : 'Failed to revoke role.'),
        variant: 'destructive',
      });
    } finally {
      setDeletingRole(false);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const filteredRoles = userRoles.filter(role => 
    role.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (userEmails[role.user_id] || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="general" className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm px-1 md:px-3">
                <Settings className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'সাধারণ' : 'General'}</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm px-1 md:px-3">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ইউজার' : 'Users'}</span>
              </TabsTrigger>
              <TabsTrigger value="workspaces" className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm px-1 md:px-3">
                <Briefcase className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ওয়ার্কস্পেস' : 'Workspaces'}</span>
              </TabsTrigger>
              <TabsTrigger value="custom-fields" className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm px-1 md:px-3">
                <FormInput className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'কাস্টম ফিল্ড' : 'Fields'}</span>
              </TabsTrigger>
              <TabsTrigger value="field-visibility" className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm px-1 md:px-3">
                <ToggleLeft className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'দৃশ্যমানতা' : 'Visibility'}</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm px-1 md:px-3">
                <Mail className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ইমেইল' : 'Email'}</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm px-1 md:px-3">
                <Shield className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'সিকিউরিটি' : 'Security'}</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm px-1 md:px-3">
                <Key className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ইন্টিগ্রেশন' : 'Integrations'}</span>
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-4 mt-4">
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
            </TabsContent>

            {/* Custom Form Fields */}
            <TabsContent value="custom-fields" className="space-y-4 mt-4">
              <CustomFormFieldManager />
            </TabsContent>

            {/* Field Visibility */}
            <TabsContent value="field-visibility" className="space-y-4 mt-4">
              <FormFieldSettings />
            </TabsContent>

            {/* Users & Role Management */}
            <TabsContent value="users" className="space-y-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground text-sm md:text-base">
                  {language === 'bn' ? 'ইউজার ও রোল ম্যানেজমেন্ট' : 'Users & Role Management'}
                </h4>
                <DataExportImportButton preset="users_roles" label="Users & Roles" />
              </div>
              {/* Add Role Section */}
              <div className="p-3 md:p-4 rounded-lg border border-border bg-muted/30">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2 text-sm md:text-base">
                  <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
                  {language === 'bn' ? 'নতুন রোল যোগ করুন' : 'Assign New Role'}
                </h4>
                <div className="space-y-3">
                  {/* Email Search */}
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={language === 'bn' ? 'ইমেইল বা নাম দিয়ে খুঁজুন...' : 'Search by email or name...'}
                        value={emailSearch}
                        onChange={(e) => {
                          setEmailSearch(e.target.value);
                          searchByEmail(e.target.value);
                        }}
                        onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                        className="pl-9 bg-background"
                      />
                      {searchingEmail && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {searchResults.map((result) => (
                          <button
                            key={result.user_id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3 transition-colors"
                            onClick={() => selectUser(result)}
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
                    {showSearchResults && searchResults.length === 0 && emailSearch.length >= 2 && !searchingEmail && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
                        {language === 'bn' ? 'কোনো ইউজার পাওয়া যায়নি' : 'No users found'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder={language === 'bn' ? 'ইউজার আইডি (UUID)' : 'User ID (UUID)'}
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      className="flex-1 bg-background font-mono text-sm"
                    />
                    <Select value={newRole} onValueChange={(v: 'admin' | 'user' | 'inventory_manager' | 'support_manager') => setNewRole(v)}>
                      <SelectTrigger className="w-full sm:w-44 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <span className="flex items-center gap-2">
                            <Crown className="h-3 w-3 text-yellow-500" />
                            Admin
                          </span>
                        </SelectItem>
                        <SelectItem value="inventory_manager">
                          <span className="flex items-center gap-2">
                            <Settings className="h-3 w-3 text-green-500" />
                            {language === 'bn' ? 'ইনভেন্টরি ম্যানেজার' : 'Inventory Manager'}
                          </span>
                        </SelectItem>
                        <SelectItem value="support_manager">
                          <span className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-purple-500" />
                            {language === 'bn' ? 'সাপোর্ট ম্যানেজার' : 'Support Manager'}
                          </span>
                        </SelectItem>
                        <SelectItem value="user">
                          <span className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-blue-500" />
                            User
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={assignRole} disabled={addingRole || !newUserId.trim()}>
                      {addingRole ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      <span className="ml-2">{language === 'bn' ? 'যোগ করুন' : 'Assign'}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' 
                      ? 'ইমেইল দিয়ে ইউজার খুঁজুন অথবা সরাসরি UUID দিন।'
                      : 'Search users by email or enter UUID directly.'
                    }
                  </p>
                </div>
              </div>

              {/* Existing Roles */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">
                  {language === 'bn' ? 'বর্তমান রোলসমূহ' : 'Current Roles'}
                </h4>
                <Badge variant="outline">
                  {userRoles.length} {language === 'bn' ? 'রোল' : 'roles'}
                </Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'bn' ? 'রোল খুঁজুন...' : 'Search roles...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50"
                />
              </div>

              <ScrollArea className="h-[250px] rounded-lg border border-border">
                <div className="p-3 space-y-2">
                  {filteredRoles.map((role) => {
                    const getRoleStyle = () => {
                      switch (role.role) {
                        case 'admin': return { bg: 'bg-yellow-500/20', icon: <Crown className="h-4 w-4 text-yellow-500" />, label: language === 'bn' ? 'এডমিন' : 'Admin' };
                        case 'inventory_manager': return { bg: 'bg-green-500/20', icon: <Settings className="h-4 w-4 text-green-500" />, label: language === 'bn' ? 'ইনভেন্টরি ম্যানেজার' : 'Inventory Manager' };
                        case 'support_manager': return { bg: 'bg-purple-500/20', icon: <Users className="h-4 w-4 text-purple-500" />, label: language === 'bn' ? 'সাপোর্ট ম্যানেজার' : 'Support Manager' };
                        default: return { bg: 'bg-blue-500/20', icon: <Users className="h-4 w-4 text-blue-500" />, label: language === 'bn' ? 'ইউজার' : 'User' };
                      }
                    };
                    const roleStyle = getRoleStyle();
                    return (
                      <div key={role.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${roleStyle.bg}`}>
                            {roleStyle.icon}
                          </div>
                          <div>
                            <div>
                              <p className="text-sm font-medium text-foreground truncate max-w-[150px] sm:max-w-[250px]">
                                {userEmails[role.user_id] || (
                                  <span className="text-muted-foreground italic">
                                    {language === 'bn' ? 'ইমেইল নেই' : 'No email'}
                                  </span>
                                )}
                                {role.user_id === user?.id && (
                                  <span className="ml-2 text-primary text-xs">(you)</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px] sm:max-w-[200px]">
                                {role.user_id}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(role.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={role.role === 'admin' ? 'default' : 'secondary'}>
                            {roleStyle.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => confirmDeleteRole(role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredRoles.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      {searchQuery 
                        ? (language === 'bn' ? 'কোনো মিল পাওয়া যায়নি।' : 'No matches found.')
                        : (language === 'bn' ? 'কোনো রোল পাওয়া যায়নি।' : 'No roles found.')
                      }
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Workspace Permissions */}
            <TabsContent value="workspaces" className="space-y-4 mt-4">
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
            </TabsContent>

            {/* Email/SMTP Settings */}
            <TabsContent value="email" className="space-y-6 mt-4">
              {/* Resend API Settings */}
              <ResendSettings />
              
              {/* SMTP Settings */}
              <SmtpSettings />
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-4 mt-4">
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
            </TabsContent>

            {/* Integrations Settings */}
            <TabsContent value="integrations" className="space-y-4 mt-4">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {language === 'bn' ? 'রোল মুছুন' : 'Revoke Role'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn' 
                ? `আপনি কি নিশ্চিত যে আপনি এই ইউজারের "${roleToDelete?.role}" রোল মুছতে চান?`
                : `Are you sure you want to revoke the "${roleToDelete?.role}" role from this user?`
              }
              <br />
              <span className="font-mono text-xs mt-2 block">
                {roleToDelete?.user_id}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingRole}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRole}
              disabled={deletingRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingRole ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {language === 'bn' ? 'মুছুন' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
