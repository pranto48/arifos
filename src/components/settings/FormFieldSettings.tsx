import { useState } from 'react';
import { useFormFieldConfig, STANDARD_FIELDS, type FormFieldConfig } from '@/hooks/useFormFieldConfig';
import { useCustomFormFields, ENTITY_TYPES } from '@/hooks/useCustomFormFields';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function FormFieldSettings() {
  const { configs, toggleField, refetch } = useFormFieldConfig();
  const { fields: customFields } = useCustomFormFields();
  const [updating, setUpdating] = useState<string | null>(null);

  const isEnabled = (entityType: string, fieldName: string) => {
    const config = configs.find(c => c.entity_type === entityType && c.field_name === fieldName);
    return config ? config.is_enabled : true;
  };

  const handleToggle = async (entityType: string, fieldName: string, enabled: boolean, isCustom: boolean = false) => {
    const key = `${entityType}.${fieldName}`;
    setUpdating(key);
    try {
      await toggleField(entityType, fieldName, enabled, isCustom);
      toast({ title: `Field ${enabled ? 'enabled' : 'disabled'}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-foreground">Field Visibility Controls</h3>
        <p className="text-sm text-muted-foreground">Enable or disable form fields across all modules</p>
      </div>

      <Accordion type="multiple" className="w-full">
        {ENTITY_TYPES.map(et => {
          const stdFields = STANDARD_FIELDS[et.value] || [];
          const entityCustomFields = customFields.filter(f => f.entity_type === et.value && f.is_active);

          return (
            <AccordionItem key={et.value} value={et.value}>
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <span>{et.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {stdFields.length + entityCustomFields.length} fields
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pl-1">
                  {/* Standard fields */}
                  {stdFields.map(field => {
                    const key = `${et.value}.${field.name}`;
                    const enabled = isEnabled(et.value, field.name);
                    // Never disable title/name fields
                    const isRequired = ['title', 'name', 'amount', 'type', 'device_name'].includes(field.name);
                    
                    return (
                      <div key={field.name} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">{field.label}</Label>
                          {isRequired && <Badge variant="secondary" className="text-[10px]">Required</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          {updating === key && <Loader2 className="h-3 w-3 animate-spin" />}
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => handleToggle(et.value, field.name, checked)}
                            disabled={isRequired || updating === key}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Custom fields */}
                  {entityCustomFields.length > 0 && (
                    <>
                      <div className="border-t border-border pt-2 mt-2">
                        <p className="text-xs text-muted-foreground font-medium mb-2">Custom Fields</p>
                      </div>
                      {entityCustomFields.map(field => {
                        const key = `${et.value}.${field.field_name}`;
                        const enabled = isEnabled(et.value, field.field_name);
                        
                        return (
                          <div key={field.id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">{field.field_label}</Label>
                              <Badge variant="outline" className="text-[10px]">Custom</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {updating === key && <Loader2 className="h-3 w-3 animate-spin" />}
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) => handleToggle(et.value, field.field_name, checked, true)}
                                disabled={updating === key}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
