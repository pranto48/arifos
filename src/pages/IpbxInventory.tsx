import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Search, ExternalLink, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PasswordField } from '@/components/support/PasswordField';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDeviceInventory } from '@/hooks/useDeviceInventory';
import { useSupportData } from '@/hooks/useSupportData';

const IPBX_CATEGORY_MATCHER = /(ipbx|ip pbx|pbx|ip phone|voip|sip phone|pabx|phone)/i;

export default function IpbxInventory() {
  const { language } = useLanguage();
  const { devices, categories, updateDevice, addDevice, deleteDevice, addCategory, loading } = useDeviceInventory();
  const { supportUsers } = useSupportData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    device_name: '',
    device_number: '',
    ipbx_model: '',
    ipbx_extension_number: '',
    ip_phone_ip_address: '',
    ipbx_user_id: '',
    ipbx_password: '',
    support_user_id: 'none',
  });

  const ipbxCategoryIds = useMemo(
    () => new Set(categories.filter(c => IPBX_CATEGORY_MATCHER.test(c.name)).map(c => c.id)),
    [categories]
  );

  const ipbxDevices = useMemo(() => {
    return devices.filter((device) => {
      const specs = (device.custom_specs || {}) as Record<string, string>;
      return ipbxCategoryIds.has(device.category_id || '') || !!specs.ipbx_extension_number;
    });
  }, [devices, ipbxCategoryIds]);

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ipbxDevices;
    return ipbxDevices.filter((device) => {
      const specs = (device.custom_specs || {}) as Record<string, string>;
      const userName = supportUsers.find(u => u.id === device.support_user_id)?.name || '';
      const haystack = [
        device.device_name,
        device.device_number || '',
        specs.ipbx_model || '',
        specs.ipbx_extension_number || '',
        specs.ip_phone_ip_address || '',
        specs.ipbx_user_id || '',
        userName,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [ipbxDevices, search, supportUsers]);

  const handleAssign = async (deviceId: string, supportUserId: string) => {
    const success = await updateDevice(deviceId, {
      support_user_id: supportUserId === 'none' ? null : supportUserId,
      status: supportUserId === 'none' ? 'available' : 'assigned',
    });
    if (success) {
      toast.success(language === 'bn' ? 'IPBX ডিভাইস অ্যাসাইন আপডেট হয়েছে' : 'IPBX assignment updated');
    } else {
      toast.error(language === 'bn' ? 'অ্যাসাইনমেন্ট আপডেট ব্যর্থ' : 'Failed to update assignment');
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({
      device_name: '',
      device_number: '',
      ipbx_model: '',
      ipbx_extension_number: '',
      ip_phone_ip_address: '',
      ipbx_user_id: '',
      ipbx_password: '',
      support_user_id: 'none',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (device: typeof ipbxDevices[number]) => {
    const specs = (device.custom_specs || {}) as Record<string, string>;
    setEditingId(device.id);
    setForm({
      device_name: device.device_name || '',
      device_number: device.device_number || '',
      ipbx_model: specs.ipbx_model || '',
      ipbx_extension_number: specs.ipbx_extension_number || '',
      ip_phone_ip_address: specs.ip_phone_ip_address || '',
      ipbx_user_id: specs.ipbx_user_id || '',
      ipbx_password: specs.ipbx_password || '',
      support_user_id: device.support_user_id || 'none',
    });
    setDialogOpen(true);
  };

  const ensureIpbxCategory = async () => {
    const existing = categories.find(c => c.name.toLowerCase() === 'ipbx');
    if (existing) return existing.id;
    const created = await addCategory('IPBX', 'IPBX systems and IP phones');
    return created?.id || null;
  };

  const handleSave = async () => {
    if (!form.device_name.trim() || !form.ipbx_extension_number.trim()) {
      toast.error(language === 'bn' ? 'ডিভাইস নাম ও এক্সটেনশন নম্বর আবশ্যক' : 'Device name and extension number are required');
      return;
    }

    const categoryId = await ensureIpbxCategory();
    if (!categoryId) {
      toast.error(language === 'bn' ? 'IPBX ক্যাটাগরি তৈরি ব্যর্থ' : 'Failed to create/find IPBX category');
      return;
    }

    const payload = {
      device_name: form.device_name.trim(),
      device_number: form.device_number.trim() || null,
      category_id: categoryId,
      support_user_id: form.support_user_id === 'none' ? null : form.support_user_id,
      status: form.support_user_id === 'none' ? 'available' : 'assigned',
      custom_specs: {
        ipbx_model: form.ipbx_model.trim(),
        ipbx_extension_number: form.ipbx_extension_number.trim(),
        ip_phone_ip_address: form.ip_phone_ip_address.trim(),
        ipbx_user_id: form.ipbx_user_id.trim(),
        ipbx_password: form.ipbx_password,
      },
    };

    if (editingId) {
      const ok = await updateDevice(editingId, payload as any);
      if (ok) {
        toast.success(language === 'bn' ? 'IPBX ডিভাইস আপডেট হয়েছে' : 'IPBX device updated');
        setDialogOpen(false);
      }
      return;
    }

    const created = await addDevice(payload as any);
    if (created) {
      toast.success(language === 'bn' ? 'IPBX ডিভাইস তৈরি হয়েছে' : 'IPBX device created');
      setDialogOpen(false);
    } else {
      toast.error(language === 'bn' ? 'তৈরি ব্যর্থ' : 'Failed to create device');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'bn' ? 'এই IPBX ডিভাইস মুছবেন?' : 'Delete this IPBX device?')) return;
    const ok = await deleteDevice(id);
    if (ok) toast.success(language === 'bn' ? 'ডিভাইস মুছে ফেলা হয়েছে' : 'Device deleted');
    else toast.error(language === 'bn' ? 'মুছতে ব্যর্থ' : 'Failed to delete');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            {language === 'bn' ? 'IPBX / IP ফোন' : 'IPBX / IP Phones'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'bn'
              ? 'IPBX নম্বর, মডেল এবং সাপোর্ট ইউজার অ্যাসাইনমেন্ট ম্যানেজ করুন'
              : 'Manage IPBX number, model, and support-user assignments.'}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/support-users">
            <ExternalLink className="h-4 w-4 mr-1" />
            {language === 'bn' ? 'Support Users খুলুন' : 'Open Support Users'}
          </Link>
        </Button>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          {language === 'bn' ? 'IPBX যোগ করুন' : 'Add IPBX'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {language === 'bn' ? 'IPBX ডিভাইস তালিকা' : 'IPBX Device List'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'IPBX নম্বর/মডেল/ইউজার খুঁজুন' : 'Search extension/model/user'}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'bn' ? 'ডিভাইস' : 'Device'}</TableHead>
                  <TableHead>{language === 'bn' ? 'মডেল' : 'Model'}</TableHead>
                  <TableHead>{language === 'bn' ? 'এক্সটেনশন' : 'Extension'}</TableHead>
                  <TableHead>{language === 'bn' ? 'IP ঠিকানা' : 'Device IP'}</TableHead>
                  <TableHead>{language === 'bn' ? 'User ID' : 'User ID'}</TableHead>
                  <TableHead>{language === 'bn' ? 'অ্যাসাইনড ইউজার' : 'Assigned User'}</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredDevices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {language === 'bn' ? 'কোন IPBX ডিভাইস পাওয়া যায়নি' : 'No IPBX devices found'}
                    </TableCell>
                  </TableRow>
                )}
                {filteredDevices.map((device) => {
                  const specs = (device.custom_specs || {}) as Record<string, string>;
                  return (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="font-medium">{device.device_name}</div>
                        {device.device_number && (
                          <div className="text-xs text-muted-foreground">#{device.device_number}</div>
                        )}
                      </TableCell>
                      <TableCell>{specs.ipbx_model || '-'}</TableCell>
                      <TableCell>
                        {specs.ipbx_extension_number ? (
                          <Badge variant="secondary">{specs.ipbx_extension_number}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{specs.ip_phone_ip_address || '-'}</TableCell>
                      <TableCell>{specs.ipbx_user_id || '-'}</TableCell>
                      <TableCell className="min-w-[220px]">
                        <Select
                          value={device.support_user_id || 'none'}
                          onValueChange={(value) => handleAssign(device.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'bn' ? 'ইউজার নির্বাচন করুন' : 'Assign user'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{language === 'bn' ? 'কেউ না' : 'Unassigned'}</SelectItem>
                            {supportUsers
                              .filter(u => u.is_active)
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                  {user.extension_number ? ` (${user.extension_number})` : ''}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(device)} className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(device.id)} className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? (language === 'bn' ? 'IPBX সম্পাদনা' : 'Edit IPBX') : (language === 'bn' ? 'নতুন IPBX' : 'New IPBX')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{language === 'bn' ? 'ডিভাইস নাম' : 'Device Name'} *</Label>
              <Input value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{language === 'bn' ? 'ডিভাইস নম্বর' : 'Device Number'}</Label>
              <Input value={form.device_number} onChange={(e) => setForm({ ...form, device_number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{language === 'bn' ? 'IPBX মডেল' : 'IPBX Model'}</Label>
              <Input value={form.ipbx_model} onChange={(e) => setForm({ ...form, ipbx_model: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{language === 'bn' ? 'এক্সটেনশন নম্বর' : 'Extension Number'} *</Label>
              <Input value={form.ipbx_extension_number} onChange={(e) => setForm({ ...form, ipbx_extension_number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{language === 'bn' ? 'IP ফোন IP ঠিকানা' : 'IP Phone Device IP'}</Label>
              <Input value={form.ip_phone_ip_address} onChange={(e) => setForm({ ...form, ip_phone_ip_address: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{language === 'bn' ? 'IPBX User ID' : 'IPBX User ID'}</Label>
              <Input value={form.ipbx_user_id} onChange={(e) => setForm({ ...form, ipbx_user_id: e.target.value })} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{language === 'bn' ? 'IPBX পাসওয়ার্ড' : 'IPBX Password'}</Label>
              <PasswordField value={form.ipbx_password} onChange={(val) => setForm({ ...form, ipbx_password: val })} language={language as 'en' | 'bn'} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{language === 'bn' ? 'অ্যাসাইনড ইউজার' : 'Assigned User'}</Label>
              <Select value={form.support_user_id} onValueChange={(v) => setForm({ ...form, support_user_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'bn' ? 'কেউ না' : 'Unassigned'}</SelectItem>
                  {supportUsers.filter(u => u.is_active).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{language === 'bn' ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={handleSave}>{language === 'bn' ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
