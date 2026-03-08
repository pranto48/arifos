import { useState, useEffect, useCallback } from 'react';
import { Crown, Users, Settings, UserPlus, Trash2, Search, Loader2, Pencil, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { DataExportImportButton } from '@/components/shared/DataExportImportButton';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type AppRole = 'admin' | 'user' | 'inventory_manager' | 'support_manager';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface UserSearchResult {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

const ROLE_CONFIG: Record<AppRole, { icon: typeof Crown; color: string; labelEn: string; labelBn: string }> = {
  admin: { icon: Crown, color: 'text-yellow-500', labelEn: 'Admin', labelBn: 'এডমিন' },
  inventory_manager: { icon: Settings, color: 'text-green-500', labelEn: 'Inventory Manager', labelBn: 'ইনভেন্টরি ম্যানেজার' },
  support_manager: { icon: Users, color: 'text-purple-500', labelEn: 'Support Manager', labelBn: 'সাপোর্ট ম্যানেজার' },
  user: { icon: Users, color: 'text-blue-500', labelEn: 'User', labelBn: 'ইউজার' },
};

function RoleIcon({ role, size = 'sm' }: { role: AppRole; size?: 'sm' | 'md' }) {
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;
  const cls = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return <Icon className={`${cls} ${config.color}`} />;
}

function RoleBadgeColor(role: AppRole) {
  switch (role) {
    case 'admin': return 'bg-yellow-500/20';
    case 'inventory_manager': return 'bg-green-500/20';
    case 'support_manager': return 'bg-purple-500/20';
    default: return 'bg-blue-500/20';
  }
}

export function RoleManagement() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Add role state
  const [emailSearch, setEmailSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchingEmail, setSearchingEmail] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('user');
  const [addingRole, setAddingRole] = useState(false);

  // Edit role state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [editNewRole, setEditNewRole] = useState<AppRole>('user');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete role state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<UserRole | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);

  const loadUserRoles = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setUserRoles(data);
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
  }, []);

  useEffect(() => {
    loadUserRoles();
  }, [loadUserRoles]);

  // Search users by email
  const searchByEmail = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setSearchingEmail(true);
    try {
      const { data } = await supabase
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

  // Assign new role
  const assignRole = async () => {
    if (!newUserId.trim()) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: language === 'bn' ? 'ইউজার আইডি প্রয়োজন।' : 'User ID is required.', variant: 'destructive' });
      return;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(newUserId.trim())) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: language === 'bn' ? 'অবৈধ ইউজার আইডি ফরম্যাট।' : 'Invalid User ID format.', variant: 'destructive' });
      return;
    }
    if (userRoles.find(r => r.user_id === newUserId.trim() && r.role === newRole)) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: language === 'bn' ? 'এই রোল ইতিমধ্যে বিদ্যমান।' : 'This role already exists.', variant: 'destructive' });
      return;
    }

    setAddingRole(true);
    try {
      const { error } = await supabase.from('user_roles').insert({ user_id: newUserId.trim(), role: newRole });
      if (error) throw error;
      toast({ title: language === 'bn' ? 'সফল' : 'Success', description: language === 'bn' ? 'রোল সফলভাবে যোগ করা হয়েছে।' : 'Role assigned successfully.' });
      setNewUserId('');
      setEmailSearch('');
      await loadUserRoles();
    } catch (error: any) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: error.message || 'Failed to assign role.', variant: 'destructive' });
    } finally {
      setAddingRole(false);
    }
  };

  // Edit role
  const openEditDialog = (role: UserRole) => {
    if (role.user_id === user?.id && role.role === 'admin') {
      toast({ title: language === 'bn' ? 'নিষেধ' : 'Not Allowed', description: language === 'bn' ? 'আপনি নিজের এডমিন রোল পরিবর্তন করতে পারবেন না।' : 'You cannot change your own admin role.', variant: 'destructive' });
      return;
    }
    setEditingRole(role);
    setEditNewRole(role.role);
    setEditDialogOpen(true);
  };

  const saveEditRole = async () => {
    if (!editingRole) return;
    if (editNewRole === editingRole.role) {
      setEditDialogOpen(false);
      return;
    }
    // Check if user already has the target role
    if (userRoles.find(r => r.user_id === editingRole.user_id && r.role === editNewRole)) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: language === 'bn' ? 'এই ইউজারের ইতিমধ্যে এই রোল আছে।' : 'User already has this role.', variant: 'destructive' });
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: editNewRole })
        .eq('id', editingRole.id);
      if (error) throw error;
      toast({ title: language === 'bn' ? 'সফল' : 'Success', description: language === 'bn' ? 'রোল আপডেট হয়েছে।' : 'Role updated successfully.' });
      setEditDialogOpen(false);
      setEditingRole(null);
      await loadUserRoles();
    } catch (error: any) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: error.message || 'Failed to update role.', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete role
  const confirmDeleteRole = (role: UserRole) => {
    if (role.user_id === user?.id && role.role === 'admin') {
      toast({ title: language === 'bn' ? 'নিষেধ' : 'Not Allowed', description: language === 'bn' ? 'আপনি নিজের এডমিন রোল মুছতে পারবেন না।' : 'You cannot revoke your own admin role.', variant: 'destructive' });
      return;
    }
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const deleteRole = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleToDelete.id);
      if (error) throw error;
      toast({ title: language === 'bn' ? 'সফল' : 'Success', description: language === 'bn' ? 'রোল সফলভাবে মুছে ফেলা হয়েছে।' : 'Role revoked successfully.' });
      await loadUserRoles();
    } catch (error: any) {
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: error.message || 'Failed to revoke role.', variant: 'destructive' });
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

  const getRoleLabel = (role: AppRole) => {
    const config = ROLE_CONFIG[role];
    return language === 'bn' ? config.labelBn : config.labelEn;
  };

  return (
    <>
      <div className="space-y-4">
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
              <Select value={newRole} onValueChange={(v: AppRole) => setNewRole(v)}>
                <SelectTrigger className="w-full sm:w-44 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_CONFIG) as AppRole[]).map(role => (
                    <SelectItem key={role} value={role}>
                      <span className="flex items-center gap-2">
                        <RoleIcon role={role} />
                        {getRoleLabel(role)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={assignRole} disabled={addingRole || !newUserId.trim()} size="sm" className="sm:size-default">
                {addingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                <span className="ml-2">{language === 'bn' ? 'যোগ করুন' : 'Assign'}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'bn'
                ? 'ইমেইল দিয়ে ইউজার খুঁজুন অথবা সরাসরি UUID দিন।'
                : 'Search users by email or enter UUID directly.'}
            </p>
          </div>
        </div>

        {/* Current Roles */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground text-sm md:text-base">
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

        <ScrollArea className="h-[300px] rounded-lg border border-border">
          <div className="p-3 space-y-2">
            {filteredRoles.map((role) => {
              const config = ROLE_CONFIG[role.role];
              return (
                <div key={role.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${RoleBadgeColor(role.role)}`}>
                      <RoleIcon role={role.role} size="md" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {userEmails[role.user_id] || (
                          <span className="text-muted-foreground italic">
                            {language === 'bn' ? 'ইমেইল নেই' : 'No email'}
                          </span>
                        )}
                        {role.user_id === user?.id && (
                          <span className="ml-1 text-primary text-xs">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {role.user_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(role.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge variant={role.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                      {getRoleLabel(role.role)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(role)}
                      title={language === 'bn' ? 'রোল পরিবর্তন' : 'Edit Role'}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => confirmDeleteRole(role)}
                      title={language === 'bn' ? 'রোল মুছুন' : 'Delete Role'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredRoles.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {searchQuery
                  ? (language === 'bn' ? 'কোনো মিল পাওয়া যায়নি।' : 'No matches found.')
                  : (language === 'bn' ? 'কোনো রোল পাওয়া যায়নি।' : 'No roles found.')}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              {language === 'bn' ? 'রোল পরিবর্তন করুন' : 'Edit Role'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn'
                ? 'এই ইউজারের রোল পরিবর্তন করুন।'
                : 'Change the role for this user.'}
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium text-foreground truncate">
                  {userEmails[editingRole.user_id] || editingRole.user_id}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'bn' ? 'বর্তমান রোল:' : 'Current role:'}{' '}
                  <Badge variant="secondary" className="text-[10px]">{getRoleLabel(editingRole.role)}</Badge>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'bn' ? 'নতুন রোল নির্বাচন করুন' : 'Select New Role'}
                </label>
                <Select value={editNewRole} onValueChange={(v: AppRole) => setEditNewRole(v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_CONFIG) as AppRole[]).map(role => (
                      <SelectItem key={role} value={role}>
                        <span className="flex items-center gap-2">
                          <RoleIcon role={role} />
                          {getRoleLabel(role)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={saveEditRole} disabled={savingEdit || editNewRole === editingRole?.role}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              {language === 'bn' ? 'সেভ করুন' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'bn' ? 'রোল মুছে ফেলবেন?' : 'Revoke Role?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleToDelete && (
                <>
                  {language === 'bn'
                    ? `"${getRoleLabel(roleToDelete.role)}" রোলটি "${userEmails[roleToDelete.user_id] || roleToDelete.user_id}" থেকে মুছে ফেলা হবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।`
                    : `The "${getRoleLabel(roleToDelete.role)}" role will be revoked from "${userEmails[roleToDelete.user_id] || roleToDelete.user_id}". This cannot be undone.`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRole}
              disabled={deletingRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {language === 'bn' ? 'মুছে ফেলুন' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
