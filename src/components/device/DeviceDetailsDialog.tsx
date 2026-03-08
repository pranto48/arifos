import { useState, useEffect } from 'react';
import { 
  HardDrive, Calendar, DollarSign, User, Tag, 
  Package, FileText, AlertTriangle, CheckCircle, Clock,
  Wrench, ArrowRightLeft, Building2, Users, Wifi, Server, Printer, Zap, Camera, Network, Settings
} from 'lucide-react';
import { getDeviceType, getFieldsForType, getTypeLabel } from './deviceTypeConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { DeviceInventory, DeviceServiceHistory, DeviceCategory } from '@/hooks/useDeviceInventory';

interface DeviceTransferHistory {
  id: string;
  device_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  transfer_date: string;
  notes: string | null;
  transferred_by: string | null;
  created_at: string;
}

interface SupportUserInfo {
  id: string;
  name: string;
  department_name: string;
  unit_name: string;
}

interface DeviceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: DeviceInventory | null;
  category?: DeviceCategory | null;
  supportUserMap: Record<string, SupportUserInfo>;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', labelBn: 'উপলব্ধ', color: 'bg-green-500/20 text-green-600' },
  { value: 'assigned', label: 'Assigned', labelBn: 'বরাদ্দকৃত', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'maintenance', label: 'In Maintenance', labelBn: 'রক্ষণাবেক্ষণে', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 'retired', label: 'Retired', labelBn: 'অবসরপ্রাপ্ত', color: 'bg-gray-500/20 text-gray-600' },
  { value: 'disposed', label: 'Disposed', labelBn: 'বাতিল', color: 'bg-red-500/20 text-red-600' },
];

const SERVICE_TYPES: Record<string, { label: string; labelBn: string }> = {
  repair: { label: 'Repair', labelBn: 'মেরামত' },
  maintenance: { label: 'Maintenance', labelBn: 'রক্ষণাবেক্ষণ' },
  upgrade: { label: 'Upgrade', labelBn: 'আপগ্রেড' },
  cleaning: { label: 'Cleaning', labelBn: 'পরিষ্কার' },
  replacement: { label: 'Part Replacement', labelBn: 'যন্ত্রাংশ প্রতিস্থাপন' },
  other: { label: 'Other', labelBn: 'অন্যান্য' },
};

