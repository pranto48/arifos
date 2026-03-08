// Device type detection and field configuration

export type DeviceType = 'computer' | 'router' | 'server' | 'printer' | 'ups' | 'cctv' | 'network_equipment' | 'generic';

const COMPUTER_CATEGORIES = [
  'Desktop', 'Desktop Clone PC', 'Desktop Clone', 'Clone PC',
  'Laptop', 'Notebook', 'Computer', 'PC', 'Workstation', 'All-in-One',
];

const ROUTER_CATEGORIES = [
  'Router', 'Access Point', 'AP', 'Firewall', 'Gateway', 'Modem',
  'WiFi', 'Wireless',
];

const SERVER_CATEGORIES = [
  'Server', 'Rack Server', 'Tower Server', 'Blade Server', 'NAS', 'Storage Server',
];

const PRINTER_CATEGORIES = [
  'Printer', 'Scanner', 'Copier', 'MFP', 'Multifunction Printer', 'Plotter',
];

const UPS_CATEGORIES = [
  'UPS', 'Power Supply', 'IPS', 'Stabilizer',
];

const CCTV_CATEGORIES = [
  'CCTV', 'Camera', 'IP Camera', 'DVR', 'NVR', 'Security Camera',
];

const NETWORK_EQUIPMENT_CATEGORIES = [
  'Switch', 'Network Switch', 'Managed Switch', 'Layer 3 Switch',
  'Network Equipment', 'Hub', 'Patch Panel',
];

export function getDeviceType(categoryName: string | null): DeviceType {
  if (!categoryName) return 'generic';
  const lower = categoryName.toLowerCase();
  
  if (COMPUTER_CATEGORIES.some(c => lower.includes(c.toLowerCase()))) return 'computer';
  // Network equipment before router since 'Switch' was in both
  if (NETWORK_EQUIPMENT_CATEGORIES.some(c => lower.includes(c.toLowerCase()))) return 'network_equipment';
  if (ROUTER_CATEGORIES.some(c => lower.includes(c.toLowerCase()))) return 'router';
  if (SERVER_CATEGORIES.some(c => lower.includes(c.toLowerCase()))) return 'server';
  if (PRINTER_CATEGORIES.some(c => lower.includes(c.toLowerCase()))) return 'printer';
  if (UPS_CATEGORIES.some(c => lower.includes(c.toLowerCase()))) return 'ups';
  if (CCTV_CATEGORIES.some(c => lower.includes(c.toLowerCase()))) return 'cctv';
  return 'generic';
}

export interface DeviceTypeField {
  key: string;
  labelEn: string;
  labelBn: string;
  placeholder: string;
  isPassword?: boolean;
}

export const ROUTER_FIELDS: DeviceTypeField[] = [
  { key: 'ssid', labelEn: 'SSID', labelBn: 'SSID', placeholder: 'e.g. Office-WiFi' },
  { key: 'wifi_password', labelEn: 'WiFi Password', labelBn: 'WiFi পাসওয়ার্ড', placeholder: '••••••', isPassword: true },
  { key: 'admin_ip', labelEn: 'Admin IP', labelBn: 'অ্যাডমিন IP', placeholder: 'e.g. 192.168.1.1' },
  { key: 'admin_username', labelEn: 'Admin Username', labelBn: 'অ্যাডমিন ইউজারনেম', placeholder: 'e.g. admin' },
  { key: 'admin_password', labelEn: 'Admin Password', labelBn: 'অ্যাডমিন পাসওয়ার্ড', placeholder: '••••••', isPassword: true },
  { key: 'lan_ports', labelEn: 'LAN Ports', labelBn: 'LAN পোর্ট', placeholder: 'e.g. 8' },
  { key: 'wan_ip', labelEn: 'WAN IP', labelBn: 'WAN IP', placeholder: 'e.g. 203.0.113.1' },
  { key: 'lan_ip', labelEn: 'LAN IP', labelBn: 'LAN IP', placeholder: 'e.g. 192.168.1.1' },
  { key: 'firmware_version', labelEn: 'Firmware Version', labelBn: 'ফার্মওয়্যার ভার্সন', placeholder: 'e.g. v2.1.3' },
  { key: 'log_server_ip', labelEn: 'Log Server IP', labelBn: 'লগ সার্ভার IP', placeholder: 'e.g. 10.0.0.5' },
];

