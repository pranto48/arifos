 import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
 import { motion } from 'framer-motion';
 import { 
   HardDrive, Calendar, DollarSign, User, Tag, 
   Package, FileText, AlertTriangle, CheckCircle, Clock,
  Wrench, ArrowRightLeft, Building2, Users, ArrowLeft, Lock,
  Loader2, AlertCircle, LogIn, Ticket, Wifi, Server, Printer, Zap, Camera, Network, Settings
 } from 'lucide-react';
import { getDeviceType, getFieldsForType, getTypeLabel, type DeviceType as DevType } from '@/components/device/deviceTypeConfig';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Separator } from '@/components/ui/separator';
 import { Button } from '@/components/ui/button';
 import { format, isBefore, addDays } from 'date-fns';
 import { supabase } from '@/integrations/supabase/client';
 import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
 
 const STATUS_OPTIONS = [
   { value: 'available', label: 'Available', labelBn: 'উপলব্ধ', color: 'bg-green-500/20 text-green-600' },
   { value: 'assigned', label: 'Assigned', labelBn: 'বরাদ্দকৃত', color: 'bg-blue-500/20 text-blue-600' },
   { value: 'maintenance', label: 'In Maintenance', labelBn: 'রক্ষণাবেক্ষণে', color: 'bg-yellow-500/20 text-yellow-600' },
   { value: 'retired', label: 'Retired', labelBn: 'অবসরপ্রাপ্ত', color: 'bg-gray-500/20 text-gray-600' },
   { value: 'disposed', label: 'Disposed', labelBn: 'বাতিল', color: 'bg-red-500/20 text-red-600' },
 ];
 
 interface DeviceData {
   id: string;
   device_name: string;
   device_number: string | null;
   serial_number: string | null;
   status: string;
   purchase_date: string | null;
   delivery_date: string | null;
   warranty_date: string | null;
   price: number | null;
   supplier_name: string | null;
   requisition_number: string | null;
   bod_number: string | null;
   bill_details: string | null;
   notes: string | null;
   ram_info: string | null;
   storage_info: string | null;
   processor_info: string | null;
   monitor_info: string | null;
   has_ups: boolean | null;
   ups_info: string | null;
   webcam_info: string | null;
   headset_info: string | null;
   custom_specs: Record<string, string> | any;
   category?: { name: string } | null;
   support_user?: {
     name: string;
     ip_address: string | null;
     department?: {
       name: string;
       unit?: { name: string } | null;
     } | null;
   } | null;
 }
 
 export default function DeviceProfile() {
   const { deviceNumber } = useParams<{ deviceNumber: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
   const { language } = useLanguage();
   const [device, setDevice] = useState<DeviceData | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   useEffect(() => {
    // Wait for auth to finish loading before checking
    if (!authLoading) {
      if (user) {
        loadDevice();
      } else {
        setLoading(false);
      }
    }
  }, [deviceNumber, user, authLoading]);
 
   const loadDevice = async () => {
     if (!deviceNumber) {
       setError(language === 'bn' ? 'ডিভাইস নম্বর প্রয়োজন' : 'Device number is required');
       setLoading(false);
       return;
     }
 
     try {
       setLoading(true);
       setError(null);
 
       // First get the device
       const { data: deviceData, error: deviceError } = await supabase
         .from('device_inventory')
         .select(`
           *,
           category:device_categories(name)
         `)
         .eq('device_number', deviceNumber)
         .maybeSingle();
 
       if (deviceError) throw deviceError;
 
       if (!deviceData) {
         setError(language === 'bn' ? 'ডিভাইস পাওয়া যায়নি' : 'Device not found');
         setLoading(false);
         return;
       }
 
       // If device has a support_user_id, fetch the user details
       if (deviceData.support_user_id) {
         const { data: userData } = await supabase
           .from('support_users')
           .select(`
             name,
             ip_address,
             department:support_departments(
               name,
               unit:support_units(name)
             )
           `)
           .eq('id', deviceData.support_user_id)
           .single();
 
         if (userData) {
           setDevice({
             ...deviceData,
             support_user: userData as any,
           });
         } else {
           setDevice(deviceData);
         }
       } else {
         setDevice(deviceData);
       }
     } catch (err) {
       console.error('Error loading device:', err);
       setError(language === 'bn' ? 'ডিভাইস লোড করতে সমস্যা হয়েছে' : 'Failed to load device');
     } finally {
       setLoading(false);
     }
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
 
  if (loading || authLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="text-center space-y-4"
         >
           <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
           <p className="text-muted-foreground">
             {language === 'bn' ? 'ডিভাইস তথ্য লোড হচ্ছে...' : 'Loading device information...'}
           </p>
         </motion.div>
       </div>
     );
   }
 
  // Not authenticated - show login prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            {language === 'bn' ? 'লগইন প্রয়োজন' : 'Login Required'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'bn' 
              ? 'ডিভাইসের তথ্য দেখতে আপনাকে লগইন করতে হবে।' 
              : 'You need to log in to view device details.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/auth', { state: { returnTo: `/device/${deviceNumber}` } })}>
              <LogIn className="h-4 w-4 mr-2" />
              {language === 'bn' ? 'লগইন করুন' : 'Log In'}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'bn' ? 'হোমে ফিরুন' : 'Back to Home'}
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

   if (error || !device) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background p-4">
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-center space-y-4 max-w-md"
         >
           <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
             <AlertCircle className="h-10 w-10 text-destructive" />
           </div>
           <h1 className="text-2xl font-bold">
             {language === 'bn' ? 'ডিভাইস পাওয়া যায়নি' : 'Device Not Found'}
           </h1>
           <p className="text-muted-foreground">
             {error || (language === 'bn' ? 'এই ডিভাইস নম্বরের কোন তথ্য পাওয়া যায়নি।' : 'No device found with this device number.')}
           </p>
           <Button asChild variant="outline">
             <Link to="/">
               <ArrowLeft className="h-4 w-4 mr-2" />
               {language === 'bn' ? 'হোমে ফিরুন' : 'Back to Home'}
             </Link>
           </Button>
         </motion.div>
       </div>
     );
   }
 
   const status = STATUS_OPTIONS.find(s => s.value === device.status);
   const warranty = getWarrantyStatus(device.warranty_date);
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="max-w-4xl mx-auto space-y-6"
       >
         {/* Header */}
         <div className="text-center space-y-2">
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ type: 'spring', delay: 0.1 }}
             className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
           >
             <HardDrive className="h-10 w-10 text-primary" />
           </motion.div>
           <h1 className="text-3xl font-bold">{device.device_name}</h1>
           {device.device_number && (
             <p className="text-lg text-muted-foreground font-mono">#{device.device_number}</p>
           )}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge className={status?.color}>{language === 'bn' ? status?.labelBn : status?.label}</Badge>
              {device.category?.name && (
                <Badge variant="outline">{device.category.name}</Badge>
              )}
            </div>
            {/* Submit Ticket Button */}
            <div className="pt-4">
              <Button asChild>
                <Link to={`/submit-ticket?device=${device.device_number}`}>
                  <Ticket className="h-4 w-4 mr-2" />
                  {language === 'bn' ? 'সাপোর্ট টিকেট জমা দিন' : 'Submit Support Ticket'}
                </Link>
              </Button>
            </div>
          </div>
 
         {/* Assignment Info */}
         {device.support_user && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.15 }}
           >
             <Card className="border-primary/20 bg-primary/5">
               <CardContent className="p-6">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                     <User className="h-7 w-7 text-primary" />
                   </div>
                   <div className="flex-1">
                     <h3 className="font-semibold text-lg">{device.support_user.name}</h3>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                       {device.support_user.department?.unit?.name && (
                         <span className="flex items-center gap-1">
                           <Building2 className="h-3.5 w-3.5" />
                           {device.support_user.department.unit.name}
                         </span>
                       )}
                       {device.support_user.department?.name && (
                         <span className="flex items-center gap-1">
                           <Users className="h-3.5 w-3.5" />
                           {device.support_user.department.name}
                         </span>
                       )}
                       {device.support_user.ip_address && (
                         <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                           IP: {device.support_user.ip_address}
                         </span>
                       )}
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>
         )}
 
         {/* Details Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Identification */}
           <motion.div
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
           >
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <Package className="h-4 w-4 text-primary" />
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
           </motion.div>
 
           {/* Purchase Info */}
           <motion.div
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.25 }}
           >
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <DollarSign className="h-4 w-4 text-primary" />
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
               </CardContent>
             </Card>
           </motion.div>
 
           {/* Warranty Info */}
           <motion.div
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.3 }}
           >
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <Calendar className="h-4 w-4 text-primary" />
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
               </CardContent>
             </Card>
           </motion.div>
 
           {/* Device-Type-Specific Info */}
           {(() => {
             const deviceType = getDeviceType(device.category?.name || null);
             const typeFields = getFieldsForType(deviceType);
             const customSpecs = (device.custom_specs || {}) as Record<string, string>;
             const hasTypeData = typeFields.some(f => customSpecs[f.key]);
             const TYPE_ICON_MAP: Record<string, React.ElementType> = {
               router: Wifi, server: Server, printer: Printer, ups: Zap, cctv: Camera, network_equipment: Network, generic: Settings,
             };
             const TypeIcon = TYPE_ICON_MAP[deviceType] || Settings;

             if (deviceType !== 'computer' && deviceType !== 'generic' && hasTypeData) {
               return (
                 <motion.div
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.35 }}
                 >
                   <Card>
                     <CardHeader className="pb-2">
                       <CardTitle className="text-sm flex items-center gap-2">
                         <TypeIcon className="h-4 w-4 text-primary" />
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
                             <Separator />
                           </div>
                         );
                       })}
                     </CardContent>
                   </Card>
                 </motion.div>
               );
             }
             return null;
           })()}

           {/* Hardware Specs (for computers) */}
           {(device.ram_info || device.storage_info || device.processor_info || device.monitor_info) && (
             <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.35 }}
             >
               <Card>
                 <CardHeader className="pb-2">
                   <CardTitle className="text-sm flex items-center gap-2">
                     <Wrench className="h-4 w-4 text-primary" />
                     {language === 'bn' ? 'হার্ডওয়্যার স্পেক্স' : 'Hardware Specs'}
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-2 text-sm">
                   {device.ram_info && (
                     <>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">RAM</span>
                         <span>{device.ram_info}</span>
                       </div>
                       <Separator />
                     </>
                   )}
                   {device.storage_info && (
                     <>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">{language === 'bn' ? 'স্টোরেজ' : 'Storage'}</span>
                         <span>{device.storage_info}</span>
                       </div>
                       <Separator />
                     </>
                   )}
                   {device.processor_info && (
                     <>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">{language === 'bn' ? 'প্রসেসর' : 'Processor'}</span>
                         <span>{device.processor_info}</span>
                       </div>
                       <Separator />
                     </>
                   )}
                   {device.monitor_info && (
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">{language === 'bn' ? 'মনিটর' : 'Monitor'}</span>
                       <span>{device.monitor_info}</span>
                     </div>
                   )}
                 </CardContent>
               </Card>
             </motion.div>
           )}
         </div>
 
         {/* Notes */}
         {device.notes && (
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4 }}
           >
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm flex items-center gap-2">
                   <FileText className="h-4 w-4 text-primary" />
                   {language === 'bn' ? 'নোট' : 'Notes'}
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{device.notes}</p>
               </CardContent>
             </Card>
           </motion.div>
         )}
 
         {/* Footer */}
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.5 }}
           className="text-center text-xs text-muted-foreground pt-4"
         >
           <p>{language === 'bn' ? 'ডিভাইস আইডি:' : 'Device ID:'} {device.id}</p>
         </motion.div>
       </motion.div>
     </div>
   );
 }