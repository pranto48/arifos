import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FormFieldConfig {
  id: string;
  entity_type: string;
  field_name: string;
  is_enabled: boolean;
  is_custom: boolean;
  updated_by: string | null;
  updated_at: string;
}

// Standard fields per entity type
export const STANDARD_FIELDS: Record<string, { name: string; label: string }[]> = {
  task: [
    { name: 'title', label: 'Title' },
    { name: 'description', label: 'Description' },
    { name: 'priority', label: 'Priority' },
    { name: 'status', label: 'Status' },
    { name: 'due_date', label: 'Due Date' },
    { name: 'due_time', label: 'Due Time' },
    { name: 'tags', label: 'Tags' },
    { name: 'estimated_time', label: 'Estimated Time' },
    { name: 'project_id', label: 'Project' },
    { name: 'category_id', label: 'Category' },
    { name: 'support_user_id', label: 'Assigned User' },
    { name: 'is_recurring', label: 'Recurring' },
    { name: 'follow_up_date', label: 'Follow-up Date' },
  ],
  note: [
    { name: 'title', label: 'Title' },
    { name: 'content', label: 'Content' },
    { name: 'note_type', label: 'Note Type' },
    { name: 'tags', label: 'Tags' },
    { name: 'project_id', label: 'Project' },
    { name: 'is_favorite', label: 'Favorite' },
    { name: 'is_pinned', label: 'Pinned' },
  ],
  transaction: [
    { name: 'type', label: 'Type' },
    { name: 'amount', label: 'Amount' },
    { name: 'category_id', label: 'Category' },
    { name: 'merchant', label: 'Merchant' },
    { name: 'date', label: 'Date' },
    { name: 'account', label: 'Account' },
    { name: 'notes', label: 'Notes' },
    { name: 'is_recurring', label: 'Recurring' },
    { name: 'attachment_url', label: 'Attachment' },
  ],
  goal: [
    { name: 'title', label: 'Title' },
    { name: 'description', label: 'Description' },
    { name: 'goal_type', label: 'Goal Type' },
    { name: 'category', label: 'Category' },
    { name: 'target_amount', label: 'Target Amount' },
    { name: 'target_date', label: 'Target Date' },
    { name: 'status', label: 'Status' },
  ],
  device_inventory: [
    { name: 'device_name', label: 'Device Name' },
    { name: 'serial_number', label: 'Serial Number' },
    { name: 'device_number', label: 'Device Number' },
    { name: 'category_id', label: 'Category' },
    { name: 'supplier_id', label: 'Supplier' },
    { name: 'status', label: 'Status' },
    { name: 'purchase_date', label: 'Purchase Date' },
    { name: 'warranty_date', label: 'Warranty Date' },
    { name: 'price', label: 'Price' },
    { name: 'ram_info', label: 'RAM' },
    { name: 'storage_info', label: 'Storage' },
    { name: 'processor_info', label: 'Processor' },
    { name: 'monitor_info', label: 'Monitor' },
    { name: 'ups_info', label: 'UPS' },
    { name: 'webcam_info', label: 'Webcam' },
    { name: 'headset_info', label: 'Headset' },
    { name: 'notes', label: 'Notes' },
  ],
  project: [
    { name: 'title', label: 'Title' },
    { name: 'description', label: 'Description' },
    { name: 'status', label: 'Status' },
    { name: 'priority', label: 'Priority' },
    { name: 'project_type', label: 'Project Type' },
    { name: 'target_date', label: 'Target Date' },
    { name: 'tags', label: 'Tags' },
  ],
  support_user: [
    { name: 'name', label: 'Name' },
    { name: 'email', label: 'Email' },
    { name: 'phone', label: 'Phone' },
    { name: 'designation', label: 'Designation' },
    { name: 'department_id', label: 'Department' },
    { name: 'device_info', label: 'Device Info' },
    { name: 'ip_address', label: 'IP Address' },
    { name: 'extension_number', label: 'Extension' },
    { name: 'nas_username', label: 'NAS Username' },
    { name: 'notes', label: 'Notes' },
  ],
};

const configCache = new Map<string, { data: FormFieldConfig[]; timestamp: number }>();
const CACHE_TTL = 60000;

export function useFormFieldConfig(entityType?: string) {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<FormFieldConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    try {
      let query = supabase.from('form_field_config').select('*');
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      const { data, error } = await query;
      if (error) throw error;
      const typed = (data || []) as unknown as FormFieldConfig[];
      setConfigs(typed);
      if (entityType) {
        configCache.set(entityType, { data: typed, timestamp: Date.now() });
      } else {
        configCache.clear();
      }
    } catch (err) {
      console.error('Failed to fetch form field configs:', err);
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  const isFieldEnabled = useCallback((fieldName: string): boolean => {
    const config = configs.find(c => c.field_name === fieldName);
    return config ? config.is_enabled : true;
  }, [configs]);

  const toggleField = useCallback(async (entityType: string, fieldName: string, enabled: boolean, isCustom: boolean = false) => {
    if (!user) return;
    try {
      // Use upsert with the unique constraint on (entity_type, field_name)
      const { error } = await supabase
        .from('form_field_config')
        .upsert(
          {
            entity_type: entityType,
            field_name: fieldName,
            is_enabled: enabled,
            is_custom: isCustom,
            updated_by: user.id,
          } as any,
          { onConflict: 'entity_type,field_name' }
        );
      if (error) throw error;
      configCache.clear();
      await fetchConfigs();
    } catch (err) {
      console.error('Failed to toggle field:', err);
      throw err;
    }
  }, [user, fetchConfigs]);

  useEffect(() => {
    if (entityType) {
      const cached = configCache.get(entityType);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setConfigs(cached.data);
        setLoading(false);
      } else {
        fetchConfigs();
      }
    } else {
      fetchConfigs();
    }
  }, [entityType, fetchConfigs]);

  return {
    configs,
    loading,
    isFieldEnabled,
    toggleField,
    refetch: fetchConfigs,
  };
}
