import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, Building2, Users, Truck, Tag, Activity, X, Cpu, MemoryStick, HardDrive, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CustomFieldsFilter } from '@/components/shared/CustomFieldsFilter';
import type { CustomFormField } from '@/hooks/useCustomFormFields';

interface FilterState {
  searchQuery: string;
  category: string;
  status: string;
  unitLocation: string;
  department: string;
  supportUser: string;
  supplier: string;
  ramType: string;
  storageType: string;
  processorGen: string;
}

interface DeviceSupplier {
  id: string;
  name: string;
  is_active: boolean;
}

interface DeviceSuggestion {
  id: string;
  device_name: string;
  device_number?: string | null;
  serial_number?: string | null;
}

interface DeviceFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: { id: string; name: string }[];
  units: { id: string; name: string }[];
  departments: { id: string; name: string; unit_id: string }[];
  supportUsers: { id: string; name: string; department_id: string; is_active: boolean }[];
  suppliers: DeviceSupplier[];
  statusOptions: { value: string; label: string; labelBn: string }[];
  devices?: DeviceSuggestion[];
  customFields?: CustomFormField[];
  customFieldFilters?: Record<string, any>;
  onCustomFieldFiltersChange?: (values: Record<string, any>) => void;
}

export function DeviceFilters({
  filters,
  onFiltersChange,
  categories,
  units,
  departments,
  supportUsers,
  suppliers,
  statusOptions,
  devices = [],
  customFields = [],
  customFieldFilters = {},
  onCustomFieldFiltersChange,
}: DeviceFiltersProps) {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const q = filters.searchQuery.toLowerCase().trim();
    if (!q || q.length < 1) return [];
    return devices
      .filter(d =>
        d.device_name.toLowerCase().includes(q) ||
        d.device_number?.toLowerCase().includes(q) ||
        d.serial_number?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [devices, filters.searchQuery]);

  const filteredDepartments = useMemo(() => {
    if (filters.unitLocation === 'all') return departments;
    return departments.filter(d => d.unit_id === filters.unitLocation);
  }, [departments, filters.unitLocation]);

  const filteredUsers = useMemo(() => {
    let users = supportUsers.filter(u => u.is_active);
    if (filters.department !== 'all') {
      users = users.filter(u => u.department_id === filters.department);
    } else if (filters.unitLocation !== 'all') {
      const deptIds = filteredDepartments.map(d => d.id);
      users = users.filter(u => deptIds.includes(u.department_id));
    }
    return users;
  }, [supportUsers, filters.department, filters.unitLocation, filteredDepartments]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    if (key === 'unitLocation') {
      newFilters.department = 'all';
      newFilters.supportUser = 'all';
    } else if (key === 'department') {
      newFilters.supportUser = 'all';
    }
    onFiltersChange(newFilters);
  };

  const customFieldFilterCount = Object.keys(customFieldFilters).length;

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'searchQuery' && value !== 'all' && value !== ''
  ).length + customFieldFilterCount;

  const advancedFilterCount = ['unitLocation', 'department', 'supportUser', 'supplier', 'ramType', 'storageType', 'processorGen']
    .filter(key => filters[key as keyof FilterState] !== 'all').length + customFieldFilterCount;

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: filters.searchQuery,
      category: 'all',
      status: 'all',
      unitLocation: 'all',
      department: 'all',
      supportUser: 'all',
      supplier: 'all',
      ramType: 'all',
      storageType: 'all',
      processorGen: 'all',
    });
    onCustomFieldFiltersChange?.({});
  };

  const RAM_TYPES = [
    { value: 'ddr3', label: 'DDR3' },
    { value: 'ddr4', label: 'DDR4' },
    { value: 'ddr5', label: 'DDR5' },
  ];

  const STORAGE_TYPES = [
    { value: 'nvme', label: 'NVMe SSD' },
    { value: 'sata_ssd', label: 'SATA SSD' },
    { value: 'hdd', label: 'HDD' },
  ];

  const PROCESSOR_GENS = [
    { value: 'gen8', label: '8th Gen' },
    { value: 'gen9', label: '9th Gen' },
    { value: 'gen10', label: '10th Gen' },
    { value: 'gen11', label: '11th Gen' },
    { value: 'gen12', label: '12th Gen' },
    { value: 'gen13', label: '13th Gen' },
    { value: 'gen14', label: '14th Gen' },
    { value: 'ryzen3', label: 'Ryzen 3' },
    { value: 'ryzen5', label: 'Ryzen 5' },
    { value: 'ryzen7', label: 'Ryzen 7' },
    { value: 'ryzen9', label: 'Ryzen 9' },
    { value: 'apple_m1', label: 'Apple M1' },
    { value: 'apple_m2', label: 'Apple M2' },
    { value: 'apple_m3', label: 'Apple M3' },
    { value: 'apple_m4', label: 'Apple M4' },
  ];

  // Primary filters: Category + Status (always visible)
  const PrimaryFilters = () => (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <Tag className="h-3 w-3 mr-1 text-muted-foreground" />
          <SelectValue placeholder={language === 'bn' ? 'ক্যাটাগরি' : 'Category'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{language === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}</SelectItem>
          {categories.map(cat => (
            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <Activity className="h-3 w-3 mr-1 text-muted-foreground" />
          <SelectValue placeholder={language === 'bn' ? 'স্ট্যাটাস' : 'Status'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{language === 'bn' ? 'সব স্ট্যাটাস' : 'All Status'}</SelectItem>
          {statusOptions.map(status => (
            <SelectItem key={status.value} value={status.value}>
              {language === 'bn' ? status.labelBn : status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
        >
          <X className="h-3 w-3 mr-1" />
          {language === 'bn' ? 'মুছুন' : 'Clear'}
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{activeFilterCount}</Badge>
        </Button>
      )}
    </div>
  );

  // Advanced filters: Location, Supplier, Hardware specs, User
  const AdvancedFilters = () => (
    <motion.div
      className="space-y-3 pt-3"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Separator />
      
      {/* Location & Supplier Row */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {language === 'bn' ? 'লোকেশন ও সাপ্লায়ার' : 'Location & Supplier'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={filters.unitLocation} onValueChange={(v) => updateFilter('unitLocation', v)}>
            <SelectTrigger className="h-8 text-xs">
              <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder={language === 'bn' ? 'ইউনিট' : 'Unit'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব ইউনিট' : 'All Units'}</SelectItem>
              {units.map(unit => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.department} onValueChange={(v) => updateFilter('department', v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={language === 'bn' ? 'বিভাগ' : 'Department'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব বিভাগ' : 'All Depts'}</SelectItem>
              {filteredDepartments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.supportUser} onValueChange={(v) => updateFilter('supportUser', v)}>
            <SelectTrigger className="h-8 text-xs">
              <Users className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder={language === 'bn' ? 'ব্যবহারকারী' : 'User'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব ব্যবহারকারী' : 'All Users'}</SelectItem>
              {filteredUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.supplier} onValueChange={(v) => updateFilter('supplier', v)}>
            <SelectTrigger className="h-8 text-xs">
              <Truck className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder={language === 'bn' ? 'সাপ্লায়ার' : 'Supplier'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব সাপ্লায়ার' : 'All Suppliers'}</SelectItem>
              {suppliers.filter(s => s.is_active).map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Hardware Specs Row */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {language === 'bn' ? 'হার্ডওয়্যার স্পেসিফিকেশন' : 'Hardware Specs'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Select value={filters.ramType} onValueChange={(v) => updateFilter('ramType', v)}>
            <SelectTrigger className="h-8 text-xs">
              <MemoryStick className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="RAM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব RAM' : 'All RAM'}</SelectItem>
              {RAM_TYPES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.storageType} onValueChange={(v) => updateFilter('storageType', v)}>
            <SelectTrigger className="h-8 text-xs">
              <HardDrive className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Storage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব স্টোরেজ' : 'All Storage'}</SelectItem>
              {STORAGE_TYPES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.processorGen} onValueChange={(v) => updateFilter('processorGen', v)}>
            <SelectTrigger className="h-8 text-xs">
              <Cpu className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Processor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব প্রসেসর' : 'All Processors'}</SelectItem>
              {PROCESSOR_GENS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Fields Filter */}
      {customFields.length > 0 && onCustomFieldFiltersChange && (
        <div>
          <CustomFieldsFilter
            fields={customFields}
            filterValues={customFieldFilters}
            onFilterChange={onCustomFieldFiltersChange}
          />
        </div>
      )}
    </motion.div>
  );

  if (isMobile) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'bn' ? 'ডিভাইস খুঁজুন...' : 'Search devices...'}
              value={filters.searchQuery}
              onChange={(e) => { updateFilter('searchQuery', e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="pl-9 h-10 text-sm"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                    onMouseDown={(e) => { e.preventDefault(); updateFilter('searchQuery', s.device_name); setShowSuggestions(false); }}
                  >
                    <span className="truncate font-medium">{s.device_name}</span>
                    {s.device_number && <span className="text-xs text-muted-foreground ml-2 shrink-0">#{s.device_number}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  {language === 'bn' ? 'ফিল্টার' : 'Filters'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <PrimaryFilters />
                <AdvancedFilters />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search + Primary Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'bn' ? 'ডিভাইস, সিরিয়াল, সাপ্লায়ার খুঁজুন...' : 'Search device, serial, supplier...'}
            value={filters.searchQuery}
            onChange={(e) => { updateFilter('searchQuery', e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            className="pl-9 h-8 text-sm"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                  onMouseDown={(e) => { e.preventDefault(); updateFilter('searchQuery', s.device_name); setShowSuggestions(false); }}
                >
                  <span className="truncate font-medium">{s.device_name}</span>
                  {s.device_number && <span className="text-xs text-muted-foreground ml-2 shrink-0">#{s.device_number}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <PrimaryFilters />
      </div>

      {/* More Filters Toggle */}
      <Collapsible open={showMore} onOpenChange={setShowMore}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <SlidersHorizontal className="h-3 w-3" />
            {language === 'bn' ? 'আরো ফিল্টার' : 'More Filters'}
            {advancedFilterCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{advancedFilterCount}</Badge>
            )}
            <ChevronDown className={cn("h-3 w-3 transition-transform", showMore && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AnimatePresence>
            {showMore && <AdvancedFilters />}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
