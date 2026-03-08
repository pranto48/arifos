import { useState, useEffect } from 'react';
import { Plus, X, Cpu, HardDrive, Monitor, Headphones, Video, Zap, MemoryStick, Wifi, Server, Printer, Camera, Settings, Network } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { PasswordField } from '@/components/support/PasswordField';
import { getDeviceType, getFieldsForType, getTypeLabel, type DeviceType } from './deviceTypeConfig';

const RAM_OPTIONS = [
  { value: '4GB DDR3', label: '4GB DDR3' },
  { value: '8GB DDR3', label: '8GB DDR3' },
  { value: '4GB DDR4', label: '4GB DDR4' },
  { value: '8GB DDR4', label: '8GB DDR4' },
  { value: '16GB DDR4', label: '16GB DDR4' },
  { value: '32GB DDR4', label: '32GB DDR4' },
  { value: '8GB DDR5', label: '8GB DDR5' },
  { value: '16GB DDR5', label: '16GB DDR5' },
  { value: '32GB DDR5', label: '32GB DDR5' },
  { value: '64GB DDR5', label: '64GB DDR5' },
];

const STORAGE_OPTIONS = [
  { value: '128GB SATA SSD', label: '128GB SATA SSD' },
  { value: '256GB SATA SSD', label: '256GB SATA SSD' },
  { value: '512GB SATA SSD', label: '512GB SATA SSD' },
  { value: '1TB SATA SSD', label: '1TB SATA SSD' },
  { value: '128GB NVMe SSD', label: '128GB NVMe SSD' },
  { value: '256GB NVMe SSD', label: '256GB NVMe SSD' },
  { value: '512GB NVMe SSD', label: '512GB NVMe SSD' },
  { value: '1TB NVMe SSD', label: '1TB NVMe SSD' },
  { value: '2TB NVMe SSD', label: '2TB NVMe SSD' },
  { value: '500GB HDD', label: '500GB HDD' },
  { value: '1TB HDD', label: '1TB HDD' },
  { value: '2TB HDD', label: '2TB HDD' },
];

const PROCESSOR_OPTIONS = [
  { value: 'Intel Core i3 8th Gen', label: 'Intel i3 - 8th Gen' },
  { value: 'Intel Core i5 8th Gen', label: 'Intel i5 - 8th Gen' },
  { value: 'Intel Core i7 8th Gen', label: 'Intel i7 - 8th Gen' },
  { value: 'Intel Core i3 9th Gen', label: 'Intel i3 - 9th Gen' },
  { value: 'Intel Core i5 9th Gen', label: 'Intel i5 - 9th Gen' },
  { value: 'Intel Core i7 9th Gen', label: 'Intel i7 - 9th Gen' },
  { value: 'Intel Core i3 10th Gen', label: 'Intel i3 - 10th Gen' },
  { value: 'Intel Core i5 10th Gen', label: 'Intel i5 - 10th Gen' },
  { value: 'Intel Core i7 10th Gen', label: 'Intel i7 - 10th Gen' },
  { value: 'Intel Core i3 11th Gen', label: 'Intel i3 - 11th Gen' },
  { value: 'Intel Core i5 11th Gen', label: 'Intel i5 - 11th Gen' },
  { value: 'Intel Core i7 11th Gen', label: 'Intel i7 - 11th Gen' },
  { value: 'Intel Core i3 12th Gen', label: 'Intel i3 - 12th Gen' },
  { value: 'Intel Core i5 12th Gen', label: 'Intel i5 - 12th Gen' },
  { value: 'Intel Core i7 12th Gen', label: 'Intel i7 - 12th Gen' },
  { value: 'Intel Core i9 12th Gen', label: 'Intel i9 - 12th Gen' },
  { value: 'Intel Core i3 13th Gen', label: 'Intel i3 - 13th Gen' },
  { value: 'Intel Core i5 13th Gen', label: 'Intel i5 - 13th Gen' },
  { value: 'Intel Core i7 13th Gen', label: 'Intel i7 - 13th Gen' },
  { value: 'Intel Core i9 13th Gen', label: 'Intel i9 - 13th Gen' },
  { value: 'Intel Core i5 14th Gen', label: 'Intel i5 - 14th Gen' },
  { value: 'Intel Core i7 14th Gen', label: 'Intel i7 - 14th Gen' },
  { value: 'Intel Core i9 14th Gen', label: 'Intel i9 - 14th Gen' },
  { value: 'AMD Ryzen 3', label: 'AMD Ryzen 3' },
  { value: 'AMD Ryzen 5', label: 'AMD Ryzen 5' },
  { value: 'AMD Ryzen 7', label: 'AMD Ryzen 7' },
  { value: 'AMD Ryzen 9', label: 'AMD Ryzen 9' },
  { value: 'Apple M1', label: 'Apple M1' },
  { value: 'Apple M2', label: 'Apple M2' },
  { value: 'Apple M3', label: 'Apple M3' },
  { value: 'Apple M4', label: 'Apple M4' },
];

