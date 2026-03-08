import { useState, useRef, useEffect } from 'react';
import { Building2, Users, Briefcase, Plus, Pencil, Trash2, Monitor, Globe, Phone, Mail, User, Search, X, Download, Upload, BarChart3, History, ListTodo, Eye, CheckSquare, Clock, AlertCircle, HardDrive, Flag, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useSupportData, SupportUnit, SupportDepartment, SupportUser } from '@/hooks/useSupportData';
import { useLanguage } from '@/contexts/LanguageContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PasswordField } from '@/components/support/PasswordField';
import { DeviceManagement, DeviceEntry } from '@/components/support/DeviceManagement';
import { UserDeviceAssignment } from '@/components/support/UserDeviceAssignment';
import { useDeviceInventory } from '@/hooks/useDeviceInventory';
import { useAuth } from '@/contexts/AuthContext';
import { DataExportImportButton } from '@/components/shared/DataExportImportButton';
import { ReportActions } from '@/components/shared/ReportActions';
import { useCustomFormFields } from '@/hooks/useCustomFormFields';
import { CustomFieldsFilter, filterByCustomFields } from '@/components/shared/CustomFieldsFilter';

interface SupportUserTask {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  due_date: string | null;
  created_at: string;
  needs_follow_up: boolean | null;
  follow_up_date: string | null;
}