export const SERVER_FIELDS: DeviceTypeField[] = [
  { key: 'lan_ip', labelEn: 'LAN IP', labelBn: 'LAN IP', placeholder: 'e.g. 10.0.0.10' },
  { key: 'wan_ip', labelEn: 'WAN IP', labelBn: 'WAN IP', placeholder: 'e.g. 203.0.113.10' },
  { key: 'admin_username', labelEn: 'Admin Username', labelBn: 'অ্যাডমিন ইউজারনেম', placeholder: 'e.g. administrator' },
  { key: 'admin_user_id', labelEn: 'Admin User ID', labelBn: 'অ্যাডমিন ইউজার ID', placeholder: 'e.g. admin01' },
  { key: 'ilo_ip', labelEn: 'iLO/IPMI IP', labelBn: 'iLO/IPMI IP', placeholder: 'e.g. 10.0.0.100' },
  { key: 'ilo_username', labelEn: 'iLO Username', labelBn: 'iLO ইউজারনেম', placeholder: 'e.g. admin' },
  { key: 'ilo_password', labelEn: 'iLO Password', labelBn: 'iLO পাসওয়ার্ড', placeholder: '••••••', isPassword: true },
  { key: 'os_info', labelEn: 'Operating System', labelBn: 'অপারেটিং সিস্টেম', placeholder: 'e.g. Windows Server 2022' },
  { key: 'raid_config', labelEn: 'RAID Configuration', labelBn: 'RAID কনফিগারেশন', placeholder: 'e.g. RAID 5 - 4x 1TB' },
  { key: 'domain_name', labelEn: 'Domain Name', labelBn: 'ডোমেইন নাম', placeholder: 'e.g. corp.local' },
];

export const PRINTER_FIELDS: DeviceTypeField[] = [
  { key: 'ip_address', labelEn: 'IP Address', labelBn: 'IP ঠিকানা', placeholder: 'e.g. 192.168.1.50' },
  { key: 'printer_model', labelEn: 'Model', labelBn: 'মডেল', placeholder: 'e.g. HP LaserJet Pro' },
  { key: 'driver_info', labelEn: 'Driver Info', labelBn: 'ড্রাইভার তথ্য', placeholder: 'e.g. PCL6 v4.12' },
  { key: 'toner_type', labelEn: 'Toner/Ink Type', labelBn: 'টোনার/কালি ধরন', placeholder: 'e.g. HP 26A' },
  { key: 'network_name', labelEn: 'Network Name', labelBn: 'নেটওয়ার্ক নাম', placeholder: 'e.g. Office-Printer-3F' },
  { key: 'admin_password', labelEn: 'Admin Password', labelBn: 'অ্যাডমিন পাসওয়ার্ড', placeholder: '••••••', isPassword: true },
];

export const UPS_FIELDS: DeviceTypeField[] = [
  { key: 'capacity_va', labelEn: 'Capacity (VA)', labelBn: 'ক্যাপাসিটি (VA)', placeholder: 'e.g. 1500VA' },
  { key: 'battery_count', labelEn: 'Battery Count', labelBn: 'ব্যাটারি সংখ্যা', placeholder: 'e.g. 2' },
  { key: 'load_info', labelEn: 'Load Info', labelBn: 'লোড তথ্য', placeholder: 'e.g. 3 Desktops + 2 Monitors' },
  { key: 'ip_address', labelEn: 'Management IP', labelBn: 'ম্যানেজমেন্ট IP', placeholder: 'e.g. 192.168.1.200' },
];

export const CCTV_FIELDS: DeviceTypeField[] = [
  { key: 'ip_address', labelEn: 'IP Address', labelBn: 'IP ঠিকানা', placeholder: 'e.g. 192.168.1.100' },
  { key: 'dvr_nvr_ip', labelEn: 'DVR/NVR IP', labelBn: 'DVR/NVR IP', placeholder: 'e.g. 192.168.1.10' },
  { key: 'channel_number', labelEn: 'Channel Number', labelBn: 'চ্যানেল নম্বর', placeholder: 'e.g. CH-04' },
  { key: 'admin_username', labelEn: 'Admin Username', labelBn: 'অ্যাডমিন ইউজারনেম', placeholder: 'e.g. admin' },
  { key: 'admin_password', labelEn: 'Admin Password', labelBn: 'অ্যাডমিন পাসওয়ার্ড', placeholder: '••••••', isPassword: true },
  { key: 'location', labelEn: 'Camera Location', labelBn: 'ক্যামেরার অবস্থান', placeholder: 'e.g. Main Gate' },
];

