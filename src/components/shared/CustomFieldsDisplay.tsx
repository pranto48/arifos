import { Badge } from '@/components/ui/badge';
import type { CustomFormField } from '@/hooks/useCustomFormFields';

interface CustomFieldsDisplayProps {
  fields: CustomFormField[];
  values: Record<string, any> | null;
}

export function CustomFieldsDisplay({ fields, values }: CustomFieldsDisplayProps) {
  if (!values || Object.keys(values).length === 0 || fields.length === 0) return null;

  const activeFields = fields.filter(f => f.is_active && values[f.field_name] !== undefined && values[f.field_name] !== '' && values[f.field_name] !== null);

  if (activeFields.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-border pt-2 mt-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Fields</p>
      <div className="grid gap-1.5 text-sm">
        {activeFields.map(field => (
          <div key={field.id} className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-0 flex-shrink-0">{field.field_label}:</span>
            <span className="text-foreground">
              {field.field_type === 'checkbox' 
                ? (values[field.field_name] ? '✓ Yes' : '✗ No')
                : field.field_type === 'select' && field.field_options
                  ? field.field_options.find(o => o.value === values[field.field_name])?.label || values[field.field_name]
                  : String(values[field.field_name])
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
