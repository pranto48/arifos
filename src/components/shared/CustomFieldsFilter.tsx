import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { CustomFormField } from '@/hooks/useCustomFormFields';

interface CustomFieldsFilterProps {
  fields: CustomFormField[];
  filterValues: Record<string, any>;
  onFilterChange: (values: Record<string, any>) => void;
}

export function CustomFieldsFilter({ fields, filterValues, onFilterChange }: CustomFieldsFilterProps) {
  const activeFields = fields.filter(f => f.is_active);

  if (activeFields.length === 0) return null;

  const handleChange = (fieldName: string, value: any) => {
    const newValues = { ...filterValues };
    if (value === '' || value === undefined || value === null) {
      delete newValues[fieldName];
    } else {
      newValues[fieldName] = value;
    }
    onFilterChange(newValues);
  };

  const clearFilters = () => onFilterChange({});

  const hasFilters = Object.keys(filterValues).length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Custom Field Filters</p>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {activeFields.map(field => (
          <div key={field.id} className="min-w-[140px]">
            {field.field_type === 'select' && field.field_options ? (
              <Select
                value={filterValues[field.field_name] || ''}
                onValueChange={(v) => handleChange(field.field_name, v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={field.field_label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All {field.field_label}</SelectItem>
                  {field.field_options.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.field_type === 'checkbox' ? (
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id={`filter-${field.field_name}`}
                  checked={filterValues[field.field_name] === true}
                  onCheckedChange={(checked) => handleChange(field.field_name, checked || undefined)}
                />
                <Label htmlFor={`filter-${field.field_name}`} className="text-xs">{field.field_label}</Label>
              </div>
            ) : (
              <Input
                className="h-8 text-xs"
                placeholder={`Filter ${field.field_label}...`}
                value={filterValues[field.field_name] || ''}
                onChange={(e) => handleChange(field.field_name, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility to filter data by custom field values
export function filterByCustomFields<T extends { custom_fields?: Record<string, any> | null }>(
  items: T[],
  filterValues: Record<string, any>,
): T[] {
  if (Object.keys(filterValues).length === 0) return items;

  return items.filter(item => {
    const cf = item.custom_fields || {};
    return Object.entries(filterValues).every(([key, value]) => {
      const fieldValue = cf[key];
      if (typeof value === 'boolean') return fieldValue === value;
      if (typeof value === 'string') {
        return String(fieldValue || '').toLowerCase().includes(value.toLowerCase());
      }
      return fieldValue === value;
    });
  });
}
