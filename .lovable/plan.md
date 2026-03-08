

## Device-Type-Specific Information System

### Problem
Currently, `DeviceSpecsForm` only shows hardware fields (RAM, Storage, Processor, etc.) for computer-type categories. Other device types like Router, Server, Printer, etc. have no dedicated fields.

### Approach
Use the existing `custom_specs` JSONB column to store device-type-specific data. No database migration needed. Extend `DeviceSpecsForm` to detect the device category and render the appropriate fields.

### Category-to-Fields Mapping

```text
Router/Switch/Access Point:
  - SSID, WiFi Password, Admin IP, Admin Username/Password
  - LAN Ports, WAN IP, Firmware Version, Log Server IP

Server:
  - LAN IP, WAN IP, Admin Username, Admin User ID
  - iLO/IPMI IP, iLO Username/Password
  - OS, RAID Config, Domain Name

Printer/Scanner:
  - IP Address, Model, Driver Info, Toner/Ink Type
  - Network Name, Admin Password

UPS/Power:
  - Capacity (VA), Battery Count, Load Info

CCTV/Camera:
  - IP Address, DVR/NVR IP, Channel Number, Admin Credentials
```

Computer categories (Desktop, Laptop, etc.) retain existing hardware spec fields unchanged.

### Files to Modify

1. **`src/components/device/DeviceSpecsForm.tsx`**
   - Add category-type detection constants (ROUTER_CATEGORIES, SERVER_CATEGORIES, etc.)
   - Add dedicated form sections per device type using `custom_specs` for storage
   - Keep existing computer hardware fields intact
   - Each device type section has its own icon and labeled fields

2. **`src/components/device/DeviceDetailsDialog.tsx`**
   - Update the details view to render device-type-specific fields from `custom_specs`
   - Show fields with appropriate labels and icons based on category

3. **`src/components/device/DeviceFilters.tsx`** (minor)
   - No changes needed; custom_specs-based filtering already exists via advanced filters

### Technical Details
- All type-specific data stored in `custom_specs` JSONB with standardized keys (e.g., `ssid`, `wifi_password`, `lan_ip`, `wan_ip`, `ilo_ip`)
- `DeviceSpecsForm` renders for ALL categories now (not just computers), showing relevant fields per type
- Helper function `getDeviceType(categoryName)` returns `'computer' | 'router' | 'server' | 'printer' | 'ups' | 'cctv' | 'generic'`
- Generic/unknown categories still get the custom fields section for flexibility

