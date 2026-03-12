import * as XLSX from 'xlsx';
import { EXPORT_PRESETS, type ExportableEntity } from './dataExportImport';

// ---- Example data for each entity ----

const EXAMPLE_ROWS: Record<string, any[]> = {
  device_categories: [
    { name: 'Laptop', description: 'Portable computers' },
    { name: 'Desktop', description: 'Desktop workstations' },
  ],
  device_suppliers: [
    { name: 'Dell Technologies', contact_person: 'Ahmed Khan', phone: '+880-1700000001', email: 'ahmed@dell-bd.example.com', address: 'Dhaka, Bangladesh', is_active: true },
    { name: 'HP Inc.', contact_person: 'Sara Rahman', phone: '+880-1700000002', email: 'sara@hp-bd.example.com', address: 'Chittagong, Bangladesh', is_active: true },
  ],
  device_inventory: [
    {
      device_name: 'Dell Latitude 5540', device_number: 'DEV-001', serial_number: 'SN-DELL-001',
      status: 'available', price: 85000, purchase_date: '2025-01-15', warranty_date: '2028-01-15',
      ram_info: '16GB DDR5', storage_info: '512GB NVMe SSD', processor_info: 'Intel Core i7-13th Gen',
      monitor_info: '15.6" FHD', has_ups: false, notes: 'New device',
    },
    {
      device_name: 'HP ProBook 450 G10', device_number: 'DEV-002', serial_number: 'SN-HP-002',
      status: 'assigned', price: 72000, purchase_date: '2025-02-20', warranty_date: '2028-02-20',
      ram_info: '8GB DDR4', storage_info: '256GB NVMe SSD', processor_info: 'Intel Core i5-13th Gen',
      monitor_info: '15.6" FHD', has_ups: false, notes: 'Assigned to IT dept',
    },
  ],
  device_service_history: [
    {
      service_date: '2025-06-10', service_type: 'Repair', description: 'Replaced keyboard',
      technician_name: 'Rafiq Ahmed', cost: 3500,
    },
  ],
  support_units: [
    { name: 'Head Office', description: 'Main headquarters' },
    { name: 'Branch Office', description: 'Regional branch' },
  ],
  support_departments: [
    { name: 'IT Department', description: 'Information Technology' },
    { name: 'HR Department', description: 'Human Resources' },
  ],
  support_users: [
    {
      name: 'John Doe', email: 'john@example.com', phone: '+880-1700000010',
      designation: 'Software Engineer', extension_number: '101', is_active: true,
      ip_address: '192.168.1.10', notes: 'Full-stack developer',
    },
    {
      name: 'Jane Smith', email: 'jane@example.com', phone: '+880-1700000011',
      designation: 'Network Admin', extension_number: '102', is_active: true,
      ip_address: '192.168.1.11', notes: 'Network infrastructure',
    },
  ],
  tasks: [
    { title: 'Example Task', description: 'Sample task', status: 'todo', priority: 'medium', task_type: 'office' },
  ],
  task_categories: [
    { name: 'General', color: '#3b82f6', icon: 'Briefcase', category_type: 'office' },
  ],
  task_checklists: [],
  task_follow_up_notes: [],
  notes: [
    { title: 'Example Note', content: 'Sample content', note_type: 'office', is_pinned: false, is_favorite: false },
  ],
  projects: [
    { title: 'Example Project', description: 'Sample project', status: 'active', priority: 'medium', project_type: 'office' },
  ],
  project_milestones: [
    { title: 'Phase 1', is_completed: false, sort_order: 0 },
  ],
  profiles: [
    { full_name: 'Example User', email: 'user@example.com' },
  ],
  user_roles: [
    { role: 'admin' },
  ],
};

/**
 * Generate an example .xlsx file for a given preset
 */
