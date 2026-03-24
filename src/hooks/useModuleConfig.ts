import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ModuleConfig {
  id: string;
  module_name: string;
  is_enabled: boolean;
  updated_by: string | null;
  updated_at: string;
}

const MODULE_LABELS: Record<string, { en: string; bn: string }> = {
  calendar: { en: 'Calendar', bn: 'ক্যালেন্ডার' },
  tasks: { en: 'Tasks', bn: 'কাজ' },
  notes: { en: 'Notes', bn: 'নোট' },
  support_users: { en: 'Support Users', bn: 'সাপোর্ট ইউজার' },
  device_inventory: { en: 'Device Inventory', bn: 'ডিভাইস ইনভেন্টরি' },
  ipbx_inventory: { en: 'IPBX Inventory', bn: 'IPBX ইনভেন্টরি' },
  support_tickets: { en: 'Support Tickets', bn: 'সাপোর্ট টিকেট' },
  goals: { en: 'Goals', bn: 'লক্ষ্য' },
  projects: { en: 'Projects', bn: 'প্রকল্প' },
  habits: { en: 'Habits', bn: 'অভ্যাস' },
  family: { en: 'Family', bn: 'পরিবার' },
  budget: { en: 'Budget', bn: 'বাজেট' },
  salary: { en: 'Salary', bn: 'বেতন' },
  investments: { en: 'Investments', bn: 'বিনিয়োগ' },
  loans: { en: 'Loans', bn: 'ঋণ' },
};

export { MODULE_LABELS };

// Module name to route path mapping
const MODULE_ROUTES: Record<string, string> = {
  calendar: '/calendar',
  tasks: '/tasks',
  notes: '/notes',
  support_users: '/support-users',
  device_inventory: '/device-inventory',
  ipbx_inventory: '/ipbx-inventory',
  support_tickets: '/support-tickets',
  goals: '/goals',
  projects: '/projects',
  habits: '/habits',
  family: '/family',
  budget: '/budget',
  salary: '/salary',
  investments: '/investments',
  loans: '/loans',
};

let moduleCache: { data: ModuleConfig[]; timestamp: number } | null = null;
const CACHE_TTL = 60000;

export function useModuleConfig() {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    if (moduleCache && Date.now() - moduleCache.timestamp < CACHE_TTL) {
      setModules(moduleCache.data);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('module_config')
        .select('*')
        .order('module_name');
      if (error) throw error;
      const typed = (data || []) as unknown as ModuleConfig[];
      setModules(typed);
      moduleCache = { data: typed, timestamp: Date.now() };
    } catch (err) {
      console.error('Failed to fetch module configs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const isModuleEnabled = useCallback((moduleName: string): boolean => {
    const config = modules.find(m => m.module_name === moduleName);
    return config ? config.is_enabled : true;
  }, [modules]);

  const isRouteEnabled = useCallback((routePath: string): boolean => {
    const entry = Object.entries(MODULE_ROUTES).find(([, path]) => path === routePath);
    if (!entry) return true; // Dashboard, settings, etc. always enabled
    return isModuleEnabled(entry[0]);
  }, [isModuleEnabled]);

  const toggleModule = useCallback(async (moduleName: string, enabled: boolean) => {
    if (!user) return;
    try {
      const existing = modules.find(m => m.module_name === moduleName);
      if (existing) {
        const { error } = await supabase
          .from('module_config')
          .update({ is_enabled: enabled, updated_by: user.id } as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('module_config')
          .insert({ module_name: moduleName, is_enabled: enabled, updated_by: user.id } as any);
        if (error) throw error;
      }
      moduleCache = null;
      await fetchModules();
    } catch (err) {
      console.error('Failed to toggle module:', err);
      throw err;
    }
  }, [user, modules, fetchModules]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return { modules, loading, isModuleEnabled, isRouteEnabled, toggleModule, refetch: fetchModules };
}
