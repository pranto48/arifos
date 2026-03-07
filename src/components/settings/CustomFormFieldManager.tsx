import { useState } from 'react';
import { useCustomFormFields, ENTITY_TYPES, FIELD_TYPES, type CustomFormField } from '@/hooks/useCustomFormFields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, X } from 'lucide-react';

const defaultFormData = {
  entity_type: 'task',
  field_name: '',
  field_label: '',
  field_type: 'text',
  is_required: false,
  is_active: true,
  placeholder: '',
  default_value: '',
  sort_order: 0,
  field_options: [] as { label: string; value: string }[],
};

export function CustomFormFieldManager() {
  const { fields, addField, updateField, deleteField } = useCustomFormFields();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFormField | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [newOption, setNewOption] = useState({ label: '', value: '' });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingField(null);
    setNewOption({ label: '', value: '' });
  };

  const openEdit = (field: CustomFormField) => {
    setEditingField(field);
    setFormData({
      entity_type: field.entity_type,
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      is_required: field.is_required,
      is_active: field.is_active,
      placeholder: field.placeholder || '',
      default_value: field.default_value || '',
      sort_order: field.sort_order,
      field_options: field.field_options || [],
    });
    setDialogOpen(true);
  };

  const handleAddOption = () => {
    if (!newOption.label || !newOption.value) return;
    setFormData(prev => ({ ...prev, field_options: [...prev.field_options, { ...newOption }] }));
    setNewOption({ label: '', value: '' });
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({ ...prev, field_options: prev.field_options.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldName = formData.field_name || formData.field_label.toLowerCase().replace(/\s+/g, '_');
    const dataToSubmit = {
      ...formData,
      field_name: fieldName,
      field_options: formData.field_type === 'select' ? formData.field_options : null,
    };

    try {
      if (editingField) {
        await updateField(editingField.id, dataToSubmit);
        toast({ title: 'Field Updated' });
      } else {
        await addField(dataToSubmit);
        toast({ title: 'Field Created' });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this custom field?')) return;
    try {
      await deleteField(id);
      toast({ title: 'Field Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Group by entity type
  const groupedFields = ENTITY_TYPES.map(et => ({
    entityType: et,
    fields: fields.filter(f => f.entity_type === et.value),
  })).filter(g => g.fields.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-foreground">Custom Form Fields</h3>
          <p className="text-sm text-muted-foreground">Add custom fields to any module's forms</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Field</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingField ? 'Edit Field' : 'Add Custom Field'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select value={formData.entity_type} onValueChange={(v) => setFormData(prev => ({ ...prev, entity_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map(et => (
                        <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Field Type</Label>
                  <Select value={formData.field_type} onValueChange={(v) => setFormData(prev => ({ ...prev, field_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(ft => (
                        <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Field Label</Label>
                <Input value={formData.field_label} onChange={(e) => setFormData(prev => ({ ...prev, field_label: e.target.value }))} placeholder="e.g., Priority Level" required />
              </div>
              <div className="space-y-2">
                <Label>Field Name (optional)</Label>
                <Input value={formData.field_name} onChange={(e) => setFormData(prev => ({ ...prev, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} placeholder="Auto-generated from label" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Placeholder</Label>
                  <Input value={formData.placeholder} onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Default Value</Label>
                  <Input value={formData.default_value} onChange={(e) => setFormData(prev => ({ ...prev, default_value: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={formData.sort_order} onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>

              {formData.field_type === 'select' && (
                <div className="space-y-2">
                  <Label>Dropdown Options</Label>
                  <div className="flex gap-2">
                    <Input value={newOption.label} onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))} placeholder="Label" className="flex-1" />
                    <Input value={newOption.value} onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))} placeholder="Value" className="flex-1" />
                    <Button type="button" variant="outline" size="icon" onClick={handleAddOption}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.field_options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {opt.label}
                        <button type="button" onClick={() => handleRemoveOption(i)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_required} onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_required: c }))} />
                  <Label>Required</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_active: c }))} />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingField ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {fields.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">No custom fields defined yet</p>
      ) : (
        <div className="space-y-4">
          {groupedFields.map(({ entityType, fields: groupFields }) => (
            <div key={entityType.value}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">{entityType.label}</h4>
              <div className="space-y-1.5">
                {groupFields.map((field, index) => (
                  <div key={field.id} className={`flex items-center gap-3 p-3 rounded-lg border border-border ${!field.is_active ? 'opacity-50' : ''}`}>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{field.field_label}</p>
                        <Badge variant="outline" className="text-[10px]">{FIELD_TYPES.find(t => t.value === field.field_type)?.label}</Badge>
                        {field.is_required && <Badge variant="secondary" className="text-[10px]">Required</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{field.field_name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(field)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(field.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
