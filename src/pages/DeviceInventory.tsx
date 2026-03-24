import { useState, useEffect, useMemo } from 'react';
import { 
  HardDrive, Plus, Pencil, Trash2, Download, 
  Wrench, User, Tag, DollarSign, FileText,
  MoreVertical, Eye, Users, Building2, Truck, PackageX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, isBefore, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDeviceInventory, DeviceInventory as DeviceType, DeviceServiceHistory, DeviceCategory, DeviceSupplier } from '@/hooks/useDeviceInventory';
import { useSupportData } from '@/hooks/useSupportData';
import { DeviceQRCode } from '@/components/device/DeviceQRCode';
import { BulkDeviceAssign } from '@/components/device/BulkDeviceAssign';
import { DeviceDetailsDialog } from '@/components/device/DeviceDetailsDialog';
import { DeviceSpecsForm } from '@/components/device/DeviceSpecsForm';
import { CascadingAssignment } from '@/components/device/CascadingAssignment';
import { DeviceFilters } from '@/components/device/DeviceFilters';
import { SupplierManager } from '@/components/device/SupplierManager';
import { DeviceDisposalDialog } from '@/components/device/DeviceDisposalDialog';
import { AnimatedIcon, LoadingSpinner, PulsingDot } from '@/components/ui/animated-icon';
import { DataExportImportButton } from '@/components/shared/DataExportImportButton';
import { ReportActions } from '@/components/shared/ReportActions';
import { useCustomFormFields } from '@/hooks/useCustomFormFields';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', labelBn: 'উপলব্ধ', color: 'bg-green-500/20 text-green-600' },
  { value: 'assigned', label: 'Assigned', labelBn: 'বরাদ্দকৃত', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'maintenance', label: 'In Maintenance', labelBn: 'রক্ষণাবেক্ষণে', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 'retired', label: 'Retired', labelBn: 'অবসরপ্রাপ্ত', color: 'bg-gray-500/20 text-gray-600' },
  { value: 'disposed', label: 'Disposed', labelBn: 'বাতিল', color: 'bg-red-500/20 text-red-600' },
];

const SERVICE_TYPES = [
  { value: 'repair', label: 'Repair', labelBn: 'মেরামত' },
  { value: 'maintenance', label: 'Maintenance', labelBn: 'রক্ষণাবেক্ষণ' },
  { value: 'upgrade', label: 'Upgrade', labelBn: 'আপগ্রেড' },
  { value: 'cleaning', label: 'Cleaning', labelBn: 'পরিষ্কার' },
  { value: 'replacement', label: 'Part Replacement', labelBn: 'যন্ত্রাংশ প্রতিস্থাপন' },
  { value: 'other', label: 'Other', labelBn: 'অন্যান্য' },
];

interface SupportUserInfo {
  id: string;
  name: string;
  department_name: string;
  unit_name: string;
}

