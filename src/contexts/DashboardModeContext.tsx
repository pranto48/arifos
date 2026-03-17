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
  const [permissions, setPermissions] = useState<WorkspacePermissions>({
    office_enabled: true,
    personal_enabled: true,
  });
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissionsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_workspace_permissions')
        .select('office_enabled, personal_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPermissions({
          office_enabled: data.office_enabled,
          personal_enabled: data.personal_enabled,
        });
        
        // If current mode is disabled, switch to enabled mode
        if (!data.office_enabled && mode === 'office' && data.personal_enabled) {
          setModeState('personal');
        } else if (!data.personal_enabled && mode === 'personal' && data.office_enabled) {
          setModeState('office');
          setIsPersonalUnlocked(false);
        }
      } else {
        // No permissions record = all enabled (default)
        setPermissions({ office_enabled: true, personal_enabled: true });
      }
    } catch (error) {
      console.error('Failed to load workspace permissions:', error);
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
