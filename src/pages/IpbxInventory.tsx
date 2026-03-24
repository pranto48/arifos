import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Search, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDeviceInventory } from '@/hooks/useDeviceInventory';
import { useSupportData } from '@/hooks/useSupportData';

const IPBX_CATEGORY_MATCHER = /(ipbx|ip pbx|pbx|ip phone|voip|sip phone|pabx|phone)/i;

export default function IpbxInventory() {
  const { language } = useLanguage();
  const { devices, categories, updateDevice, loading } = useDeviceInventory();
  const { supportUsers } = useSupportData();
  const [search, setSearch] = useState('');

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredDevices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