export default function DeviceInventoryPage() {
  const { language } = useLanguage();
  const {
    categories,
    suppliers,
    devices,
    loading,
    isAdmin,
    addCategory,
    updateCategory,
    deleteCategory,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addDevice,
    updateDevice,
    deleteDevice,
    getServiceHistory,
    addServiceRecord,
    deleteServiceRecord,
    reload,
  } = useDeviceInventory();

  const { supportUsers, departments, units } = useSupportData();
  const { fields: deviceCustomFields } = useCustomFormFields('device_inventory');

  // Custom field filter state
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, any>>({});
  const [filters, setFilters] = useState({
    searchQuery: '',
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

  // Supplier management dialog
  const [supplierDialog, setSupplierDialog] = useState(false);

  // Device dialog
  const [deviceDialog, setDeviceDialog] = useState<{ open: boolean; editing: DeviceType | null }>({ open: false, editing: null });
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_number: '',
    serial_number: '',
    purchase_date: '',
    delivery_date: '',
    supplier_id: '',
    requisition_number: '',
    bod_number: '',
    warranty_date: '',
    price: '',
    bill_details: '',
    status: 'available',
    notes: '',
    category_id: '',
    support_user_id: '',
    unit_id: '',
    // Device specs
    ram_info: '',
    storage_info: '',
    processor_info: '',
    has_ups: false,
    ups_info: '',
    monitor_info: '',
    webcam_info: '',
    headset_info: '',
    custom_specs: {} as Record<string, string>,
  });

  // Bulk assign dialog
  const [bulkAssignDialog, setBulkAssignDialog] = useState(false);

  // Category dialog
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; editing: DeviceCategory | null }>({ open: false, editing: null });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // Service history dialog
  const [serviceDialog, setServiceDialog] = useState<{ open: boolean; device: DeviceType | null }>({ open: false, device: null });
  const [serviceHistory, setServiceHistory] = useState<DeviceServiceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add service dialog
  const [addServiceDialog, setAddServiceDialog] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    service_date: format(new Date(), 'yyyy-MM-dd'),
    service_type: 'maintenance',
    description: '',
    cost: '',
    technician_name: '',
    task_id: '',
  });

  // Quick assign dialog
  const [quickAssignDialog, setQuickAssignDialog] = useState<{ open: boolean; device: DeviceType | null }>({ open: false, device: null });
  const [quickAssignUserId, setQuickAssignUserId] = useState<string>('');

  // Device details dialog
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; device: DeviceType | null }>({ open: false, device: null });

  // Disposal dialog
  const [disposalDialog, setDisposalDialog] = useState<{ open: boolean; device: DeviceType | null }>({ open: false, device: null });

  // Tasks for linking
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string }[]>([]);

  // Load tasks for service history linking
  useEffect(() => {
    const loadTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('task_type', 'office')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setAvailableTasks(data);
      }
    };
    loadTasks();
  }, []);

  // Support user info map
  const supportUserMap: Record<string, SupportUserInfo> = {};
  supportUsers.forEach(su => {
    const dept = departments.find(d => d.id === su.department_id);
    const unit = dept ? units.find(u => u.id === dept.unit_id) : null;
    supportUserMap[su.id] = {
      id: su.id,
      name: su.name,
      department_name: dept?.name || 'N/A',
      unit_name: unit?.name || 'N/A',
    };
  });

  // Filter devices with cascading logic
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const query = filters.searchQuery.toLowerCase();
      const supplierName = suppliers.find(s => s.id === device.supplier_id)?.name?.toLowerCase() || device.supplier_name?.toLowerCase();
      const matchesSearch = !query ||
        device.device_name.toLowerCase().includes(query) ||
        device.device_number?.toLowerCase().includes(query) ||
        device.serial_number?.toLowerCase().includes(query) ||
        (supplierName && supplierName.includes(query)) ||
        device.requisition_number?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (filters.category !== 'all' && device.category_id !== filters.category) return false;
      if (filters.status !== 'all' && device.status !== filters.status) return false;
      if (filters.unitLocation !== 'all' && device.unit_id !== filters.unitLocation) return false;
      if (filters.supplier !== 'all' && device.supplier_id !== filters.supplier) return false;
      
      // RAM type filter
      if (filters.ramType !== 'all') {
        const ram = (device.ram_info || '').toLowerCase();
        if (!ram.includes(filters.ramType.replace('ddr', 'ddr'))) return false;
      }

      // Storage type filter
      if (filters.storageType !== 'all') {
        const storage = (device.storage_info || '').toLowerCase();
        if (filters.storageType === 'nvme' && !storage.includes('nvme')) return false;
        if (filters.storageType === 'sata_ssd' && !(storage.includes('sata') || (storage.includes('ssd') && !storage.includes('nvme')))) return false;
        if (filters.storageType === 'hdd' && !storage.includes('hdd')) return false;
      }

      // Processor generation filter
      if (filters.processorGen !== 'all') {
        const proc = ((device as any).processor_info || '').toLowerCase();
        const ram = (device.ram_info || '').toLowerCase(); // fallback search in other fields
        const notes = (device.notes || '').toLowerCase();
        const customSpecs = device.custom_specs ? JSON.stringify(device.custom_specs).toLowerCase() : '';
        const allText = `${proc} ${notes} ${customSpecs}`;
        
        const genMap: Record<string, string[]> = {
          'gen8': ['8th gen', 'i3-8', 'i5-8', 'i7-8', 'i9-8', '8th generation'],
          'gen9': ['9th gen', 'i3-9', 'i5-9', 'i7-9', 'i9-9', '9th generation'],
          'gen10': ['10th gen', 'i3-10', 'i5-10', 'i7-10', 'i9-10', '10th generation'],
          'gen11': ['11th gen', 'i3-11', 'i5-11', 'i7-11', 'i9-11', '11th generation'],
          'gen12': ['12th gen', 'i3-12', 'i5-12', 'i7-12', 'i9-12', '12th generation'],
          'gen13': ['13th gen', 'i3-13', 'i5-13', 'i7-13', 'i9-13', '13th generation'],
          'gen14': ['14th gen', 'i3-14', 'i5-14', 'i7-14', 'i9-14', '14th generation'],
          'ryzen3': ['ryzen 3', 'ryzen3'],
          'ryzen5': ['ryzen 5', 'ryzen5'],
          'ryzen7': ['ryzen 7', 'ryzen7'],
          'ryzen9': ['ryzen 9', 'ryzen9'],
          'apple_m1': ['m1', 'apple m1'],
          'apple_m2': ['m2', 'apple m2'],
          'apple_m3': ['m3', 'apple m3'],
          'apple_m4': ['m4', 'apple m4'],
        };
        const keywords = genMap[filters.processorGen] || [];
        if (!keywords.some(kw => allText.includes(kw))) return false;
      }

      // Cascading user filter
      if (filters.supportUser !== 'all') {
        if (device.support_user_id !== filters.supportUser) return false;
      } else if (filters.department !== 'all') {
        const user = supportUsers.find(u => u.id === device.support_user_id);
        if (!user || user.department_id !== filters.department) return false;
      }

      // Custom field filters (stored in custom_specs)
      if (Object.keys(customFieldFilters).length > 0) {
        const specs: Record<string, any> = device.custom_specs || {};
        const matches = Object.entries(customFieldFilters).every(([key, value]) => {
          const fieldValue = specs[key];
          if (typeof value === 'boolean') return String(fieldValue) === String(value);
          if (typeof value === 'string') {
            return String(fieldValue || '').toLowerCase().includes(value.toLowerCase());
          }
          return fieldValue === value;
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [devices, filters, supportUsers, suppliers, customFieldFilters]);

  // Check warranty status
  const getWarrantyStatus = (warrantyDate: string | null) => {
    if (!warrantyDate) return null;
    const warranty = new Date(warrantyDate);
    const today = new Date();
    const warningDate = addDays(today, 30);

    if (isBefore(warranty, today)) {
      return { status: 'expired', label: language === 'bn' ? 'মেয়াদ উত্তীর্ণ' : 'Expired', color: 'bg-red-500/20 text-red-600' };
    }
    if (isBefore(warranty, warningDate)) {
      return { status: 'expiring', label: language === 'bn' ? 'শীঘ্রই শেষ' : 'Expiring Soon', color: 'bg-yellow-500/20 text-yellow-600' };
    }
    return { status: 'valid', label: language === 'bn' ? 'সক্রিয়' : 'Active', color: 'bg-green-500/20 text-green-600' };
  };

  // Device dialog handlers
  const openDeviceDialog = (device?: DeviceType) => {
    if (device) {
      setDeviceForm({
        device_name: device.device_name,
        device_number: device.device_number || '',
        serial_number: device.serial_number || '',
        purchase_date: device.purchase_date || '',
        delivery_date: device.delivery_date || '',
        supplier_id: device.supplier_id || '',
        requisition_number: device.requisition_number || '',
        bod_number: device.bod_number || '',
        warranty_date: device.warranty_date || '',
        price: device.price?.toString() || '',
        bill_details: device.bill_details || '',
        status: device.status,
        notes: device.notes || '',
        category_id: device.category_id || '',
        support_user_id: device.support_user_id || '',
        unit_id: device.unit_id || '',
        ram_info: device.ram_info || '',
        storage_info: device.storage_info || '',
        processor_info: (device as any).processor_info || '',
        has_ups: device.has_ups || false,
        ups_info: device.ups_info || '',
        monitor_info: device.monitor_info || '',
        webcam_info: device.webcam_info || '',
        headset_info: device.headset_info || '',
        custom_specs: device.custom_specs || {},
      });
      setDeviceDialog({ open: true, editing: device });
    } else {
      setDeviceForm({
        device_name: '',
        device_number: '',
        serial_number: '',
        purchase_date: '',
        delivery_date: '',
        supplier_id: '',
        requisition_number: '',
        bod_number: '',
        warranty_date: '',
        price: '',
        bill_details: '',
        status: 'available',
        notes: '',
        category_id: categories[0]?.id || '',
        support_user_id: '',
        unit_id: '',
        ram_info: '',
        storage_info: '',
        processor_info: '',
        has_ups: false,
        ups_info: '',
        monitor_info: '',
        webcam_info: '',
        headset_info: '',
        custom_specs: {},
      });
      setDeviceDialog({ open: true, editing: null });
    }
  };

  const handleSaveDevice = async () => {
    if (!deviceForm.device_name.trim()) {
      toast.error(language === 'bn' ? 'ডিভাইসের নাম আবশ্যক' : 'Device name is required');
      return;
    }

     // Validate device number uniqueness if provided
     if (deviceForm.device_number.trim()) {
       const existingDevice = devices.find(
         d => d.device_number?.toLowerCase() === deviceForm.device_number.trim().toLowerCase() &&
              d.id !== deviceDialog.editing?.id
       );
       if (existingDevice) {
         toast.error(
           language === 'bn' 
             ? `এই ডিভাইস নম্বর (${deviceForm.device_number}) ইতিমধ্যে ব্যবহৃত হয়েছে "${existingDevice.device_name}" এ` 
             : `Device number "${deviceForm.device_number}" is already used by "${existingDevice.device_name}"`
         );
         return;
       }
     }
 
    const data = {
      device_name: deviceForm.device_name.trim(),
       device_number: deviceForm.device_number.trim() || null,
      serial_number: deviceForm.serial_number || null,
      purchase_date: deviceForm.purchase_date || null,
      delivery_date: deviceForm.delivery_date || null,
      supplier_id: deviceForm.supplier_id || null,
      supplier_name: suppliers.find(s => s.id === deviceForm.supplier_id)?.name || null,
      requisition_number: deviceForm.requisition_number || null,
      bod_number: deviceForm.bod_number || null,
      warranty_date: deviceForm.warranty_date || null,
      price: deviceForm.price ? parseFloat(deviceForm.price) : null,
      bill_details: deviceForm.bill_details || null,
      status: deviceForm.status,
      notes: deviceForm.notes || null,
      category_id: deviceForm.category_id || null,
      support_user_id: deviceForm.support_user_id || null,
      unit_id: deviceForm.unit_id || null,
      ram_info: deviceForm.ram_info || null,
      storage_info: deviceForm.storage_info || null,
      processor_info: deviceForm.processor_info || null,
      has_ups: deviceForm.has_ups,
      ups_info: deviceForm.ups_info || null,
      monitor_info: deviceForm.monitor_info || null,
      webcam_info: deviceForm.webcam_info || null,
      headset_info: deviceForm.headset_info || null,
      custom_specs: Object.keys(deviceForm.custom_specs).length > 0 ? deviceForm.custom_specs : null,
    };

    try {
      if (deviceDialog.editing) {
        await updateDevice(deviceDialog.editing.id, data);
        toast.success(language === 'bn' ? 'ডিভাইস আপডেট হয়েছে' : 'Device updated');
      } else {
        await addDevice(data);
        toast.success(language === 'bn' ? 'ডিভাইস যোগ হয়েছে' : 'Device added');
      }
      setDeviceDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm(language === 'bn' ? 'এই ডিভাইস মুছে ফেলতে চান?' : 'Delete this device?')) return;
    const success = await deleteDevice(id);
    if (success) {
      toast.success(language === 'bn' ? 'ডিভাইস মুছে ফেলা হয়েছে' : 'Device deleted');
    } else {
      toast.error(language === 'bn' ? 'মুছতে ব্যর্থ' : 'Failed to delete');
    }
  };

  // Category handlers
  const openCategoryDialog = (category?: DeviceCategory) => {
    if (category) {
      setCategoryForm({ name: category.name, description: category.description || '' });
      setCategoryDialog({ open: true, editing: category });
    } else {
      setCategoryForm({ name: '', description: '' });
      setCategoryDialog({ open: true, editing: null });
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error(language === 'bn' ? 'ক্যাটাগরি নাম আবশ্যক' : 'Category name is required');
      return;
    }

    try {
      if (categoryDialog.editing) {
        await updateCategory(categoryDialog.editing.id, categoryForm);
        toast.success(language === 'bn' ? 'ক্যাটাগরি আপডেট হয়েছে' : 'Category updated');
      } else {
        await addCategory(categoryForm.name, categoryForm.description);
        toast.success(language === 'bn' ? 'ক্যাটাগরি যোগ হয়েছে' : 'Category added');
      }
      setCategoryDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(language === 'bn' ? 'এই ক্যাটাগরি মুছে ফেলতে চান?' : 'Delete this category?')) return;
    const success = await deleteCategory(id);
    if (success) {
      toast.success(language === 'bn' ? 'ক্যাটাগরি মুছে ফেলা হয়েছে' : 'Category deleted');
    } else {
      toast.error(language === 'bn' ? 'মুছতে ব্যর্থ' : 'Failed to delete');
    }
  };

  // Service history handlers
  const openServiceDialog = async (device: DeviceType) => {
    setServiceDialog({ open: true, device });
    setLoadingHistory(true);
    const history = await getServiceHistory(device.id);
    setServiceHistory(history);
    setLoadingHistory(false);
  };

  const handleAddService = async () => {
    if (!serviceDialog.device || !serviceForm.service_date || !serviceForm.service_type) {
      toast.error(language === 'bn' ? 'তারিখ ও ধরন আবশ্যক' : 'Date and type are required');
      return;
    }

    const record = await addServiceRecord({
      device_id: serviceDialog.device.id,
      service_date: serviceForm.service_date,
      service_type: serviceForm.service_type,
      description: serviceForm.description || null,
      cost: serviceForm.cost ? parseFloat(serviceForm.cost) : null,
      technician_name: serviceForm.technician_name || null,
      task_id: serviceForm.task_id || null,
    });

    if (record) {
      setServiceHistory(prev => [record, ...prev]);
      toast.success(language === 'bn' ? 'সার্ভিস রেকর্ড যোগ হয়েছে' : 'Service record added');
      setAddServiceDialog(false);
      setServiceForm({
        service_date: format(new Date(), 'yyyy-MM-dd'),
        service_type: 'maintenance',
        description: '',
        cost: '',
        technician_name: '',
        task_id: '',
      });
    } else {
      toast.error(language === 'bn' ? 'যোগ করতে ব্যর্থ' : 'Failed to add');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm(language === 'bn' ? 'এই রেকর্ড মুছে ফেলতে চান?' : 'Delete this record?')) return;
    const success = await deleteServiceRecord(id);
    if (success) {
      setServiceHistory(prev => prev.filter(s => s.id !== id));
      toast.success(language === 'bn' ? 'রেকর্ড মুছে ফেলা হয়েছে' : 'Record deleted');
    }
  };

  // Quick assign handler
  const handleQuickAssign = async () => {
    if (!quickAssignDialog.device) return;
    
    const success = await updateDevice(quickAssignDialog.device.id, {
      support_user_id: quickAssignUserId || null,
      status: quickAssignUserId ? 'assigned' : 'available',
    });
    
    if (success) {
      toast.success(language === 'bn' ? 'ডিভাইস বরাদ্দ হয়েছে' : 'Device assigned');
      setQuickAssignDialog({ open: false, device: null });
      setQuickAssignUserId('');
    } else {
      toast.error(language === 'bn' ? 'বরাদ্দ করতে ব্যর্থ' : 'Failed to assign');
    }
  };

  const openQuickAssignDialog = (device: DeviceType) => {
    setQuickAssignUserId(device.support_user_id || '');
    setQuickAssignDialog({ open: true, device });
  };

  // Bulk assign handler
  const handleBulkAssign = async (deviceIds: string[], userId: string | null): Promise<boolean> => {
    try {
      for (const deviceId of deviceIds) {
        await updateDevice(deviceId, {
          support_user_id: userId,
          status: userId ? 'assigned' : 'available',
        });
      }
      reload();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Report data for shared ReportActions
  const reportHeaders = ['Device Name', 'Device Number', 'Serial Number', 'Category', 'Status', 'Purchase Date', 'Delivery Date', 'Supplier', 'Requisition No', 'BOD No', 'Warranty Date', 'Price', 'Assigned To', 'Unit', 'Department', 'RAM', 'Storage', 'Processor', 'UPS', 'Monitor', 'Webcam', 'Headset', 'IPBX Model', 'IPBX Extension', 'IP Phone IP', 'IPBX User ID', 'IPBX Password', 'Notes'];
  const reportRows = filteredDevices.map(device => {
    const category = categories.find(c => c.id === device.category_id);
    const supportUser = device.support_user_id ? supportUserMap[device.support_user_id] : null;
    const customSpecs = (device.custom_specs || {}) as Record<string, string>;
    return [
      device.device_name,
      device.device_number || '',
      device.serial_number || '',
      category?.name || '',
      STATUS_OPTIONS.find(s => s.value === device.status)?.label || device.status,
      device.purchase_date || '',
      device.delivery_date || '',
      device.supplier_name || '',
      device.requisition_number || '',
      device.bod_number || '',
      device.warranty_date || '',
      device.price?.toString() || '',
      supportUser?.name || '',
      supportUser?.unit_name || '',
      supportUser?.department_name || '',
      device.ram_info || '',
      device.storage_info || '',
      (device as any).processor_info || '',
      device.has_ups ? (device.ups_info || 'Yes') : 'No',
      device.monitor_info || '',
      device.webcam_info || '',
      device.headset_info || '',
      customSpecs.ipbx_model || '',
      customSpecs.ipbx_extension_number || '',
      customSpecs.ip_phone_ip_address || '',
      customSpecs.ipbx_user_id || '',
      customSpecs.ipbx_password || '',
      device.notes || '',
    ];
  });

  // Stats
  const stats = {
    total: devices.length,
    available: devices.filter(d => d.status === 'available').length,
    assigned: devices.filter(d => d.status === 'assigned').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length,
    disposed: devices.filter(d => d.status === 'disposed').length,
    expiringWarranty: devices.filter(d => {
      const status = getWarrantyStatus(d.warranty_date);
      return status?.status === 'expiring';
    }).length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <LoadingSpinner size={32} className="text-primary" />
        <div className="text-muted-foreground animate-pulse">
          {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading devices...'}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-4 md:space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <HardDrive className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </motion.div>
            {language === 'bn' ? 'ডিভাইস ইনভেন্টরি' : 'Device Inventory'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {language === 'bn' ? 'আপনার সকল ডিভাইস পরিচালনা করুন' : 'Manage all your devices'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DataExportImportButton preset="devices" />
          <ReportActions
            variant="compact"
            headers={reportHeaders}
            rows={reportRows}
            filename={`device-inventory-${format(new Date(), 'yyyy-MM-dd')}`}
            title="Device Inventory Report"
            subtitle={`${filteredDevices.length} devices`}
            summaryCards={[
              { label: 'Total', value: stats.total },
              { label: 'Available', value: stats.available },
              { label: 'Assigned', value: stats.assigned },
              { label: 'Maintenance', value: stats.maintenance },
            ]}
          />
          {isAdmin && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{language === 'bn' ? 'পরিচালনা' : 'Manage'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setBulkAssignDialog(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    {language === 'bn' ? 'ব্যাচ বরাদ্দ' : 'Bulk Assign'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSupplierDialog(true)}>
                    <Truck className="h-4 w-4 mr-2" />
                    {language === 'bn' ? 'সাপ্লায়ার পরিচালনা' : 'Manage Suppliers'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCategoryDialog()}>
                    <Tag className="h-4 w-4 mr-2" />
                    {language === 'bn' ? 'ক্যাটাগরি পরিচালনা' : 'Manage Categories'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={() => openDeviceDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'bn' ? 'ডিভাইস যোগ' : 'Add'}
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
        {[
          { value: stats.total, label: language === 'bn' ? 'মোট ডিভাইস' : 'Total Devices', color: 'text-foreground', bg: 'bg-card' },
          { value: stats.available, label: language === 'bn' ? 'উপলব্ধ' : 'Available', color: 'text-green-600', bg: 'bg-green-500/10 border-green-500/20' },
          { value: stats.assigned, label: language === 'bn' ? 'বরাদ্দকৃত' : 'Assigned', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20' },
          { value: stats.maintenance, label: language === 'bn' ? 'রক্ষণাবেক্ষণে' : 'Maintenance', color: 'text-yellow-600', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { value: stats.disposed, label: language === 'bn' ? 'বাতিল' : 'Disposed', color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/20' },
          { value: stats.expiringWarranty, label: language === 'bn' ? 'ওয়ারেন্টি শেষ' : 'Warranty Expiring', color: 'text-orange-600', bg: 'bg-orange-500/10 border-orange-500/20' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className={`${stat.bg} hover-glow transition-all duration-200`}>
              <CardContent className="p-3 md:p-4 text-center">
                <motion.div 
                  className={`text-lg md:text-2xl font-bold font-mono-number ${stat.color}`}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: index * 0.05 + 0.1 }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <Card className="bg-card animate-fade-in-up stagger-2">
        <CardContent className="p-3 md:p-4">
          <DeviceFilters
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            units={units}
            departments={departments}
            supportUsers={supportUsers}
            suppliers={suppliers}
            statusOptions={STATUS_OPTIONS}
            devices={devices}
            customFields={deviceCustomFields}
            customFieldFilters={customFieldFilters}
            onCustomFieldFiltersChange={setCustomFieldFilters}
          />
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card className="bg-card">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{language === 'bn' ? 'ডিভাইস' : 'Device'}</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">{language === 'bn' ? 'সিরিয়াল' : 'Serial'}</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</TableHead>
                  <TableHead className="text-xs">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">{language === 'bn' ? 'বরাদ্দ' : 'Assigned'}</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">{language === 'bn' ? 'ওয়ারেন্টি' : 'Warranty'}</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">{language === 'bn' ? 'মূল্য' : 'Price'}</TableHead>
                  <TableHead className="text-xs w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <HardDrive className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      {language === 'bn' ? 'কোন ডিভাইস পাওয়া যায়নি' : 'No devices found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevices.map(device => {
                    const category = categories.find(c => c.id === device.category_id);
                    const status = STATUS_OPTIONS.find(s => s.value === device.status);
                    const warranty = getWarrantyStatus(device.warranty_date);
                    const supportUser = device.support_user_id ? supportUserMap[device.support_user_id] : null;

                    return (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DeviceQRCode 
                              device={device} 
                              supportUserName={supportUser?.name}
                              supportUserIp={supportUsers.find(u => u.id === device.support_user_id)?.ip_address || undefined}
                              departmentName={supportUser?.department_name}
                              unitName={supportUser?.unit_name}
                              categoryName={category?.name}
                            />
                            <div>
                              <div className="font-medium text-xs md:text-sm">{device.device_name}</div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">
                                {device.device_number && <span className="mr-2">#{device.device_number}</span>}
                                <span className="md:hidden">{device.serial_number || ''}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell">
                          {device.serial_number || '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {category && (
                            <Badge variant="outline" className="text-[10px] md:text-xs">
                              {category.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] md:text-xs ${status?.color}`}>
                            {language === 'bn' ? status?.labelBn : status?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {supportUser ? (
                            <div className="text-xs">
                              <div className="font-medium">{supportUser.name}</div>
                              <div className="text-muted-foreground text-[10px]">{supportUser.department_name}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {warranty ? (
                            <div>
                              <Badge className={`text-[10px] ${warranty.color}`}>
                                {warranty.label}
                              </Badge>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {format(new Date(device.warranty_date!), 'dd/MM/yyyy')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {device.price ? (
                            <span className="text-xs font-medium">৳{device.price.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* View Section */}
                              <DropdownMenuItem onClick={() => setDetailsDialog({ open: true, device })}>
                                <Eye className="h-4 w-4 mr-2" />
                                {language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openServiceDialog(device)}>
                                <Wrench className="h-4 w-4 mr-2" />
                                {language === 'bn' ? 'সার্ভিস ইতিহাস' : 'Service History'}
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  {/* Manage Section */}
                                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {language === 'bn' ? 'পরিচালনা' : 'Manage'}
                                  </div>
                                  <DropdownMenuItem onClick={() => openDeviceDialog(device)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openQuickAssignDialog(device)}>
                                    <User className="h-4 w-4 mr-2" />
                                    {language === 'bn' ? 'দ্রুত বরাদ্দ' : 'Quick Assign'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {/* Danger Section */}
                                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {language === 'bn' ? 'বিপজ্জনক' : 'Danger'}
                                  </div>
                                  <DropdownMenuItem 
                                    onClick={() => setDisposalDialog({ open: true, device })}
                                    className="text-orange-600 focus:text-orange-600"
                                  >
                                    <PackageX className="h-4 w-4 mr-2" />
                                    {language === 'bn' ? 'বাতিল করুন' : 'Dispose'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteDevice(device.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {language === 'bn' ? 'মুছুন' : 'Delete'}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Device Dialog */}
      <Dialog open={deviceDialog.open} onOpenChange={(open) => setDeviceDialog({ open, editing: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {deviceDialog.editing 
                ? (language === 'bn' ? 'ডিভাইস সম্পাদনা' : 'Edit Device')
                : (language === 'bn' ? 'নতুন ডিভাইস যোগ করুন' : 'Add New Device')
              }
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="basic" className="text-xs">
                {language === 'bn' ? 'মৌলিক তথ্য' : 'Basic Info'}
              </TabsTrigger>
              <TabsTrigger value="purchase" className="text-xs">
                {language === 'bn' ? 'ক্রয় তথ্য' : 'Purchase'}
              </TabsTrigger>
              <TabsTrigger value="assignment" className="text-xs">
                {language === 'bn' ? 'বরাদ্দ' : 'Assignment'}
              </TabsTrigger>
              <TabsTrigger value="specs" className="text-xs">
                {language === 'bn' ? 'স্পেসিফিকেশন' : 'Specs'}
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'ডিভাইসের নাম' : 'Device Name'} *</Label>
                  <Input
                    value={deviceForm.device_name}
                    onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
                    placeholder={language === 'bn' ? 'ল্যাপটপ HP ProBook 450' : 'Laptop HP ProBook 450'}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">
                    {language === 'bn' ? 'ডিভাইস নম্বর' : 'Device Number'}
                    <span className="text-muted-foreground ml-1">
                      ({language === 'bn' ? 'QR লিঙ্কের জন্য আবশ্যক' : 'Required for QR link'})
                    </span>
                  </Label>
                  <Input
                    value={deviceForm.device_number}
                    onChange={(e) => setDeviceForm({ ...deviceForm, device_number: e.target.value.toUpperCase() })}
                    placeholder={language === 'bn' ? 'DEV-001' : 'DEV-001'}
                    className={`text-sm font-mono ${
                      deviceForm.device_number.trim() && 
                      devices.some(d => 
                        d.device_number?.toLowerCase() === deviceForm.device_number.trim().toLowerCase() &&
                        d.id !== deviceDialog.editing?.id
                      ) ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                  />
                  {deviceForm.device_number.trim() && 
                    devices.some(d => 
                      d.device_number?.toLowerCase() === deviceForm.device_number.trim().toLowerCase() &&
                      d.id !== deviceDialog.editing?.id
                    ) && (
                    <p className="text-xs text-destructive">
                      {language === 'bn' ? 'এই নম্বর ইতিমধ্যে ব্যবহৃত' : 'This number is already in use'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'সিরিয়াল নম্বর' : 'Serial Number'}</Label>
                  <Input
                    value={deviceForm.serial_number}
                    onChange={(e) => setDeviceForm({ ...deviceForm, serial_number: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</Label>
                  <Select value={deviceForm.category_id} onValueChange={(v) => setDeviceForm({ ...deviceForm, category_id: v })}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={language === 'bn' ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select category'} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</Label>
                  <Select value={deviceForm.status} onValueChange={(v) => setDeviceForm({ ...deviceForm, status: v })}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {language === 'bn' ? status.labelBn : status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">{language === 'bn' ? 'নোট' : 'Notes'}</Label>
                  <Textarea
                    value={deviceForm.notes}
                    onChange={(e) => setDeviceForm({ ...deviceForm, notes: e.target.value })}
                    className="text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Purchase Tab */}
            <TabsContent value="purchase" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'ক্রয়ের তারিখ' : 'Purchase Date'}</Label>
                  <Input
                    type="date"
                    value={deviceForm.purchase_date}
                    onChange={(e) => setDeviceForm({ ...deviceForm, purchase_date: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'ডেলিভারি তারিখ' : 'Delivery Date'}</Label>
                  <Input
                    type="date"
                    value={deviceForm.delivery_date}
                    onChange={(e) => setDeviceForm({ ...deviceForm, delivery_date: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'সরবরাহকারী' : 'Supplier'}</Label>
                  <Select
                    value={deviceForm.supplier_id || "none"}
                    onValueChange={(value) => setDeviceForm({ ...deviceForm, supplier_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={language === 'bn' ? 'সরবরাহকারী নির্বাচন করুন' : 'Select supplier'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {language === 'bn' ? 'কোনো সরবরাহকারী নেই' : 'No supplier'}
                      </SelectItem>
                      {suppliers.filter(s => s.is_active).map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'মূল্য (৳)' : 'Price (৳)'}</Label>
                  <Input
                    type="number"
                    value={deviceForm.price}
                    onChange={(e) => setDeviceForm({ ...deviceForm, price: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'রিকুইজিশন নম্বর' : 'Requisition Number'}</Label>
                  <Input
                    value={deviceForm.requisition_number}
                    onChange={(e) => setDeviceForm({ ...deviceForm, requisition_number: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'BOD নম্বর' : 'BOD Number'}</Label>
                  <Input
                    value={deviceForm.bod_number}
                    onChange={(e) => setDeviceForm({ ...deviceForm, bod_number: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'bn' ? 'ওয়ারেন্টি তারিখ' : 'Warranty Date'}</Label>
                  <Input
                    type="date"
                    value={deviceForm.warranty_date}
                    onChange={(e) => setDeviceForm({ ...deviceForm, warranty_date: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs">{language === 'bn' ? 'বিল বিবরণ' : 'Bill Details'}</Label>
                  <Textarea
                    value={deviceForm.bill_details}
                    onChange={(e) => setDeviceForm({ ...deviceForm, bill_details: e.target.value })}
                    placeholder={language === 'bn' ? 'বিল নম্বর, তারিখ ইত্যাদি' : 'Bill number, date, etc.'}
                    className="text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Assignment Tab */}
            <TabsContent value="assignment" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CascadingAssignment
                  units={units}
                  departments={departments}
                  supportUsers={supportUsers}
                  selectedUserId={deviceForm.support_user_id}
                  onUserChange={(userId) => setDeviceForm({ ...deviceForm, support_user_id: userId })}
                />

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {language === 'bn' ? 'ইউনিট লোকেশন (ফিজিক্যাল)' : 'Unit Location (Physical)'}
                  </Label>
                  <Select value={deviceForm.unit_id || "none"} onValueChange={(v) => setDeviceForm({ ...deviceForm, unit_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={language === 'bn' ? 'ইউনিট নির্বাচন করুন' : 'Select unit'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{language === 'bn' ? 'নির্বাচন করুন' : 'Select'}</SelectItem>
                      {units.map(unit => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Specs Tab */}
            <TabsContent value="specs" className="space-y-4">
              <DeviceSpecsForm
                categoryName={categories.find(c => c.id === deviceForm.category_id)?.name || null}
                specs={{
                  ram_info: deviceForm.ram_info,
                  storage_info: deviceForm.storage_info,
                  processor_info: deviceForm.processor_info,
                  has_ups: deviceForm.has_ups,
                  ups_info: deviceForm.ups_info,
                  monitor_info: deviceForm.monitor_info,
                  webcam_info: deviceForm.webcam_info,
                  headset_info: deviceForm.headset_info,
                  custom_specs: deviceForm.custom_specs,
                }}
                onChange={(specs) => setDeviceForm({ ...deviceForm, ...specs })}
              />
              {!categories.find(c => c.id === deviceForm.category_id) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {language === 'bn' ? 'প্রথমে "মৌলিক তথ্য" ট্যাব থেকে ক্যাটাগরি নির্বাচন করুন' : 'Please select a category from "Basic Info" tab first'}
                </p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveDevice}>
              {deviceDialog.editing 
                ? (language === 'bn' ? 'আপডেট করুন' : 'Update')
                : (language === 'bn' ? 'যোগ করুন' : 'Add')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ open, editing: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.editing 
                ? (language === 'bn' ? 'ক্যাটাগরি সম্পাদনা' : 'Edit Category')
                : (language === 'bn' ? 'নতুন ক্যাটাগরি' : 'New Category')
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'নাম' : 'Name'} *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder={language === 'bn' ? 'ল্যাপটপ, ডেস্কটপ, প্রিন্টার' : 'Laptop, Desktop, Printer'}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="text-sm"
                rows={2}
              />
            </div>

            {/* Sample Categories */}
            {categories.length === 0 && (
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'নমুনা ক্যাটাগরি যোগ করুন' : 'Add Sample Categories'}</Label>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'সাধারণ আইটি ডিভাইস ক্যাটাগরি দ্রুত যোগ করুন। প্রতিটি ক্যাটাগরির জন্য নির্দিষ্ট ফিল্ড স্বয়ংক্রিয়ভাবে দেখাবে।'
                    : 'Quickly add common IT device categories. Each category will show its specific fields automatically.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    const sampleCategories = [
                      { name: 'Desktop', description: 'Desktop computers and workstations (RAM, Storage, Processor, Monitor, UPS fields)' },
                      { name: 'Desktop Clone PC', description: 'Assembled/Clone desktop PCs (RAM, Storage, Processor, Monitor, UPS fields)' },
                      { name: 'Laptop', description: 'Portable computers and notebooks (RAM, Storage, Processor, Webcam, Headset fields)' },
                      { name: 'Router', description: 'Network routers and access points (SSID, WiFi Password, Admin IP, LAN/WAN IP fields)' },
                      { name: 'Switch', description: 'Network switches and hubs (Management IP, VLAN, Subnet, Gateway, Port Count fields)' },
                      { name: 'Server', description: 'Rack/Tower servers (LAN/WAN IP, iLO/IPMI, OS, RAID Config, Domain fields)' },
                      { name: 'Printer', description: 'Printers, scanners, and copiers (IP Address, Model, Driver, Toner Type fields)' },
                      { name: 'UPS', description: 'Uninterruptible power supplies (Capacity VA, Battery Count, Load Info fields)' },
                      { name: 'CCTV', description: 'Security cameras and DVR/NVR (IP Address, DVR/NVR IP, Channel, Location fields)' },
                      { name: 'Firewall', description: 'Network firewalls and gateways (SSID, Admin IP, WAN/LAN IP, Firmware fields)' },
                      { name: 'Access Point', description: 'Wireless access points (SSID, WiFi Password, Admin IP, Firmware fields)' },
                      { name: 'IPBX', description: 'IPBX systems and IP phones (Model, Extension, IP Phone IP, User ID, Password fields)' },
                      { name: 'NAS', description: 'Network attached storage (LAN IP, Admin Username, RAID Config, OS fields)' },
                      { name: 'Scanner', description: 'Standalone scanners (IP Address, Model, Driver Info fields)' },
                      { name: 'Monitor', description: 'Standalone display monitors' },
                      { name: 'Projector', description: 'Projectors and display equipment' },
                      { name: 'Phone', description: 'IP phones and communication devices (Model, Extension, IP Address, User ID fields)' },
                      { name: 'Tablet', description: 'Tablets and handheld devices' },
                      { name: 'Other', description: 'Miscellaneous IT equipment' },
                    ];
                    const existingNames = categories.map(c => c.name.toLowerCase());
                    let added = 0;
                    for (const cat of sampleCategories) {
                      if (!existingNames.includes(cat.name.toLowerCase())) {
                        await addCategory(cat.name, cat.description);
                        added++;
                      }
                    }
                    toast.success(
                      language === 'bn' 
                        ? `${added}টি নমুনা ক্যাটাগরি যোগ হয়েছে` 
                        : `${added} sample categories added`
                    );
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {language === 'bn' ? '১৯টি নমুনা ক্যাটাগরি যোগ করুন' : 'Add 19 Sample IT Categories'}
                </Button>
              </div>
            )}

            {/* Existing Categories */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'বিদ্যমান ক্যাটাগরি' : 'Existing Categories'}</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {categories.map(cat => {
                    const typeLabel = (() => {
                      const lower = cat.name.toLowerCase();
                      if (['desktop', 'laptop', 'notebook', 'clone', 'workstation', 'all-in-one'].some(k => lower.includes(k))) return '🖥️';
                      if (['router', 'firewall', 'gateway', 'access point', 'modem', 'wifi'].some(k => lower.includes(k))) return '📡';
                      if (['switch', 'hub', 'patch'].some(k => lower.includes(k))) return '🔌';
                      if (['server', 'nas', 'rack'].some(k => lower.includes(k))) return '🖧';
                      if (['printer', 'scanner', 'copier'].some(k => lower.includes(k))) return '🖨️';
                      if (['ups', 'power', 'ips', 'stabilizer'].some(k => lower.includes(k))) return '🔋';
                      if (['cctv', 'camera', 'dvr', 'nvr'].some(k => lower.includes(k))) return '📹';
                      if (['monitor', 'display'].some(k => lower.includes(k))) return '🖵';
                      if (['phone'].some(k => lower.includes(k))) return '📞';
                      if (['projector'].some(k => lower.includes(k))) return '📽️';
                      if (['tablet'].some(k => lower.includes(k))) return '📱';
                      return '📦';
                    })();
                    return (
                      <div key={cat.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{typeLabel}</span>
                          <div>
                            <span className="text-sm font-medium">{cat.name}</span>
                            {cat.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{cat.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            setCategoryForm({ name: cat.name, description: cat.description || '' });
                            setCategoryDialog({ open: true, editing: cat });
                          }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </Button>
            <Button onClick={handleSaveCategory} disabled={!categoryForm.name.trim()}>
              {categoryDialog.editing 
                ? (language === 'bn' ? 'আপডেট' : 'Update')
                : (language === 'bn' ? 'যোগ করুন' : 'Add')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service History Dialog */}
      <Dialog open={serviceDialog.open} onOpenChange={(open) => setServiceDialog({ open, device: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {language === 'bn' ? 'সার্ভিস ইতিহাস' : 'Service History'}
              {serviceDialog.device && (
                <Badge variant="outline" className="ml-2">{serviceDialog.device.device_name}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button size="sm" onClick={() => setAddServiceDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {language === 'bn' ? 'সার্ভিস যোগ করুন' : 'Add Service Record'}
            </Button>

            {loadingHistory ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
              </div>
            ) : serviceHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-2 opacity-30" />
                {language === 'bn' ? 'কোন সার্ভিস রেকর্ড নেই' : 'No service records yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {serviceHistory.map(record => {
                  const serviceType = SERVICE_TYPES.find(s => s.value === record.service_type);
                  const linkedTask = availableTasks.find(t => t.id === record.task_id);
                  
                  return (
                    <Card key={record.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {language === 'bn' ? serviceType?.labelBn : serviceType?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(record.service_date), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            {record.description && (
                              <p className="text-sm">{record.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {record.technician_name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {record.technician_name}
                                </span>
                              )}
                              {record.cost && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ৳{record.cost.toLocaleString()}
                                </span>
                              )}
                              {linkedTask && (
                                <span className="flex items-center gap-1 text-primary">
                                  <FileText className="h-3 w-3" />
                                  {linkedTask.title}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteService(record.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Service Record Dialog */}
      <Dialog open={addServiceDialog} onOpenChange={setAddServiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'bn' ? 'সার্ভিস রেকর্ড যোগ করুন' : 'Add Service Record'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'তারিখ' : 'Date'} *</Label>
                <Input
                  type="date"
                  value={serviceForm.service_date}
                  onChange={(e) => setServiceForm({ ...serviceForm, service_date: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'ধরন' : 'Type'} *</Label>
                <Select value={serviceForm.service_type} onValueChange={(v) => setServiceForm({ ...serviceForm, service_type: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {language === 'bn' ? type.labelBn : type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
              <Textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                className="text-sm"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'টেকনিশিয়ান' : 'Technician'}</Label>
                <Input
                  value={serviceForm.technician_name}
                  onChange={(e) => setServiceForm({ ...serviceForm, technician_name: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'খরচ (৳)' : 'Cost (৳)'}</Label>
                <Input
                  type="number"
                  value={serviceForm.cost}
                  onChange={(e) => setServiceForm({ ...serviceForm, cost: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'লিংকড টাস্ক' : 'Link to Task'}</Label>
              <Select value={serviceForm.task_id || "none"} onValueChange={(v) => setServiceForm({ ...serviceForm, task_id: v === "none" ? "" : v })}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'টাস্ক নির্বাচন (ঐচ্ছিক)' : 'Select task (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'bn' ? 'কোন টাস্ক নয়' : 'No task'}</SelectItem>
                  {availableTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddServiceDialog(false)}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleAddService}>
              {language === 'bn' ? 'যোগ করুন' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Assign Dialog */}
      <Dialog open={quickAssignDialog.open} onOpenChange={(open) => setQuickAssignDialog({ open, device: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {language === 'bn' ? 'ডিভাইস বরাদ্দ করুন' : 'Assign Device'}
            </DialogTitle>
            <DialogDescription>
              {quickAssignDialog.device?.device_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'সাপোর্ট ইউজার নির্বাচন করুন' : 'Select Support User'}</Label>
              <Select value={quickAssignUserId || "none"} onValueChange={(v) => setQuickAssignUserId(v === "none" ? "" : v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'ব্যবহারকারী নির্বাচন করুন' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'bn' ? 'কেউ নয় (উপলব্ধ)' : 'None (Available)'}</SelectItem>
                  {supportUsers.filter(u => u.is_active).map(user => {
                    const dept = departments.find(d => d.id === user.department_id);
                    const unit = dept ? units.find(u => u.id === dept.unit_id) : null;
                    return (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {unit?.name} → {dept?.name}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAssignDialog({ open: false, device: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleQuickAssign}>
              {language === 'bn' ? 'বরাদ্দ করুন' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <BulkDeviceAssign
        open={bulkAssignDialog}
        onOpenChange={setBulkAssignDialog}
        devices={devices}
        supportUsers={supportUsers}
        onAssign={handleBulkAssign}
      />

      {/* Device Details Dialog */}
      <DeviceDetailsDialog
        open={detailsDialog.open}
        onOpenChange={(open) => setDetailsDialog({ open, device: open ? detailsDialog.device : null })}
        device={detailsDialog.device}
        category={detailsDialog.device ? categories.find(c => c.id === detailsDialog.device?.category_id) : null}
        supportUserMap={supportUserMap}
      />

      {/* Supplier Management Dialog */}
      <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {language === 'bn' ? 'সরবরাহকারী পরিচালনা' : 'Manage Suppliers'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn' 
                ? 'সরবরাহকারী যোগ, সম্পাদনা এবং মুছে ফেলুন'
                : 'Add, edit and delete device suppliers'
              }
            </DialogDescription>
          </DialogHeader>
          <SupplierManager
            suppliers={suppliers}
            isAdmin={isAdmin}
            onAdd={addSupplier}
            onUpdate={updateSupplier}
            onDelete={deleteSupplier}
          />
        </DialogContent>
      </Dialog>

      {/* Device Disposal Dialog */}
      <DeviceDisposalDialog
        open={disposalDialog.open}
        onOpenChange={(open) => setDisposalDialog({ open, device: open ? disposalDialog.device : null })}
        device={disposalDialog.device}
        onDeviceDisposed={reload}
      />
    </motion.div>
  );
}