interface DeviceSpecs {
  ram_info: string;
  storage_info: string;
  processor_info: string;
  has_ups: boolean;
  ups_info: string;
  monitor_info: string;
  webcam_info: string;
  headset_info: string;
  custom_specs: Record<string, string>;
}

interface DeviceSpecsFormProps {
  categoryName: string | null;
  specs: DeviceSpecs;
  onChange: (specs: DeviceSpecs) => void;
}

const TYPE_ICONS: Record<DeviceType, React.ElementType> = {
  computer: Cpu,
  router: Wifi,
  server: Server,
  printer: Printer,
  ups: Zap,
  cctv: Camera,
  network_equipment: Network,
  generic: Settings,
};

export function DeviceSpecsForm({ categoryName, specs, onChange }: DeviceSpecsFormProps) {
  const { language } = useLanguage();
  const [newCustomField, setNewCustomField] = useState('');
  const [newCustomValue, setNewCustomValue] = useState('');
  const [customRam, setCustomRam] = useState(false);
  const [customStorage, setCustomStorage] = useState(false);
  const [customProcessor, setCustomProcessor] = useState(false);

  const deviceType = getDeviceType(categoryName);
  const typeFields = getFieldsForType(deviceType);

  useEffect(() => {
    if (specs.ram_info && !RAM_OPTIONS.some(o => o.value === specs.ram_info)) setCustomRam(true);
    if (specs.storage_info && !STORAGE_OPTIONS.some(o => o.value === specs.storage_info)) setCustomStorage(true);
    if (specs.processor_info && !PROCESSOR_OPTIONS.some(o => o.value === specs.processor_info)) setCustomProcessor(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show nothing for generic with no category
  if (deviceType === 'generic' && !categoryName) return null;

  const handleAddCustomField = () => {
    if (!newCustomField.trim()) return;
    onChange({
      ...specs,
      custom_specs: {
        ...specs.custom_specs,
        [newCustomField.trim()]: newCustomValue.trim(),
      },
    });
    setNewCustomField('');
    setNewCustomValue('');
  };

  const handleRemoveCustomField = (key: string) => {
    const newSpecs = { ...specs.custom_specs };
    delete newSpecs[key];
    onChange({ ...specs, custom_specs: newSpecs });
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    onChange({
      ...specs,
      custom_specs: {
        ...specs.custom_specs,
        [key]: value,
      },
    });
  };

  const handleTypeFieldChange = (key: string, value: string) => {
    onChange({
      ...specs,
      custom_specs: {
        ...specs.custom_specs,
        [key]: value,
      },
    });
  };

  const IconComponent = TYPE_ICONS[deviceType];

  return (
    <Card className="md:col-span-2 bg-muted/30 border-dashed">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <IconComponent className="h-4 w-4" />
          {getTypeLabel(deviceType, language)}
        </div>

        {/* Computer hardware specs */}
        {deviceType === 'computer' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RAM */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <MemoryStick className="h-3.5 w-3.5" />
                {language === 'bn' ? 'RAM' : 'RAM'}
              </Label>
              <Select
                value={customRam ? 'custom' : (specs.ram_info || '')}
                onValueChange={(v) => {
                  if (v === 'custom') {
                    setCustomRam(true);
                    onChange({ ...specs, ram_info: '' });
                  } else {
                    setCustomRam(false);
                    onChange({ ...specs, ram_info: v });
                  }
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'RAM নির্বাচন করুন' : 'Select RAM'} />
                </SelectTrigger>
                <SelectContent>
                  {RAM_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">{language === 'bn' ? 'কাস্টম...' : 'Custom...'}</SelectItem>
                </SelectContent>
              </Select>
              {customRam && (
                <Input
                  value={specs.ram_info}
                  onChange={(e) => onChange({ ...specs, ram_info: e.target.value })}
                  placeholder="e.g. 12GB DDR4"
                  className="text-sm"
                />
              )}
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" />
                {language === 'bn' ? 'স্টোরেজ' : 'Storage'}
              </Label>
              <Select
                value={customStorage ? 'custom' : (specs.storage_info || '')}
                onValueChange={(v) => {
                  if (v === 'custom') {
                    setCustomStorage(true);
                    onChange({ ...specs, storage_info: '' });
                  } else {
                    setCustomStorage(false);
                    onChange({ ...specs, storage_info: v });
                  }
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'স্টোরেজ নির্বাচন করুন' : 'Select Storage'} />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">{language === 'bn' ? 'কাস্টম...' : 'Custom...'}</SelectItem>
                </SelectContent>
              </Select>
              {customStorage && (
                <Input
                  value={specs.storage_info}
                  onChange={(e) => onChange({ ...specs, storage_info: e.target.value })}
                  placeholder="e.g. 256GB SSD + 1TB HDD"
                  className="text-sm"
                />
              )}
            </div>

            {/* Processor */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                {language === 'bn' ? 'প্রসেসর' : 'Processor'}
              </Label>
              <Select
                value={customProcessor ? 'custom' : (specs.processor_info || '')}
                onValueChange={(v) => {
                  if (v === 'custom') {
                    setCustomProcessor(true);
                    onChange({ ...specs, processor_info: '' });
                  } else {
                    setCustomProcessor(false);
                    onChange({ ...specs, processor_info: v });
                  }
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'প্রসেসর নির্বাচন করুন' : 'Select Processor'} />
                </SelectTrigger>
                <SelectContent>
                  {PROCESSOR_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">{language === 'bn' ? 'কাস্টম...' : 'Custom...'}</SelectItem>
                </SelectContent>
              </Select>
              {customProcessor && (
                <Input
                  value={specs.processor_info}
                  onChange={(e) => onChange({ ...specs, processor_info: e.target.value })}
                  placeholder="e.g. Intel Core i5-12th Gen"
                  className="text-sm"
                />
              )}
            </div>

            {/* Monitor */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                {language === 'bn' ? 'মনিটর' : 'Monitor'}
              </Label>
              <Input
                value={specs.monitor_info}
                onChange={(e) => onChange({ ...specs, monitor_info: e.target.value })}
                placeholder={language === 'bn' ? 'Dell 24" FHD' : 'Dell 24" FHD'}
                className="text-sm"
              />
            </div>

            {/* UPS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  {language === 'bn' ? 'UPS আছে' : 'Has UPS'}
                </Label>
                <Switch
                  checked={specs.has_ups}
                  onCheckedChange={(checked) => onChange({ ...specs, has_ups: checked })}
                />
              </div>
              {specs.has_ups && (
                <Input
                  value={specs.ups_info}
                  onChange={(e) => onChange({ ...specs, ups_info: e.target.value })}
                  placeholder={language === 'bn' ? 'APC 650VA' : 'APC 650VA'}
                  className="text-sm"
                />
              )}
            </div>

            {/* Webcam */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5" />
                {language === 'bn' ? 'ওয়েবক্যাম' : 'Webcam'}
              </Label>
              <Input
                value={specs.webcam_info}
                onChange={(e) => onChange({ ...specs, webcam_info: e.target.value })}
                placeholder={language === 'bn' ? 'Logitech C920' : 'Logitech C920'}
                className="text-sm"
              />
            </div>

            {/* Headset */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5" />
                {language === 'bn' ? 'হেডসেট' : 'Headset'}
              </Label>
              <Input
                value={specs.headset_info}
                onChange={(e) => onChange({ ...specs, headset_info: e.target.value })}
                placeholder={language === 'bn' ? 'Jabra Evolve2 40' : 'Jabra Evolve2 40'}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Device-type-specific fields (Router, Server, Printer, UPS, CCTV) */}
        {deviceType !== 'computer' && typeFields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-xs">
                  {language === 'bn' ? field.labelBn : field.labelEn}
                </Label>
                {field.isPassword ? (
                  <PasswordField
                    value={specs.custom_specs?.[field.key] || ''}
                    onChange={(val) => handleTypeFieldChange(field.key, val)}
                    placeholder={field.placeholder}
                    language={language as 'en' | 'bn'}
                  />
                ) : (
                  <Input
                    value={specs.custom_specs?.[field.key] || ''}
                    onChange={(e) => handleTypeFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Custom Fields */}
        <div className="space-y-3 pt-2 border-t border-dashed">
          <Label className="text-xs text-muted-foreground">
            {language === 'bn' ? 'কাস্টম ফিল্ড' : 'Custom Fields'}
          </Label>

          {Object.entries(specs.custom_specs || {})
            .filter(([key]) => !typeFields.some(f => f.key === key))
            .map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <Input
                value={key}
                disabled
                className="text-sm flex-1 bg-muted"
              />
              <Input
                value={value}
                onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                className="text-sm flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleRemoveCustomField(key)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Input
              value={newCustomField}
              onChange={(e) => setNewCustomField(e.target.value)}
              placeholder={language === 'bn' ? 'ফিল্ড নাম' : 'Field name'}
              className="text-sm flex-1"
            />
            <Input
              value={newCustomValue}
              onChange={(e) => setNewCustomValue(e.target.value)}
              placeholder={language === 'bn' ? 'মান' : 'Value'}
              className="text-sm flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAddCustomField}
              disabled={!newCustomField.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
