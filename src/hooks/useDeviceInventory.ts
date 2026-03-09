import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';

export interface DeviceCategory {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceSupplier {
  id: string;
  user_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeviceInventory {
  id: string;
  user_id: string;
  support_user_id: string | null;
  category_id: string | null;
  unit_id: string | null;
  supplier_id: string | null;
  device_name: string;
  device_number: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  delivery_date: string | null;
  supplier_name: string | null;
  requisition_number: string | null;
  bod_number: string | null;
  warranty_date: string | null;
  price: number | null;
  bill_details: string | null;
  status: string;
  notes: string | null;
  // Device specifications (for computers/laptops)
  ram_info: string | null;
  storage_info: string | null;
  has_ups: boolean | null;
  ups_info: string | null;
  monitor_info: string | null;
  webcam_info: string | null;
  headset_info: string | null;
  custom_specs: Record<string, string> | null;
  processor_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceServiceHistory {
  id: string;
  user_id: string;
  device_id: string;
  task_id: string | null;
  service_date: string;
  service_type: string;
  description: string | null;
  cost: number | null;
  technician_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useDeviceInventory() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [suppliers, setSuppliers] = useState<DeviceSupplier[]>([]);
  const [devices, setDevices] = useState<DeviceInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasRole: isAdmin } = useUserRoles(['admin', 'inventory_manager']);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Load ALL data - RLS policies allow all authenticated users to view
    const [categoriesRes, suppliersRes, devicesRes] = await Promise.all([
      supabase
        .from('device_categories')
        .select('id,name,description,user_id,created_at,updated_at')
        .order('name'),
      supabase
        .from('device_suppliers')
        .select('id,user_id,name,contact_person,phone,email,address,notes,is_active,created_at,updated_at')
        .order('name'),
      supabase
        .from('device_inventory')
        .select('id,user_id,support_user_id,category_id,unit_id,supplier_id,device_name,device_number,serial_number,purchase_date,delivery_date,supplier_name,requisition_number,bod_number,warranty_date,price,bill_details,status,notes,ram_info,storage_info,has_ups,ups_info,monitor_info,webcam_info,headset_info,custom_specs,processor_info,created_at,updated_at')
        .order('created_at', { ascending: false }),
    ]);

    if (!categoriesRes.error && categoriesRes.data) {
      setCategories(categoriesRes.data);
    }

    if (!suppliersRes.error && suppliersRes.data) {
      setSuppliers(suppliersRes.data);
    }

    if (!devicesRes.error && devicesRes.data) {
      // Cast custom_specs from Json to Record<string, string>
      const devices = devicesRes.data.map(d => ({
        ...d,
        custom_specs: d.custom_specs as Record<string, string> | null,
        processor_info: (d as any).processor_info as string | null,
      }));
      setDevices(devices);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Category operations
  const addCategory = async (name: string, description?: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('device_categories')
      .insert({ user_id: user.id, name, description: description || null })
      .select()
      .single();

    if (!error && data) {
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    }
    return null;
  };

  const updateCategory = async (id: string, updates: Partial<Pick<DeviceCategory, 'name' | 'description'>>) => {
    const { error } = await supabase
      .from('device_categories')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      return true;
    }
    return false;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('device_categories')
      .delete()
      .eq('id', id);

    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    }
    return false;
  };

  // Device operations
  const addDevice = async (deviceData: Partial<Omit<DeviceInventory, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { device_name: string }) => {
    if (!user) return null;
    const insertData = {
      ...deviceData,
      user_id: user.id,
    };
    const { data, error } = await supabase
      .from('device_inventory')
      .insert(insertData as any)
      .select()
      .single();

    if (!error && data) {
      const device = {
        ...data,
        custom_specs: data.custom_specs as Record<string, string> | null,
      };
      setDevices(prev => [device, ...prev]);
      return device;
    }
    return null;
  };

  const updateDevice = async (id: string, updates: Partial<Omit<DeviceInventory, 'id' | 'user_id' | 'created_at' | 'updated_at'>>, recordTransfer = true) => {
    // Get current device state before update for transfer history
    const currentDevice = devices.find(d => d.id === id);
    const oldUserId = currentDevice?.support_user_id || null;
    const newUserId = updates.support_user_id !== undefined ? updates.support_user_id : oldUserId;

    const { error } = await supabase
      .from('device_inventory')
      .update(updates)
      .eq('id', id);

    if (!error) {
      // Record transfer history if support_user_id changed
      if (recordTransfer && updates.support_user_id !== undefined && oldUserId !== newUserId) {
        const { data: userData } = await supabase.auth.getUser();
        await supabase.from('device_transfer_history').insert({
          device_id: id,
          from_user_id: oldUserId,
          to_user_id: newUserId,
          transfer_date: new Date().toISOString(),
          transferred_by: userData?.user?.id || null,
        });
      }

      setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      return true;
    }
    return false;
  };

  const deleteDevice = async (id: string) => {
    const { error } = await supabase
      .from('device_inventory')
      .delete()
      .eq('id', id);

    if (!error) {
      setDevices(prev => prev.filter(d => d.id !== id));
      return true;
    }
    return false;
  };

  // Service history operations
  const getServiceHistory = async (deviceId: string) => {
    const { data, error } = await supabase
      .from('device_service_history')
      .select('*')
      .eq('device_id', deviceId)
      .order('service_date', { ascending: false });

    if (!error && data) {
      return data as DeviceServiceHistory[];
    }
    return [];
  };

  const addServiceRecord = async (record: Omit<DeviceServiceHistory, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('device_service_history')
      .insert({ ...record, user_id: user.id })
      .select()
      .single();

    if (!error && data) {
      return data as DeviceServiceHistory;
    }
    return null;
  };

  const updateServiceRecord = async (id: string, updates: Partial<Omit<DeviceServiceHistory, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const { error } = await supabase
      .from('device_service_history')
      .update(updates)
      .eq('id', id);

    return !error;
  };

  const deleteServiceRecord = async (id: string) => {
    const { error } = await supabase
      .from('device_service_history')
      .delete()
      .eq('id', id);

    return !error;
  };

  // Supplier operations
  const addSupplier = async (supplierData: Omit<DeviceSupplier, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('device_suppliers')
      .insert({ ...supplierData, user_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data as DeviceSupplier;
    }
    return null;
  };

  const updateSupplier = async (id: string, updates: Partial<DeviceSupplier>) => {
    const { error } = await supabase
      .from('device_suppliers')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      return true;
    }
    return false;
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase
      .from('device_suppliers')
      .delete()
      .eq('id', id);

    if (!error) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      return true;
    }
    return false;
  };

  return {
    categories,
    suppliers,
    devices,
    loading,
    isAdmin,
    addCategory,
    updateCategory,
    deleteCategory,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addDevice,
    updateDevice,
    deleteDevice,
    getServiceHistory,
    addServiceRecord,
    updateServiceRecord,
    deleteServiceRecord,
    reload: loadData,
  };
}
