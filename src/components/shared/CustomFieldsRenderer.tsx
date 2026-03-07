import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CustomFormField } from '@/hooks/useCustomFormFields';

interface CustomFieldsRendererProps {
  fields: CustomFormField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  disabledFields?: string[];
}

export function CustomFieldsRenderer({ fields, values, onChange, disabledFields = [] }: CustomFieldsRendererProps) {
  const activeFields = fields.filter(f => f.is_active && !disabledFields.includes(f.field_name));

  if (activeFields.length === 0) return null;

  const handleChange = (fieldName: string, value: any) => {
    onChange({ ...values, [fieldName]: value });
  };

  return (
    <div className="space-y-3 border-t border-border pt-3 mt-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Fields</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {activeFields.map(field => (
          <div key={field.id} className={field.field_type === 'textarea' ? 'sm:col-span-2' : ''}>
            {field.field_type === 'checkbox' ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`cf-${field.field_name}`}
                  checked={values[field.field_name] === true || values[field.field_name] === 'true'}
                  onCheckedChange={(checked) => handleChange(field.field_name, checked)}
                />
                <Label htmlFor={`cf-${field.field_name}`} className="text-sm">
                  {field.field_label}
                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                </Label>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor={`cf-${field.field_name}`} className="text-sm">
                  {field.field_label}
                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.field_type === 'text' && (
                  <Input
                    id={`cf-${field.field_name}`}
                    value={values[field.field_name] || ''}
                    onChange={(e) => handleChange(field.field_name, e.target.value)}
                    placeholder={field.placeholder || ''}
                    required={field.is_required}
                  />
                )}
                {field.field_type === 'number' && (
                  <Input
                    id={`cf-${field.field_name}`}
                    type="number"
                    value={values[field.field_name] || ''}
                    onChange={(e) => handleChange(field.field_name, e.target.value)}
                    placeholder={field.placeholder || ''}
                    required={field.is_required}
                  />
                )}
                {field.field_type === 'textarea' && (
                  <Textarea
                    id={`cf-${field.field_name}`}
                    value={values[field.field_name] || ''}
                    onChange={(e) => handleChange(field.field_name, e.target.value)}
                    placeholder={field.placeholder || ''}
                    required={field.is_required}
                    rows={3}
                  />
                )}
                {field.field_type === 'date' && (
                  <Input
                    id={`cf-${field.field_name}`}
                    type="date"
                    value={values[field.field_name] || ''}
                    onChange={(e) => handleChange(field.field_name, e.target.value)}
                    required={field.is_required}
                  />
                )}
                {field.field_type === 'select' && field.field_options && (
                  <Select
                    value={values[field.field_name] || ''}
                    onValueChange={(v) => handleChange(field.field_name, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || 'Select...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.field_options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