export function generateExampleXlsx(preset: string): Blob {
  const config = EXPORT_PRESETS[preset];
  if (!config) throw new Error(`Unknown preset: ${preset}`);

  const wb = XLSX.utils.book_new();

  for (const entity of config.entities) {
    const rows = EXAMPLE_ROWS[entity] || [];
    if (rows.length === 0) {
      // Create sheet with just headers
      const ws = XLSX.utils.aoa_to_sheet([getHeadersForEntity(entity)]);
      XLSX.utils.book_append_sheet(wb, ws, truncateSheetName(entity));
    } else {
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, truncateSheetName(entity));
    }
  }

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Export data as .xlsx with multiple sheets
 */
export function exportToXlsx(data: Record<string, any[]>, preset: string): Blob {
  const wb = XLSX.utils.book_new();

  for (const [entity, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) continue;
    const ws = rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([getHeadersForEntity(entity)]);
    XLSX.utils.book_append_sheet(wb, ws, truncateSheetName(entity));
  }

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Parse an .xlsx file into the standard import payload format
 */
export async function parseXlsxFile(file: File, preset?: string): Promise<any> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  const data: Record<string, any[]> = {};

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    // Sheet name maps to entity name
    const entityName = sheetName.replace(/\s+/g, '_').toLowerCase();
    data[entityName] = rows;
  }

  // Try to detect the preset from sheet names
  let detectedPreset = preset || detectPresetFromSheets(wb.SheetNames);

  return {
    exportType: detectedPreset,
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data,
  };
}

function detectPresetFromSheets(sheetNames: string[]): string {
  const normalized = sheetNames.map(s => s.replace(/\s+/g, '_').toLowerCase());

  for (const [presetKey, config] of Object.entries(EXPORT_PRESETS)) {
    const entityNames = config.entities.map(e => e.toLowerCase());
    const matchCount = normalized.filter(s => entityNames.includes(s)).length;
    if (matchCount >= Math.ceil(entityNames.length / 2)) {
      return presetKey;
    }
  }

  // Fallback: use first matching preset
  for (const [presetKey, config] of Object.entries(EXPORT_PRESETS)) {
    if (normalized.some(s => config.entities.includes(s as any))) {
      return presetKey;
    }
  }

  return 'devices'; // default fallback
}

function truncateSheetName(name: string): string {
  // Excel sheet names max 31 chars
  return name.length > 31 ? name.substring(0, 31) : name;
}

function getHeadersForEntity(entity: string): string[] {
  const headerMap: Record<string, string[]> = {
    device_categories: ['name', 'description'],
    device_suppliers: ['name', 'contact_person', 'phone', 'email', 'address', 'is_active', 'notes'],
    device_inventory: [
      'device_name', 'device_number', 'serial_number', 'status', 'price',
      'purchase_date', 'delivery_date', 'warranty_date', 'category_id', 'supplier_id',
      'support_user_id', 'unit_id', 'ram_info', 'storage_info', 'processor_info',
      'monitor_info', 'webcam_info', 'headset_info', 'has_ups', 'ups_info',
      'requisition_number', 'bod_number', 'bill_details', 'notes',
    ],
    device_service_history: ['device_id', 'service_date', 'service_type', 'description', 'technician_name', 'cost', 'task_id'],
    support_units: ['name', 'description'],
    support_departments: ['name', 'description', 'unit_id'],
    support_users: [
      'name', 'email', 'phone', 'designation', 'department_id', 'extension_number',
      'extension_password', 'mail_password', 'ip_address', 'nas_username', 'nas_password',
      'device_info', 'new_device_assign', 'device_assign_date', 'device_handover_date',
      'is_active', 'notes',
    ],
    tasks: ['title', 'description', 'status', 'priority', 'task_type', 'due_date'],
    task_categories: ['name', 'color', 'icon', 'category_type'],
    task_checklists: ['task_id', 'title', 'is_completed', 'sort_order'],
    task_follow_up_notes: ['task_id', 'content'],
    notes: ['title', 'content', 'note_type', 'is_pinned', 'is_favorite', 'tags'],
    projects: ['title', 'description', 'status', 'priority', 'project_type', 'target_date'],
    project_milestones: ['project_id', 'title', 'is_completed', 'sort_order'],
    profiles: ['full_name', 'email', 'timezone', 'currency', 'date_format'],
    user_roles: ['role'],
  };

  return headerMap[entity] || ['id'];
}
