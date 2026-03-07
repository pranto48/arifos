import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CustomFormField {
  id: string;
  user_id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options: { label: string; value: string }[] | null;
  is_required: boolean;
  is_active: boolean;
  placeholder: string | null;
  default_value: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const ENTITY_TYPES = [
  { value: 'task', label: 'Tasks' },
  { value: 'note', label: 'Notes' },
  { value: 'transaction', label: 'Expenses/Budget' },
  { value: 'goal', label: 'Goals' },
  { value: 'device_inventory', label: 'Device Inventory' },
  { value: 'project', label: 'Projects' },
  { value: 'support_user', label: 'Support Users' },
] as const;

export const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
] as const;

// Cache for fields by entity type
const fieldCache = new Map<string, { data: CustomFormField[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export function useCustomFormFields(entityType?: string) {
  const { user } = useAuth();
  const [fields, setFields] = useState<CustomFormField[]>([]);
  const [allFields, setAllFields] = useState<CustomFormField[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFields = useCallback(async (type?: string) => {
    try {
      let query = supabase
        .from('custom_form_fields')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (type) {
        query = query.eq('entity_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      const typed = (data || []) as unknown as CustomFormField[];
      
      if (type) {
        setFields(typed);
        fieldCache.set(type, { data: typed, timestamp: Date.now() });
      } else {
        setAllFields(typed);
      }
    } catch (err) {
      console.error('Failed to fetch custom form fields:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllFields = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('custom_form_fields')
        .select('*')
        .order('entity_type')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const typed = (data || []) as unknown as CustomFormField[];
      setAllFields(typed);
    } catch (err) {
      console.error('Failed to fetch all custom form fields:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addField = useCallback(async (field: Omit<CustomFormField, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('custom_form_fields')
      .insert({ ...field, user_id: user.id } as any)
      .select()
      .single();
    if (error) throw error;
    fieldCache.delete(field.entity_type);
    await fetchAllFields();
    return data;
  }, [user, fetchAllFields]);

  const updateField = useCallback(async (id: string, updates: Partial<CustomFormField>) => {
    const { error } = await supabase
      .from('custom_form_fields')
      .update(updates as any)
      .eq('id', id);
    if (error) throw error;
    fieldCache.clear();
    await fetchAllFields();
  }, [fetchAllFields]);

  const deleteField = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('custom_form_fields')
      .delete()
      .eq('id', id);
    if (error) throw error;
    fieldCache.clear();
    await fetchAllFields();
  }, [fetchAllFields]);

  useEffect(() => {
    if (entityType) {
      const cached = fieldCache.get(entityType);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setFields(cached.data);
        setLoading(false);
      } else {
        fetchFields(entityType);
      }
    } else {
      fetchAllFields();
    }
  }, [entityType, fetchFields, fetchAllFields]);

  return {
    fields: entityType ? fields : allFields,
    loading,
    addField,
    updateField,
    deleteField,
    refetch: entityType ? () => fetchFields(entityType) : fetchAllFields,
  };
}