export default function SupportUsers() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const {
    units,
    departments,
    supportUsers,
    activityLogs,
    loading,
    isAdmin,
    addUnit,
    updateUnit,
    deleteUnit,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentsByUnit,
    addSupportUser,
    updateSupportUser,
    deleteSupportUser,
    getUsersByDepartment,
  } = useSupportData();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterExtension, setFilterExtension] = useState<string>('all');
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, any>>({});
  const { fields: supportUserCustomFields } = useCustomFormFields('support_user');

  // Dialog states
  const [unitDialog, setUnitDialog] = useState<{ open: boolean; editing: SupportUnit | null }>({ open: false, editing: null });
  const [deptDialog, setDeptDialog] = useState<{ open: boolean; editing: SupportDepartment | null }>({ open: false, editing: null });
  const [userDialog, setUserDialog] = useState<{ open: boolean; editing: SupportUser | null }>({ open: false, editing: null });
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState<Array<Record<string, string>>>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [unitForm, setUnitForm] = useState({ name: '', description: '' });
  const [deptForm, setDeptForm] = useState({ name: '', description: '', unit_id: '' });
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    device_info: '',
    ip_address: '',
    notes: '',
    department_id: '',
    is_active: true,
    // New credential and device fields
    extension_number: '',
    extension_password: '',
    mail_password: '',
    nas_username: '',
    nas_password: '',
    device_handover_date: '',
    new_device_assign: '',
    device_assign_date: '',
  });

  // Task counts per support user
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  
  // Task details dialog
  const [taskDetailsDialog, setTaskDetailsDialog] = useState<{ open: boolean; user: SupportUser | null }>({ open: false, user: null });
  const [userTasks, setUserTasks] = useState<SupportUserTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: 'medium' });

  // Devices for user form (old manual device entries)
  const [userDevices, setUserDevices] = useState<DeviceEntry[]>([]);

  // Device inventory assignment state
  const { devices: inventoryDevices, categories: deviceCategories, reload: reloadInventory, updateDevice: updateInventoryDevice } = useDeviceInventory();
  const [selectedInventoryDeviceIds, setSelectedInventoryDeviceIds] = useState<string[]>([]);

  // Device counts per support user (now from device_inventory)
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});

  // Load task and device counts for support users
  useEffect(() => {
    const loadCounts = async () => {
      // Load task counts
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('support_user_id')
        .not('support_user_id', 'is', null);
      
      if (tasksData) {
        const counts: Record<string, number> = {};
        tasksData.forEach(task => {
          if (task.support_user_id) {
            counts[task.support_user_id] = (counts[task.support_user_id] || 0) + 1;
          }
        });
        setTaskCounts(counts);
      }

      // Load device counts from both support_user_devices and device_inventory
      const [manualDevicesRes, inventoryDevicesRes] = await Promise.all([
        supabase.from('support_user_devices').select('support_user_id'),
        supabase.from('device_inventory').select('support_user_id').not('support_user_id', 'is', null)
      ]);
      
      const counts: Record<string, number> = {};
      
      if (manualDevicesRes.data) {
        manualDevicesRes.data.forEach(device => {
          if (device.support_user_id) {
            counts[device.support_user_id] = (counts[device.support_user_id] || 0) + 1;
          }
        });
      }
      
      if (inventoryDevicesRes.data) {
        inventoryDevicesRes.data.forEach(device => {
          if (device.support_user_id) {
            counts[device.support_user_id] = (counts[device.support_user_id] || 0) + 1;
          }
        });
      }
      
      setDeviceCounts(counts);
    };
    loadCounts();
  }, [supportUsers, inventoryDevices]);

  // Load tasks for a specific support user
  const loadUserTasks = async (userId: string) => {
    setLoadingTasks(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, priority, status, due_date, created_at, needs_follow_up, follow_up_date')
      .eq('support_user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error(language === 'bn' ? 'টাস্ক লোড করতে ব্যর্থ' : 'Failed to load tasks');
    } else {
      setUserTasks(data || []);
    }
    setLoadingTasks(false);
  };

  const createTaskForUser = async (supportUserId: string) => {
    if (!user || !newTaskForm.title.trim()) return;
    setCreatingTask(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: newTaskForm.title.trim(),
        description: newTaskForm.description.trim() || null,
        priority: newTaskForm.priority,
        status: 'todo',
        task_type: 'office',
        support_user_id: supportUserId,
      });
      if (error) throw error;
      toast.success(language === 'bn' ? 'টাস্ক তৈরি হয়েছে' : 'Task created');
      setNewTaskForm({ title: '', description: '', priority: 'medium' });
      loadUserTasks(supportUserId);
      // Update task counts
      setTaskCounts(prev => ({
        ...prev,
        [supportUserId]: (prev[supportUserId] || 0) + 1,
      }));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreatingTask(false);
    }
  };

  const openTaskDetailsDialog = (user: SupportUser) => {
    setTaskDetailsDialog({ open: true, user });
    setNewTaskForm({ title: '', description: '', priority: 'medium' });
    loadUserTasks(user.id);
  };

  // Get unique extension numbers for filter
  const uniqueExtensions = Array.from(new Set(supportUsers.map(u => u.extension_number).filter(Boolean))).sort() as string[];

  // Filter support users based on search and filters
  const filteredSupportUsers = supportUsers.filter(user => {
    // Search filter - now includes device_info, ip_address, and extension_number
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      user.name.toLowerCase().includes(query) ||
      (user.email?.toLowerCase().includes(query)) ||
      (user.designation?.toLowerCase().includes(query)) ||
      (user.device_info?.toLowerCase().includes(query)) ||
      (user.ip_address?.toLowerCase().includes(query)) ||
      (user.extension_number?.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // Unit filter
    if (filterUnit !== 'all') {
      const dept = departments.find(d => d.id === user.department_id);
      if (!dept || dept.unit_id !== filterUnit) return false;
    }

    // Department filter
    if (filterDepartment !== 'all') {
      if (user.department_id !== filterDepartment) return false;
    }

    // Extension number filter
    if (filterExtension !== 'all') {
      if (user.extension_number !== filterExtension) return false;
    }

    // Custom field filters
    if (Object.keys(customFieldFilters).length > 0) {
      const cf: Record<string, any> = (user as any).custom_fields || {};
      const matches = Object.entries(customFieldFilters).every(([key, value]) => {
        const fieldValue = cf[key];
        if (typeof value === 'boolean') return fieldValue === value;
        if (typeof value === 'string') {
          return String(fieldValue || '').toLowerCase().includes(value.toLowerCase());
        }
        return fieldValue === value;
      });
      if (!matches) return false;
    }

    return true;
  });

  // Get filtered departments based on selected unit
  const filteredDepartmentsForFilter = filterUnit === 'all' 
    ? departments 
    : departments.filter(d => d.unit_id === filterUnit);

  // Unit handlers
  const openUnitDialog = (unit?: SupportUnit) => {
    if (unit) {
      setUnitForm({ name: unit.name, description: unit.description || '' });
      setUnitDialog({ open: true, editing: unit });
    } else {
      setUnitForm({ name: '', description: '' });
      setUnitDialog({ open: true, editing: null });
    }
  };

  const handleSaveUnit = async () => {
    if (!unitForm.name.trim()) {
      toast.error('Unit name is required');
      return;
    }

    try {
      if (unitDialog.editing) {
        await updateUnit(unitDialog.editing.id, unitForm);
        toast.success('Unit updated');
      } else {
        await addUnit(unitForm.name, unitForm.description);
        toast.success('Unit added');
      }
      setUnitDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Delete this unit? All departments and users under it will also be deleted.')) return;
    try {
      await deleteUnit(id);
      toast.success('Unit deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Department handlers
  const openDeptDialog = (dept?: SupportDepartment) => {
    if (dept) {
      setDeptForm({ name: dept.name, description: dept.description || '', unit_id: dept.unit_id });
      setDeptDialog({ open: true, editing: dept });
    } else {
      setDeptForm({ name: '', description: '', unit_id: units[0]?.id || '' });
      setDeptDialog({ open: true, editing: null });
    }
  };

  const handleSaveDept = async () => {
    if (!deptForm.name.trim() || !deptForm.unit_id) {
      toast.error('Department name and unit are required');
      return;
    }

    try {
      if (deptDialog.editing) {
        await updateDepartment(deptDialog.editing.id, deptForm);
        toast.success('Department updated');
      } else {
        await addDepartment(deptForm.unit_id, deptForm.name, deptForm.description);
        toast.success('Department added');
      }
      setDeptDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Delete this department? All users under it will also be deleted.')) return;
    try {
      await deleteDepartment(id);
      toast.success('Department deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Support User handlers
  const loadUserDevices = async (userId: string) => {
    const { data } = await supabase
      .from('support_user_devices')
      .select('*')
      .eq('support_user_id', userId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setUserDevices(data.map(d => ({
        id: d.id,
        device_name: d.device_name,
        device_handover_date: d.device_handover_date || '',
        notes: d.notes || '',
      })));
    } else {
      setUserDevices([]);
    }
  };

  const openUserDialog = async (user?: SupportUser) => {
    if (user) {
      setUserForm({
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        designation: user.designation || '',
        device_info: user.device_info || '',
        ip_address: user.ip_address || '',
        notes: user.notes || '',
        department_id: user.department_id,
        is_active: user.is_active,
        extension_number: user.extension_number || '',
        extension_password: user.extension_password || '',
        mail_password: user.mail_password || '',
        nas_username: user.nas_username || '',
        nas_password: user.nas_password || '',
        device_handover_date: user.device_handover_date || '',
        new_device_assign: user.new_device_assign || '',
        device_assign_date: user.device_assign_date || '',
      });
      setUserDialog({ open: true, editing: user });
      await loadUserDevices(user.id);
      
      // Load inventory devices assigned to this user
      const assignedInventoryIds = inventoryDevices
        .filter(d => d.support_user_id === user.id)
        .map(d => d.id);
      setSelectedInventoryDeviceIds(assignedInventoryIds);
    } else {
      setUserForm({
        name: '',
        email: '',
        phone: '',
        designation: '',
        device_info: '',
        ip_address: '',
        notes: '',
        department_id: departments[0]?.id || '',
        is_active: true,
        extension_number: '',
        extension_password: '',
        mail_password: '',
        nas_username: '',
        nas_password: '',
        device_handover_date: '',
        new_device_assign: '',
        device_assign_date: '',
      });
      setUserDevices([]);
      setSelectedInventoryDeviceIds([]);
      setUserDialog({ open: true, editing: null });
    }
  };

  const saveUserDevices = async (supportUserId: string, userId: string) => {
    // Delete removed devices
    const deletedDevices = userDevices.filter(d => d.isDeleted && d.id && !d.id.startsWith('temp-'));
    for (const device of deletedDevices) {
      await supabase.from('support_user_devices').delete().eq('id', device.id);
    }

    // Add new devices
    const newDevices = userDevices.filter(d => d.isNew && !d.isDeleted);
    for (const device of newDevices) {
      await supabase.from('support_user_devices').insert({
        support_user_id: supportUserId,
        user_id: userId,
        device_name: device.device_name,
        device_handover_date: device.device_handover_date || null,
        notes: device.notes || null,
      });
    }
  };

  // Save inventory device assignments
  const saveInventoryDeviceAssignments = async (supportUserId: string) => {
    // Get current assignments
    const currentlyAssigned = inventoryDevices
      .filter(d => d.support_user_id === supportUserId)
      .map(d => d.id);
    
    // Devices to unassign (were assigned but no longer selected)
    const toUnassign = currentlyAssigned.filter(id => !selectedInventoryDeviceIds.includes(id));
    
    // Devices to assign (selected but not currently assigned)
    const toAssign = selectedInventoryDeviceIds.filter(id => !currentlyAssigned.includes(id));
    
    // Unassign devices
    for (const deviceId of toUnassign) {
      await updateInventoryDevice(deviceId, { support_user_id: null, status: 'available' });
    }
    
    // Assign devices
    for (const deviceId of toAssign) {
      await updateInventoryDevice(deviceId, { support_user_id: supportUserId, status: 'assigned' });
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.name.trim() || !userForm.department_id) {
      toast.error('User name and department are required');
      return;
    }

    try {
      let savedUserId: string | undefined;
      
      if (userDialog.editing) {
        await updateSupportUser(userDialog.editing.id, userForm);
        savedUserId = userDialog.editing.id;
        
        // Get current user id for device saving
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveUserDevices(savedUserId, user.id);
        }
        
        // Save inventory device assignments
        await saveInventoryDeviceAssignments(savedUserId);
        
        toast.success('User updated');
      } else {
        const newUser = await addSupportUser(userForm as any);
        
        // Get newly created user id and save devices
        const { data: { user } } = await supabase.auth.getUser();
        if (user && newUser) {
          await saveUserDevices(newUser.id, user.id);
          // Save inventory device assignments for new user
          await saveInventoryDeviceAssignments(newUser.id);
        }
        
        toast.success('User added');
      }
      setUserDialog({ open: false, editing: null });
      setUserDevices([]);
      setSelectedInventoryDeviceIds([]);
      reloadInventory(); // Refresh device inventory
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await deleteSupportUser(id);
      toast.success('User deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Get unit name for a department
  const getUnitName = (unitId: string) => units.find(u => u.id === unitId)?.name || 'Unknown';

  // Get department name for a user
  const getDeptName = (deptId: string) => departments.find(d => d.id === deptId)?.name || 'Unknown';

  // Report data for shared ReportActions
  const reportHeaders = ['Name', 'Email', 'Phone', 'Designation', 'Unit', 'Department', 'Extension Number', 'Device Info', 'IP Address', 'Status', 'Notes'];
  const reportRows = filteredSupportUsers.map(user => {
    const dept = departments.find(d => d.id === user.department_id);
    const unit = dept ? units.find(u => u.id === dept.unit_id) : null;
    return [
      user.name,
      user.email || '',
      user.phone || '',
      user.designation || '',
      unit?.name || '',
      dept?.name || '',
      user.extension_number || '',
      user.device_info || '',
      user.ip_address || '',
      user.is_active ? 'Active' : 'Inactive',
      user.notes || '',
    ];
  });

  // CSV Import functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error(language === 'bn' ? 'শুধুমাত্র CSV ফাইল সমর্থিত' : 'Only CSV files are supported');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error(language === 'bn' ? 'CSV ফাইলে ডেটা নেই' : 'CSV file has no data');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const requiredFields = ['name', 'department'];
    const missingFields = requiredFields.filter(f => !headers.includes(f));
    
    if (missingFields.length > 0) {
      toast.error(`Missing required columns: ${missingFields.join(', ')}`);
      return;
    }

    const data: Array<Record<string, string>> = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/("([^"]|"")*"|[^,]*)/g)?.map(v => 
        v.trim().replace(/^"|"$/g, '').replace(/""/g, '"')
      ) || [];
      
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      if (!row.name?.trim()) {
        errors.push(`Row ${i + 1}: Name is required`);
        continue;
      }

      if (!row.department?.trim()) {
        errors.push(`Row ${i + 1}: Department is required`);
        continue;
      }

      // Validate department exists
      const dept = departments.find(d => d.name.toLowerCase() === row.department.toLowerCase());
      if (!dept) {
        errors.push(`Row ${i + 1}: Department "${row.department}" not found`);
        continue;
      }

      row._department_id = dept.id;
      data.push(row);
    }

    setImportData(data);
    setImportErrors(errors);
    setImportDialog(true);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) return;
    
    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of importData) {
      try {
        await addSupportUser({
          name: row.name.trim(),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          designation: row.designation?.trim() || null,
          device_info: row.device_info?.trim() || row['device info']?.trim() || null,
          ip_address: row.ip_address?.trim() || row['ip address']?.trim() || null,
          extension_number: row.extension_number?.trim() || row['extension number']?.trim() || null,
          notes: row.notes?.trim() || null,
          department_id: row._department_id,
          is_active: row.status?.toLowerCase() !== 'inactive',
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setImporting(false);
    setImportDialog(false);
    setImportData([]);
    setImportErrors([]);

    if (successCount > 0) {
      toast.success(`${successCount} ${language === 'bn' ? 'জন ইউজার ইম্পোর্ট হয়েছে' : 'users imported successfully'}`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} ${language === 'bn' ? 'জন ইউজার ইম্পোর্ট ব্যর্থ' : 'users failed to import'}`);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Email', 'Phone', 'Designation', 'Department', 'Extension Number', 'Device Info', 'IP Address', 'Status', 'Notes'];
    const exampleRow = ['John Doe', 'john@example.com', '+1234567890', 'Manager', departments[0]?.name || 'IT Support', '1001', 'Windows 11 PC', '192.168.1.100', 'Active', 'Example user'];
    
    const csvContent = [
      headers.join(','),
      exampleRow.map(cell => `"${cell}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'support_users_import_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(language === 'bn' ? 'টেমপ্লেট ডাউনলোড হয়েছে' : 'Template downloaded');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'bn' ? 'সাপোর্ট ইউজার ম্যানেজমেন্ট' : 'Support User Management'}
        </h1>
        <DataExportImportButton preset="support_users" />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ইউজার' : 'Users'}</span>
            <Badge variant="secondary" className="ml-1 hidden md:inline">{supportUsers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'বিভাগ' : 'Depts'}</span>
            <Badge variant="secondary" className="ml-1 hidden md:inline">{departments.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ইউনিট' : 'Units'}</span>
            <Badge variant="secondary" className="ml-1 hidden md:inline">{units.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'পরিসংখ্যান' : 'Stats'}</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'কার্যকলাপ' : 'Activity'}</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'bn' ? 'নাম, ইমেইল, ডিভাইস, IP...' : 'Search name, email, device, IP...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={filterUnit} onValueChange={(val) => {
              setFilterUnit(val);
              setFilterDepartment('all');
            }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={language === 'bn' ? 'ইউনিট' : 'Unit'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল ইউনিট' : 'All Units'}</SelectItem>
                {units.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={language === 'bn' ? 'বিভাগ' : 'Department'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল বিভাগ' : 'All Departments'}</SelectItem>
                {filteredDepartmentsForFilter.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {uniqueExtensions.length > 0 && (
              <Select value={filterExtension} onValueChange={setFilterExtension}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder={language === 'bn' ? 'এক্সটেনশন' : 'Extension'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'bn' ? 'সকল এক্সটেনশন' : 'All Extensions'}</SelectItem>
                  {uniqueExtensions.map(ext => (
                    <SelectItem key={ext} value={ext}>{ext}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {supportUserCustomFields.length > 0 && (
              <div className="w-full">
                <CustomFieldsFilter
                  fields={supportUserCustomFields}
                  filterValues={customFieldFilters}
                  onFilterChange={setCustomFieldFilters}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <ReportActions
                variant="compact"
                headers={reportHeaders}
                rows={reportRows}
                filename={`support-users-${format(new Date(), 'yyyy-MM-dd')}`}
                title="Support Users Report"
                subtitle={`${filteredSupportUsers.length} users`}
                summaryCards={[
                  { label: 'Total', value: filteredSupportUsers.length },
                  { label: 'Active', value: filteredSupportUsers.filter(u => u.is_active).length },
                  { label: 'Inactive', value: filteredSupportUsers.filter(u => !u.is_active).length },
                ]}
              />
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={departments.length === 0}>
                    <Upload className="h-4 w-4 mr-2" />
                    {language === 'bn' ? 'ইম্পোর্ট' : 'Import CSV'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                    <FileDown className="h-4 w-4 mr-2" />
                    {language === 'bn' ? 'স্যাম্পল CSV' : 'Sample CSV'}
                  </Button>
                  <Button size="sm" onClick={() => openUserDialog()} disabled={departments.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'bn' ? 'নতুন ইউজার' : 'Add User'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {departments.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {language === 'bn' 
                  ? 'প্রথমে ইউনিট এবং বিভাগ যোগ করুন' 
                  : 'Please add units and departments first'}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSupportUsers.map(user => {
              const dept = departments.find(d => d.id === user.department_id);
              const unit = dept ? units.find(u => u.id === dept.unit_id) : null;

              return (
                <Card key={user.id} className={`${!user.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{user.name}</CardTitle>
                          {user.designation && (
                            <p className="text-xs text-muted-foreground">{user.designation}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUserDialog(user)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{unit?.name || 'N/A'} → {dept?.name || 'N/A'}</span>
                    </div>
                    {user.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.device_info && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Monitor className="h-3 w-3" />
                        <span className="truncate">{user.device_info}</span>
                      </div>
                    )}
                    {user.ip_address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        <span>{user.ip_address}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 gap-1 text-primary hover:text-primary/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTaskDetailsDialog(user);
                        }}
                      >
                        <ListTodo className="h-3 w-3" />
                        <span className="text-xs font-medium">{taskCounts[user.id] || 0} {language === 'bn' ? 'টাস্ক' : 'tasks'}</span>
                        <Eye className="h-3 w-3 ml-1" />
                      </Button>
                      {deviceCounts[user.id] > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <HardDrive className="h-3 w-3" />
                          <span className="text-xs">{deviceCounts[user.id]} {language === 'bn' ? 'ডিভাইস' : 'devices'}</span>
                        </div>
                      )}
                      {!user.is_active && (
                        <Badge variant="secondary" className="text-xs ml-auto">Inactive</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredSupportUsers.length === 0 && departments.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery || filterUnit !== 'all' || filterDepartment !== 'all'
                  ? (language === 'bn' ? 'কোন ম্যাচিং ইউজার নেই' : 'No matching users found')
                  : (language === 'bn' ? 'কোন ইউজার নেই' : 'No users yet')}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => openDeptDialog()} disabled={units.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'bn' ? 'নতুন বিভাগ' : 'Add Department'}
              </Button>
            </div>
          )}

          {units.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {language === 'bn' ? 'প্রথমে ইউনিট যোগ করুন' : 'Please add units first'}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map(dept => (
              <Card key={dept.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{dept.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{getUnitName(dept.unit_id)}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeptDialog(dept)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDept(dept.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {dept.description && (
                    <p className="text-sm text-muted-foreground">{dept.description}</p>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {getUsersByDepartment(dept.id).length} {language === 'bn' ? 'ইউজার' : 'users'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units" className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => openUnitDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'bn' ? 'নতুন ইউনিট' : 'Add Unit'}
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map(unit => (
              <Card key={unit.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{unit.name}</CardTitle>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUnitDialog(unit)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUnit(unit.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {unit.description && (
                    <p className="text-sm text-muted-foreground">{unit.description}</p>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {getDepartmentsByUnit(unit.id).length} {language === 'bn' ? 'বিভাগ' : 'departments'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {units.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {language === 'bn' ? 'কোন ইউনিট নেই' : 'No units yet'}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === 'bn' ? 'মোট ইউজার' : 'Total Users'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{supportUsers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === 'bn' ? 'সক্রিয়' : 'Active'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {supportUsers.filter(u => u.is_active).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {supportUsers.filter(u => !u.is_active).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === 'bn' ? 'ইউনিট / বিভাগ' : 'Units / Depts'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{units.length} / {departments.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Users by Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'bn' ? 'স্ট্যাটাস অনুযায়ী ইউজার' : 'Users by Status'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supportUsers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: language === 'bn' ? 'সক্রিয়' : 'Active', value: supportUsers.filter(u => u.is_active).length, fill: 'hsl(var(--chart-1))' },
                          { name: language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive', value: supportUsers.filter(u => !u.is_active).length, fill: 'hsl(var(--chart-2))' },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    {language === 'bn' ? 'কোন ডেটা নেই' : 'No data'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Users by Unit Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'bn' ? 'ইউনিট অনুযায়ী ইউজার' : 'Users by Unit'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {units.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart 
                      data={units.map(unit => {
                        const depts = getDepartmentsByUnit(unit.id);
                        const userCount = depts.reduce((sum, dept) => sum + getUsersByDepartment(dept.id).length, 0);
                        return { name: unit.name.length > 10 ? unit.name.substring(0, 10) + '...' : unit.name, users: userCount };
                      })}
                      layout="vertical"
                    >
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="users" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    {language === 'bn' ? 'কোন ডেটা নেই' : 'No data'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Users by Department */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {language === 'bn' ? 'বিভাগ অনুযায়ী ইউজার' : 'Users by Department'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {departments.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={departments.map(dept => {
                        const unit = units.find(u => u.id === dept.unit_id);
                        return { 
                          name: dept.name.length > 15 ? dept.name.substring(0, 15) + '...' : dept.name, 
                          users: getUsersByDepartment(dept.id).length,
                          unit: unit?.name || ''
                        };
                      }).sort((a, b) => b.users - a.users).slice(0, 10)}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-md p-2 shadow-md text-xs">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-muted-foreground">{data.unit}</p>
                              <p>{language === 'bn' ? 'ইউজার' : 'Users'}: {data.users}</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Bar dataKey="users" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    {language === 'bn' ? 'কোন ডেটা নেই' : 'No data'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-5 w-5" />
                {language === 'bn' ? 'সাম্প্রতিক কার্যকলাপ' : 'Recent Activity'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {activityLogs.map(log => {
                    const actionColors: Record<string, string> = {
                      create: 'bg-green-500/20 text-green-600',
                      update: 'bg-blue-500/20 text-blue-600',
                      delete: 'bg-red-500/20 text-red-600',
                    };
                    const actionLabels: Record<string, string> = {
                      create: language === 'bn' ? 'তৈরি' : 'Created',
                      update: language === 'bn' ? 'আপডেট' : 'Updated',
                      delete: language === 'bn' ? 'মুছে ফেলা' : 'Deleted',
                    };
                    const entityLabels: Record<string, string> = {
                      support_unit: language === 'bn' ? 'ইউনিট' : 'Unit',
                      support_department: language === 'bn' ? 'বিভাগ' : 'Department',
                      support_user: language === 'bn' ? 'ইউজার' : 'User',
                    };
                    
                    const newData = log.new_data as Record<string, unknown> | null;
                    const oldData = log.old_data as Record<string, unknown> | null;
                    const entityName = newData?.name || oldData?.name || 'Unknown';
                    
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${actionColors[log.action] || 'bg-muted'}`}>
                          {actionLabels[log.action] || log.action}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {entityLabels[log.entity_type] || log.entity_type}
                            </Badge>
                            <span className="font-medium truncate">{entityName as string}</span>
                          </div>
                          {log.action === 'update' && newData && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {Object.entries(newData)
                                .filter(([key]) => key !== 'name' && key !== 'department_name')
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  {language === 'bn' ? 'কোন কার্যকলাপ নেই' : 'No activity yet'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unit Dialog */}
      <Dialog open={unitDialog.open} onOpenChange={(open) => setUnitDialog({ ...unitDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {unitDialog.editing 
                ? (language === 'bn' ? 'ইউনিট সম্পাদনা' : 'Edit Unit')
                : (language === 'bn' ? 'নতুন ইউনিট' : 'Add Unit')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
              <Input
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                placeholder={language === 'bn' ? 'ইউনিটের নাম' : 'Unit name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
              <Textarea
                value={unitForm.description}
                onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                placeholder={language === 'bn' ? 'ঐচ্ছিক বিবরণ' : 'Optional description'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnitDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveUnit}>
              {unitDialog.editing ? (language === 'bn' ? 'সংরক্ষণ' : 'Save') : (language === 'bn' ? 'যোগ করুন' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={deptDialog.open} onOpenChange={(open) => setDeptDialog({ ...deptDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deptDialog.editing 
                ? (language === 'bn' ? 'বিভাগ সম্পাদনা' : 'Edit Department')
                : (language === 'bn' ? 'নতুন বিভাগ' : 'Add Department')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'ইউনিট' : 'Unit'}</Label>
              <Select value={deptForm.unit_id} onValueChange={(v) => setDeptForm({ ...deptForm, unit_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'bn' ? 'ইউনিট নির্বাচন করুন' : 'Select unit'} />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder={language === 'bn' ? 'বিভাগের নাম' : 'Department name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
              <Textarea
                value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                placeholder={language === 'bn' ? 'ঐচ্ছিক বিবরণ' : 'Optional description'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeptDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveDept}>
              {deptDialog.editing ? (language === 'bn' ? 'সংরক্ষণ' : 'Save') : (language === 'bn' ? 'যোগ করুন' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support User Dialog */}
      <Dialog open={userDialog.open} onOpenChange={(open) => setUserDialog({ ...userDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {userDialog.editing 
                ? (language === 'bn' ? 'ইউজার সম্পাদনা' : 'Edit User')
                : (language === 'bn' ? 'নতুন ইউজার' : 'Add User')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'বিভাগ' : 'Department'}</Label>
                <Select value={userForm.department_id} onValueChange={(v) => setUserForm({ ...userForm, department_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'bn' ? 'বিভাগ নির্বাচন করুন' : 'Select department'} />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unit => (
                      <div key={unit.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {unit.name}
                        </div>
                        {getDepartmentsByUnit(unit.id).map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'নাম' : 'Name'} *</Label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder={language === 'bn' ? 'ইউজারের নাম' : 'User name'}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'পদবী' : 'Designation'}</Label>
                <Input
                  value={userForm.designation}
                  onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                  placeholder={language === 'bn' ? 'পদবী' : 'Designation'}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'ইমেইল' : 'Email'}</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'ফোন' : 'Phone'}</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+880..."
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'আইপি অ্যাড্রেস' : 'IP Address'}</Label>
                <Input
                  value={userForm.ip_address}
                  onChange={(e) => setUserForm({ ...userForm, ip_address: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'ডিভাইস তথ্য' : 'Device Info'}</Label>
                <Input
                  value={userForm.device_info}
                  onChange={(e) => setUserForm({ ...userForm, device_info: e.target.value })}
                  placeholder={language === 'bn' ? 'কম্পিউটার/ল্যাপটপ মডেল' : 'Computer/Laptop model'}
                />
              </div>

              {/* Credentials Section */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {language === 'bn' ? 'ক্রেডেনশিয়াল তথ্য' : 'Credentials'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'এক্সটেনশন নম্বর' : 'Extension Number'}</Label>
                <Input
                  value={userForm.extension_number}
                  onChange={(e) => setUserForm({ ...userForm, extension_number: e.target.value })}
                  placeholder="1234"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'এক্সটেনশন পাসওয়ার্ড' : 'Extension Password'}</Label>
                <PasswordField
                  value={userForm.extension_password}
                  onChange={(val) => setUserForm({ ...userForm, extension_password: val })}
                  language={language}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'মেইল পাসওয়ার্ড' : 'Mail Password'}</Label>
                <PasswordField
                  value={userForm.mail_password}
                  onChange={(val) => setUserForm({ ...userForm, mail_password: val })}
                  language={language}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'NAS ইউজারনেম' : 'NAS Username'}</Label>
                <Input
                  value={userForm.nas_username}
                  onChange={(e) => setUserForm({ ...userForm, nas_username: e.target.value })}
                  placeholder="nas_user"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'NAS পাসওয়ার্ড' : 'NAS Password'}</Label>
                <PasswordField
                  value={userForm.nas_password}
                  onChange={(val) => setUserForm({ ...userForm, nas_password: val })}
                  language={language}
                />
              </div>

              {/* Inventory Device Assignment Section */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <UserDeviceAssignment
                  devices={inventoryDevices}
                  categories={deviceCategories}
                  selectedDeviceIds={selectedInventoryDeviceIds}
                  onChange={setSelectedInventoryDeviceIds}
                />
              </div>

              {/* Manual Device Assignment Section */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {language === 'bn' ? 'ম্যানুয়াল ডিভাইস এন্ট্রি' : 'Manual Device Entry'}
                </p>
                <DeviceManagement
                  devices={userDevices}
                  onChange={setUserDevices}
                  language={language}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'নোট' : 'Notes'}</Label>
                <Textarea
                  value={userForm.notes}
                  onChange={(e) => setUserForm({ ...userForm, notes: e.target.value })}
                  placeholder={language === 'bn' ? 'অতিরিক্ত নোট' : 'Additional notes'}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3 col-span-2">
                <Switch
                  checked={userForm.is_active}
                  onCheckedChange={(c) => setUserForm({ ...userForm, is_active: c })}
                />
                <Label>{language === 'bn' ? 'সক্রিয়' : 'Active'}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUserDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveUser}>
              {userDialog.editing ? (language === 'bn' ? 'সংরক্ষণ' : 'Save') : (language === 'bn' ? 'যোগ করুন' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === 'bn' ? 'ইউজার ইম্পোর্ট' : 'Import Users'}</DialogTitle>
            <DialogDescription>
              {language === 'bn' 
                ? 'CSV ফাইল থেকে সাপোর্ট ইউজার ইম্পোর্ট করুন' 
                : 'Import support users from CSV file'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {importErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                <p className="font-medium text-destructive text-sm mb-2">
                  {language === 'bn' ? 'সমস্যা পাওয়া গেছে:' : 'Issues found:'}
                </p>
                <ul className="text-xs text-destructive space-y-1 max-h-24 overflow-y-auto">
                  {importErrors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                  {importErrors.length > 10 && (
                    <li>...and {importErrors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            {importData.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' 
                    ? `${importData.length} জন ইউজার ইম্পোর্ট করতে প্রস্তুত` 
                    : `${importData.length} users ready to import`}
                </p>
                <div className="border rounded-md max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">{language === 'bn' ? 'নাম' : 'Name'}</th>
                        <th className="text-left p-2">{language === 'bn' ? 'ইমেইল' : 'Email'}</th>
                        <th className="text-left p-2">{language === 'bn' ? 'বিভাগ' : 'Department'}</th>
                        <th className="text-left p-2">{language === 'bn' ? 'পদবী' : 'Designation'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.email || '-'}</td>
                          <td className="p-2">{row.department}</td>
                          <td className="p-2">{row.designation || '-'}</td>
                        </tr>
                      ))}
                      {importData.length > 20 && (
                        <tr className="border-t">
                          <td colSpan={4} className="p-2 text-center text-muted-foreground">
                            ...and {importData.length - 20} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button variant="link" size="sm" className="h-auto p-0" onClick={downloadTemplate}>
                <Download className="h-3 w-3 mr-1" />
                {language === 'bn' ? 'টেমপ্লেট ডাউনলোড' : 'Download template'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setImportDialog(false);
              setImportData([]);
              setImportErrors([]);
            }}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleImport} disabled={importData.length === 0 || importing}>
              {importing 
                ? (language === 'bn' ? 'ইম্পোর্ট হচ্ছে...' : 'Importing...') 
                : (language === 'bn' ? 'ইম্পোর্ট করুন' : 'Import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog open={taskDetailsDialog.open} onOpenChange={(open) => {
        if (!open) {
          setTaskDetailsDialog({ open: false, user: null });
          setUserTasks([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              {language === 'bn' ? 'টাস্ক তালিকা' : 'Tasks for'} {taskDetailsDialog.user?.name}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const dept = departments.find(d => d.id === taskDetailsDialog.user?.department_id);
                const unit = dept ? units.find(u => u.id === dept.unit_id) : null;
                return `${unit?.name || ''} → ${dept?.name || ''}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Create Task Form */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {language === 'bn' ? 'নতুন টাস্ক তৈরি করুন' : 'Create New Task'}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={language === 'bn' ? 'টাস্কের শিরোনাম...' : 'Task title...'}
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm(f => ({ ...f, title: e.target.value }))}
                className="flex-1 bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && taskDetailsDialog.user) {
                    e.preventDefault();
                    createTaskForUser(taskDetailsDialog.user.id);
                  }
                }}
              />
              <Select value={newTaskForm.priority} onValueChange={(v) => setNewTaskForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{language === 'bn' ? 'নিম্ন' : 'Low'}</SelectItem>
                  <SelectItem value="medium">{language === 'bn' ? 'মাঝারি' : 'Medium'}</SelectItem>
                  <SelectItem value="high">{language === 'bn' ? 'উচ্চ' : 'High'}</SelectItem>
                  <SelectItem value="urgent">{language === 'bn' ? 'জরুরি' : 'Urgent'}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!newTaskForm.title.trim() || creatingTask}
                onClick={() => taskDetailsDialog.user && createTaskForUser(taskDetailsDialog.user.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="max-h-[40vh]">
            {loadingTasks ? (
              <div className="py-8 text-center text-muted-foreground">
                {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading tasks...'}
              </div>
            ) : userTasks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {language === 'bn' ? 'এই ব্যবহারকারীর জন্য কোন টাস্ক নেই' : 'No tasks assigned to this user'}
              </div>
            ) : (
              <div className="space-y-3">
                {userTasks.map((task) => {
                  const priorityColors: Record<string, string> = {
                    urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
                    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                    low: 'bg-green-500/20 text-green-400 border-green-500/30',
                  };
                  const statusColors: Record<string, string> = {
                    todo: 'bg-slate-500/20 text-slate-400',
                    'in-progress': 'bg-blue-500/20 text-blue-400',
                    completed: 'bg-green-500/20 text-green-400',
                  };

                  return (
                    <Card key={task.id} className="bg-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {task.priority && (
                                <Badge className={`text-xs ${priorityColors[task.priority] || ''}`}>
                                  {task.priority}
                                </Badge>
                              )}
                              {task.status && (
                                <Badge variant="outline" className={`text-xs ${statusColors[task.status] || ''}`}>
                                  {task.status}
                                </Badge>
                              )}
                              {task.needs_follow_up && (
                                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500 flex items-center gap-1">
                                  <Flag className="h-3 w-3" />
                                  {task.follow_up_date ? format(new Date(task.follow_up_date), 'dd MMM') : 'Follow-up'}
                                </Badge>
                              )}
                              {task.due_date && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(task.due_date), 'dd MMM yyyy')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(task.created_at), 'dd MMM yyyy')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {language === 'bn' ? 'মোট' : 'Total'}: {userTasks.length} {language === 'bn' ? 'টাস্ক' : 'tasks'}
              {userTasks.length > 0 && (
                <>
                  {' • '}
                  {userTasks.filter(t => t.status === 'completed').length} {language === 'bn' ? 'সম্পন্ন' : 'completed'}
                  {userTasks.filter(t => t.needs_follow_up).length > 0 && (
                    <>
                      {' • '}
                      <span className="text-amber-500">{userTasks.filter(t => t.needs_follow_up).length} follow-up</span>
                    </>
                  )}
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => {
              setTaskDetailsDialog({ open: false, user: null });
              setUserTasks([]);
            }}>
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
