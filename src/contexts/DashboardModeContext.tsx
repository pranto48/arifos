import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';

type DashboardMode = 'office' | 'personal';

const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

interface WorkspacePermissions {
  office_enabled: boolean;
  personal_enabled: boolean;
}

const DEFAULT_PERMISSIONS: WorkspacePermissions = {
  office_enabled: true,
  personal_enabled: true,
};

function normalizeWorkspacePermissions(rows: any[] | null | undefined): WorkspacePermissions {
  if (!rows || rows.length === 0) return DEFAULT_PERMISSIONS;

  const hasBooleanShape = rows.some(
    (row) => typeof row?.office_enabled === 'boolean' || typeof row?.personal_enabled === 'boolean'
  );

  if (hasBooleanShape) {
    // Aggregate rows defensively in case legacy data has more than one row per user.
    return {
      office_enabled: rows.some((row) => row?.office_enabled !== false),
      personal_enabled: rows.some((row) => row?.personal_enabled !== false),
    };
  }

  // Legacy shape: one row per permission with a `permission` string column.
  const permissionSet = new Set(
    rows
      .map((row) => String(row?.permission || '').toLowerCase())
      .filter(Boolean)
  );

  if (permissionSet.size === 0) return DEFAULT_PERMISSIONS;

  const officeEnabled =
    permissionSet.has('office') ||
    permissionSet.has('office_enabled') ||
    permissionSet.has('office_mode') ||
    permissionSet.has('workspace') ||
    permissionSet.has('all');

  const personalEnabled =
    permissionSet.has('personal') ||
    permissionSet.has('personal_enabled') ||
    permissionSet.has('personal_mode') ||
    permissionSet.has('workspace') ||
    permissionSet.has('all');

  return {
    office_enabled: officeEnabled,
    personal_enabled: personalEnabled,
  };
}

interface DashboardModeContextType {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  isPersonalUnlocked: boolean;
  unlockPersonal: (password: string) => Promise<boolean>;
  lockPersonal: () => void;
  resetAutoLockTimer: () => void;
  permissions: WorkspacePermissions;
  permissionsLoading: boolean;
  refreshPermissions: () => Promise<void>;
}

const DashboardModeContext = createContext<DashboardModeContextType | undefined>(undefined);

export function DashboardModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<DashboardMode>('office');
  const [isPersonalUnlocked, setIsPersonalUnlocked] = useState(false);
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [permissions, setPermissions] = useState<WorkspacePermissions>(DEFAULT_PERMISSIONS);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissionsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_workspace_permissions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      const normalized = normalizeWorkspacePermissions(data as any[] | null);
      setPermissions(normalized);
        
        // If current mode is disabled, switch to enabled mode
        if (!normalized.office_enabled && mode === 'office' && normalized.personal_enabled) {
          setModeState('personal');
        } else if (!normalized.personal_enabled && mode === 'personal' && normalized.office_enabled) {
          setModeState('office');
          setIsPersonalUnlocked(false);
        }
    } catch (error) {
      console.error('Failed to load workspace permissions:', error);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setPermissionsLoading(false);
    }
  }, [user, mode]);

  useEffect(() => {
    loadPermissions();
  }, [user]);

  const refreshPermissions = async () => {
    await loadPermissions();
  };

  const lockPersonal = useCallback(() => {
    setIsPersonalUnlocked(false);
    if (permissions.office_enabled) {
      setModeState('office');
    }
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }
  }, [permissions.office_enabled]);

  const resetAutoLockTimer = useCallback(() => {
    if (!isPersonalUnlocked || mode !== 'personal') return;
    
    // Clear existing timer
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }
    
    // Set new timer
    autoLockTimerRef.current = setTimeout(() => {
      lockPersonal();
    }, AUTO_LOCK_TIMEOUT);
  }, [isPersonalUnlocked, mode, lockPersonal]);

  // Start auto-lock timer when entering personal mode
  useEffect(() => {
    if (isPersonalUnlocked && mode === 'personal') {
      resetAutoLockTimer();
      
      // Listen for user activity to reset timer
      const handleActivity = () => resetAutoLockTimer();
      
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('touchstart', handleActivity);
      
      return () => {
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
        
        if (autoLockTimerRef.current) {
          clearTimeout(autoLockTimerRef.current);
        }
      };
    }
  }, [isPersonalUnlocked, mode, resetAutoLockTimer]);

  const setMode = (newMode: DashboardMode) => {
    // Check permissions
    if (newMode === 'office' && !permissions.office_enabled) return;
    if (newMode === 'personal' && !permissions.personal_enabled) return;
    
    if (newMode === 'personal' && !isPersonalUnlocked) {
      // Don't allow switching to personal mode if not unlocked
      return;
    }
    setModeState(newMode);
  };

  const unlockPersonal = async (password: string): Promise<boolean> => {
    if (!user?.email) return false;
    if (!permissions.personal_enabled) return false;
    
    try {
      // Self-hosted mode does not support Supabase password reauth routes.
      // Verify by re-running login against the local backend.
      if (isSelfHosted()) {
        const result = await selfHostedApi.login(user.email, password);
        if (result?.user?.id === user.id) {
          setIsPersonalUnlocked(true);
          setModeState('personal');
          return true;
        }
        return false;
      }

      // Use reauthenticate to verify password without creating a new session
      await supabase.auth.reauthenticate();
      
      // Reauthenticate sends a nonce, so we verify with signInWithPassword
      // but the session should already exist
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });
      
      if (!signInError) {
        // Immediately set state after successful verification
        setIsPersonalUnlocked(true);
        setModeState('personal');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <DashboardModeContext.Provider value={{ 
      mode, 
      setMode, 
      isPersonalUnlocked, 
      unlockPersonal, 
      lockPersonal,
      resetAutoLockTimer,
      permissions,
      permissionsLoading,
      refreshPermissions,
    }}>
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  const context = useContext(DashboardModeContext);
  if (context === undefined) {
    throw new Error('useDashboardMode must be used within a DashboardModeProvider');
  }
  return context;
}