export function DeviceDetailsDialog({ 
  open, 
  onOpenChange, 
  device, 
  category,
  supportUserMap 
}: DeviceDetailsDialogProps) {
  const { language } = useLanguage();
  const [serviceHistory, setServiceHistory] = useState<DeviceServiceHistory[]>([]);
  const [transferHistory, setTransferHistory] = useState<DeviceTransferHistory[]>([]);
  const [loadingService, setLoadingService] = useState(false);
  const [loadingTransfer, setLoadingTransfer] = useState(false);

  useEffect(() => {
    if (open && device) {
      loadServiceHistory();
      loadTransferHistory();
    }
  }, [open, device?.id]);

  const loadServiceHistory = async () => {
    if (!device) return;
    setLoadingService(true);
    const { data } = await supabase
      .from('device_service_history')
      .select('*')
      .eq('device_id', device.id)
      .order('service_date', { ascending: false });
    if (data) {
      setServiceHistory(data as DeviceServiceHistory[]);
    }
    setLoadingService(false);
  };

  const loadTransferHistory = async () => {
    if (!device) return;
    setLoadingTransfer(true);
    const { data } = await supabase
      .from('device_transfer_history')
      .select('*')
      .eq('device_id', device.id)
      .order('transfer_date', { ascending: false });
    if (data) {
      setTransferHistory(data as DeviceTransferHistory[]);
    }
    setLoadingTransfer(false);
  };

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

  if (!device) return null;

  const status = STATUS_OPTIONS.find(s => s.value === device.status);
  const warranty = getWarrantyStatus(device.warranty_date);
  const currentUser = device.support_user_id ? supportUserMap[device.support_user_id] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {device.device_name}
            {device.device_number && (
              <span className="text-muted-foreground text-sm font-normal">#{device.device_number}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {language === 'bn' ? 'বিবরণ' : 'Details'}
            </TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs">
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
              {language === 'bn' ? 'স্থানান্তর ইতিহাস' : 'Transfer History'}
              {transferHistory.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {transferHistory.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="service" className="text-xs">
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              {language === 'bn' ? 'সার্ভিস ইতিহাস' : 'Service History'}
              {serviceHistory.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {serviceHistory.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Details Tab */}
            <TabsContent value="details" className="m-0 space-y-4">
              {/* Current Status & Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {language === 'bn' ? 'স্ট্যাটাস ও বরাদ্দ' : 'Status & Assignment'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</span>
                      <Badge className={status?.color}>{language === 'bn' ? status?.labelBn : status?.label}</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</span>
                      <Badge variant="outline">{category?.name || '-'}</Badge>
                    </div>
                    <Separator />
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">{language === 'bn' ? 'বর্তমান বরাদ্দ' : 'Current Assignment'}</span>
                      {currentUser ? (
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{currentUser.name}</div>
                            <div className="text-xs text-muted-foreground">{currentUser.department_name} • {currentUser.unit_name}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
                          {language === 'bn' ? 'কাউকে বরাদ্দ করা হয়নি' : 'Not assigned to anyone'}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {language === 'bn' ? 'সনাক্তকরণ' : 'Identification'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'bn' ? 'সিরিয়াল নম্বর' : 'Serial Number'}</span>
                      <span className="font-mono">{device.serial_number || '-'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'bn' ? 'রিকুইজিশন নং' : 'Requisition No.'}</span>
                      <span>{device.requisition_number || '-'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'bn' ? 'BOD নং' : 'BOD No.'}</span>
                      <span>{device.bod_number || '-'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Purchase & Warranty Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {language === 'bn' ? 'ক্রয় তথ্য' : 'Purchase Info'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'bn' ? 'মূল্য' : 'Price'}</span>
                      <span className="font-semibold">{device.price ? `৳${device.price.toLocaleString()}` : '-'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'bn' ? 'সরবরাহকারী' : 'Supplier'}</span>
                      <span>{device.supplier_name || '-'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'bn' ? 'ক্রয় তারিখ' : 'Purchase Date'}</span>
                      <span>{device.purchase_date ? format(new Date(device.purchase_date), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'bn' ? 'ডেলিভারি তারিখ' : 'Delivery Date'}</span>
                      <span>{device.delivery_date ? format(new Date(device.delivery_date), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {language === 'bn' ? 'ওয়ারেন্টি তথ্য' : 'Warranty Info'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{language === 'bn' ? 'ওয়ারেন্টি শেষ' : 'Warranty Expires'}</span>
                      <span>{device.warranty_date ? format(new Date(device.warranty_date), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                    {warranty && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{language === 'bn' ? 'অবস্থা' : 'Status'}</span>
                          <Badge className={warranty.color}>{warranty.label}</Badge>
                        </div>
                      </>
                    )}
                    {device.bill_details && (
                      <>
                        <Separator />
                        <div>
                          <span className="text-muted-foreground block mb-1">{language === 'bn' ? 'বিল বিবরণ' : 'Bill Details'}</span>
                          <p className="text-xs bg-muted/50 p-2 rounded-md">{device.bill_details}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Device-Type-Specific Info */}
              {(() => {
                const deviceType = getDeviceType(category?.name || null);
                const typeFields = getFieldsForType(deviceType);
                const customSpecs = (device.custom_specs || {}) as Record<string, string>;
                const hasTypeData = typeFields.some(f => customSpecs[f.key]);
                const TYPE_ICON_MAP: Record<string, React.ElementType> = {
                  router: Wifi, server: Server, printer: Printer, ups: Zap, cctv: Camera, network_equipment: Network, generic: Settings,
                };
                const TypeIcon = TYPE_ICON_MAP[deviceType] || Settings;

                if (deviceType !== 'computer' && deviceType !== 'generic' && hasTypeData) {
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          {getTypeLabel(deviceType, language)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {typeFields.map((field) => {
                          const val = customSpecs[field.key];
                          if (!val) return null;
                          return (
                            <div key={field.key}>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {language === 'bn' ? field.labelBn : field.labelEn}
                                </span>
                                <span className={field.isPassword ? 'font-mono text-xs' : ''}>
                                  {field.isPassword ? '••••••••' : val}
                                </span>
                              </div>
                              <Separator className="mt-2" />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                }

                // Show non-type custom specs for any device
                const nonTypeKeys = Object.entries(customSpecs).filter(
                  ([key, val]) => val && !typeFields.some(f => f.key === key)
                );
                if (nonTypeKeys.length > 0) {
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          {language === 'bn' ? 'অতিরিক্ত তথ্য' : 'Additional Info'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {nonTypeKeys.map(([key, val]) => (
                          <div key={key}>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{key}</span>
                              <span>{val}</span>
                            </div>
                            <Separator className="mt-2" />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                }

                return null;
              })()}

              {/* Notes */}
              {device.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {language === 'bn' ? 'নোট' : 'Notes'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{device.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Transfer History Tab */}
            <TabsContent value="transfers" className="m-0">
              {loadingTransfer ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
                </div>
              ) : transferHistory.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'bn' ? 'কোন স্থানান্তর ইতিহাস নেই' : 'No transfer history yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'bn' ? 'ডিভাইস বরাদ্দ করলে এখানে দেখা যাবে' : 'Transfer records will appear here when device is assigned'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transferHistory.map((transfer, index) => {
                    const fromUser = transfer.from_user_id ? supportUserMap[transfer.from_user_id] : null;
                    const toUser = transfer.to_user_id ? supportUserMap[transfer.to_user_id] : null;

                    return (
                      <Card key={transfer.id} className={index === 0 ? 'border-primary/30' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                index === 0 ? 'bg-primary/10 text-primary' : 'bg-muted'
                              }`}>
                                <ArrowRightLeft className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium">
                                  {format(new Date(transfer.transfer_date), 'dd MMM yyyy, hh:mm a')}
                                </span>
                                {index === 0 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {language === 'bn' ? 'সর্বশেষ' : 'Latest'}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                {fromUser ? (
                                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                                    <User className="h-3 w-3" />
                                    <span>{fromUser.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded text-green-600">
                                    <Package className="h-3 w-3" />
                                    <span>{language === 'bn' ? 'ইনভেন্টরি' : 'Inventory'}</span>
                                  </div>
                                )}
                                
                                <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                
                                {toUser ? (
                                  <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded text-blue-600">
                                    <User className="h-3 w-3" />
                                    <span>{toUser.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded text-green-600">
                                    <Package className="h-3 w-3" />
                                    <span>{language === 'bn' ? 'ইনভেন্টরি' : 'Inventory'}</span>
                                  </div>
                                )}
                              </div>

                              {toUser && (
                                <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {toUser.department_name} • {toUser.unit_name}
                                </div>
                              )}

                              {transfer.notes && (
                                <p className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                  {transfer.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Service History Tab */}
            <TabsContent value="service" className="m-0">
              {loadingService ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
                </div>
              ) : serviceHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'bn' ? 'কোন সার্ভিস রেকর্ড নেই' : 'No service records yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceHistory.map((record, index) => {
                    const serviceType = SERVICE_TYPES[record.service_type] || SERVICE_TYPES.other;

                    return (
                      <Card key={record.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Wrench className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {language === 'bn' ? serviceType.labelBn : serviceType.label}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(record.service_date), 'dd MMM yyyy')}
                                  </span>
                                </div>
                                {record.cost && (
                                  <Badge variant="secondary" className="text-xs">
                                    ৳{record.cost.toLocaleString()}
                                  </Badge>
                                )}
                              </div>
                              
                              {record.description && (
                                <p className="mt-2 text-sm text-muted-foreground">{record.description}</p>
                              )}

                              {record.technician_name && (
                                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {language === 'bn' ? 'টেকনিশিয়ান:' : 'Technician:'} {record.technician_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