export const NETWORK_EQUIPMENT_FIELDS: DeviceTypeField[] = [
  { key: 'management_ip', labelEn: 'Management IP', labelBn: 'ম্যানেজমেন্ট IP', placeholder: 'e.g. 10.0.0.2' },
  { key: 'vlan_config', labelEn: 'VLAN Configuration', labelBn: 'VLAN কনফিগারেশন', placeholder: 'e.g. VLAN 10, 20, 30' },
  { key: 'subnet', labelEn: 'Subnet', labelBn: 'সাবনেট', placeholder: 'e.g. 192.168.1.0/24' },
  { key: 'gateway', labelEn: 'Gateway', labelBn: 'গেটওয়ে', placeholder: 'e.g. 192.168.1.1' },
  { key: 'port_count', labelEn: 'Port Count', labelBn: 'পোর্ট সংখ্যা', placeholder: 'e.g. 24' },
  { key: 'admin_username', labelEn: 'Admin Username', labelBn: 'অ্যাডমিন ইউজারনেম', placeholder: 'e.g. admin' },
  { key: 'admin_password', labelEn: 'Admin Password', labelBn: 'অ্যাডমিন পাসওয়ার্ড', placeholder: '••••••', isPassword: true },
  { key: 'firmware_version', labelEn: 'Firmware Version', labelBn: 'ফার্মওয়্যার ভার্সন', placeholder: 'e.g. v3.0.1' },
  { key: 'mac_address', labelEn: 'MAC Address', labelBn: 'MAC ঠিকানা', placeholder: 'e.g. AA:BB:CC:DD:EE:FF' },
  { key: 'spanning_tree', labelEn: 'Spanning Tree', labelBn: 'স্প্যানিং ট্রি', placeholder: 'e.g. RSTP Enabled' },
];

export function getFieldsForType(type: DeviceType): DeviceTypeField[] {
  switch (type) {
    case 'router': return ROUTER_FIELDS;
    case 'server': return SERVER_FIELDS;
    case 'printer': return PRINTER_FIELDS;
    case 'ups': return UPS_FIELDS;
    case 'cctv': return CCTV_FIELDS;
    case 'network_equipment': return NETWORK_EQUIPMENT_FIELDS;
    default: return [];
  }
}

export function getTypeIcon(type: DeviceType): string {
  switch (type) {
    case 'router': return 'Wifi';
    case 'server': return 'Server';
    case 'printer': return 'Printer';
    case 'ups': return 'Zap';
    case 'cctv': return 'Camera';
    case 'network_equipment': return 'Network';
    default: return 'Settings';
  }
}

export function getTypeLabel(type: DeviceType, lang: string): string {
  const labels: Record<DeviceType, { en: string; bn: string }> = {
    computer: { en: 'Hardware Specifications', bn: 'হার্ডওয়্যার স্পেসিফিকেশন' },
    router: { en: 'Network Device Info', bn: 'নেটওয়ার্ক ডিভাইস তথ্য' },
    server: { en: 'Server Information', bn: 'সার্ভার তথ্য' },
    printer: { en: 'Printer/Scanner Info', bn: 'প্রিন্টার/স্ক্যানার তথ্য' },
    ups: { en: 'UPS/Power Info', bn: 'UPS/পাওয়ার তথ্য' },
    cctv: { en: 'CCTV/Camera Info', bn: 'CCTV/ক্যামেরা তথ্য' },
    network_equipment: { en: 'Network Equipment Info', bn: 'নেটওয়ার্ক ইকুইপমেন্ট তথ্য' },
    generic: { en: 'Device Info', bn: 'ডিভাইস তথ্য' },
  };
  return lang === 'bn' ? labels[type].bn : labels[type].en;
}
