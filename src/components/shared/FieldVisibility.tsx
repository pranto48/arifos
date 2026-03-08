import { ReactNode } from 'react';
import { useFormFieldConfig } from '@/hooks/useFormFieldConfig';

interface FieldVisibilityProps {
  entityType: string;
  fieldName: string;
  children: ReactNode;
  /** If true, always show even if disabled (for required fields) */
  alwaysShow?: boolean;
}

/**
 * Wraps a form field and hides it if the admin has disabled it
 * in Field Visibility Controls.
 * 
 * Usage:
 * <FieldVisibility entityType="task" fieldName="tags">
 *   <Label>Tags</Label>
 *   <Input ... />
 * </FieldVisibility>
 */
export function FieldVisibility({ entityType, fieldName, children, alwaysShow }: FieldVisibilityProps) {
  const { isFieldEnabled, loading } = useFormFieldConfig(entityType);

  if (alwaysShow) return <>{children}</>;
  if (loading) return <>{children}</>;
  if (!isFieldEnabled(fieldName)) return null;

  return <>{children}</>;
}
