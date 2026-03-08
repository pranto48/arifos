import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';

export type ExportableEntity = 
  | 'tasks' | 'task_categories' | 'task_checklists' | 'task_follow_up_notes'
  | 'notes' | 'support_users' | 'support_departments' | 'support_units'
  | 'device_inventory' | 'device_categories' | 'device_suppliers' | 'device_service_history'
  | 'projects' | 'project_milestones'
  | 'profiles' | 'user_roles';

export type ExportFormat = 'json' | 'xml';

interface ExportConfig {
  entities: ExportableEntity[];
  label: string;
}

export const EXPORT_PRESETS: Record<string, ExportConfig> = {
  tasks: {
    label: 'Tasks',
    entities: ['tasks', 'task_categories', 'task_checklists', 'task_follow_up_notes'],
  },
  task_categories: {
    label: 'Task Categories',
    entities: ['task_categories'],
  },
  notes: {
    label: 'Notes',
    entities: ['notes'],
  },
  support_users: {
    label: 'Support Users',
    entities: ['support_units', 'support_departments', 'support_users'],
  },
  devices: {
    label: 'Devices',
    entities: ['device_categories', 'device_suppliers', 'device_inventory', 'device_service_history'],
  },
  projects: {
    label: 'Projects',
    entities: ['projects', 'project_milestones'],
  },
  users_roles: {
    label: 'Users & Roles',
    entities: ['profiles', 'user_roles'],
  },
};

// Tables that are NOT user-scoped (shared/global data)
const SHARED_TABLES = new Set([
  'support_units', 'support_departments', 'support_users',
  'device_categories', 'device_suppliers', 'device_inventory', 'device_service_history',
  'user_roles',
]);

export async function fetchEntityData(entity: ExportableEntity, userId: string): Promise<any[]> {
  if (isSelfHosted()) {
    const isShared = SHARED_TABLES.has(entity);
    try {
      if (isShared) {
        const response = await fetch(`${getApiBaseUrl()}/rest/v1/${entity}?select=*`, {
          headers: getRestHeaders(),
        });
        if (!response.ok) throw new Error(`Failed to fetch ${entity}`);
        return await response.json();
      } else {
        return selfHostedApi.selectAll(entity);
      }
    } catch {
      return selfHostedApi.selectAll(entity);
    }
  }
  const isShared = SHARED_TABLES.has(entity);
  let query = supabase.from(entity).select('*');
  if (!isShared) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Fetch multiple entities in parallel with concurrency limit
async function fetchEntitiesParallel(
  entities: ExportableEntity[],
  userId: string,
  onProgress?: (entity: string, pct: number) => void,
  concurrency = 3,
): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  const total = entities.length;
  let completed = 0;

  // Process in chunks of `concurrency`
  for (let i = 0; i < total; i += concurrency) {
    const chunk = entities.slice(i, i + concurrency);
    const promises = chunk.map(async (entity) => {
      onProgress?.(entity, (completed / total) * 100);
      const data = await fetchEntityData(entity, userId);
      result[entity] = data;
      completed++;
      onProgress?.(entity, (completed / total) * 100);
    });
    await Promise.all(promises);
  }

  return result;
}

function getApiBaseUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl && !supabaseUrl.includes('__LIFEOS_URL_PLACEHOLDER__')) {
    return supabaseUrl;
  }
  return window.location.origin;
}

function getRestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'anon',
  };
  const token = localStorage.getItem('lifeos_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function exportData(
  preset: string,
  userId: string,
  format: ExportFormat,
  selectedEntities?: ExportableEntity[],
  onProgress?: (entity: string, pct: number) => void,
): Promise<{ blob: Blob; filename: string }> {
  const config = EXPORT_PRESETS[preset];
  if (!config) throw new Error(`Unknown preset: ${preset}`);

  const entities = selectedEntities && selectedEntities.length > 0 ? selectedEntities : config.entities;

  // Parallel fetch all entities
  const result = await fetchEntitiesParallel(entities, userId, onProgress);

  const exportPayload = {
    exportType: preset,
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: result,
  };

  const dateStr = new Date().toISOString().split('T')[0];

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    return { blob, filename: `lifeos-${preset}-${dateStr}.json` };
  } else {
    const xml = jsonToXml(exportPayload, 'LifeOSExport');
    const blob = new Blob([xml], { type: 'application/xml' });
    return { blob, filename: `lifeos-${preset}-${dateStr}.xml` };
  }
}

/** Parse a file into the standard payload object */
export async function parseImportFile(file: File): Promise<any> {
  const text = await file.text();
  if (file.name.endsWith('.xml')) {
    return xmlToJson(text);
  }
  return JSON.parse(text);
}

/** Detect conflicts between import payload and existing data (parallel) */
export async function detectConflicts(
  payload: any,
  userId: string,
): Promise<{ entity: string; id: string; existingName: string }[]> {
  const preset = EXPORT_PRESETS[payload.exportType];
  if (!preset) return [];

  const entitiesToCheck = preset.entities.filter(
    (e) => Array.isArray(payload.data[e]) && payload.data[e].length > 0,
  );

  // Fetch all existing data in parallel
  const existingDataMap = await fetchEntitiesParallel(entitiesToCheck as ExportableEntity[], userId);

  const conflicts: { entity: string; id: string; existingName: string }[] = [];

  for (const entity of entitiesToCheck) {
    const rows = payload.data[entity];
    const existingIds = new Set((existingDataMap[entity] || []).map((r: any) => r.id));

    for (const row of rows) {
      if (existingIds.has(row.id)) {
        conflicts.push({
          entity,
          id: row.id,
          existingName: row.name || row.title || row.content?.substring(0, 40) || row.id,
        });
      }
    }
  }

  return conflicts;
}

export async function importData(
  payload: any,
  userId: string,
  onProgress?: (msg: string) => void,
  onPct?: (pct: number) => void,
  conflictResolution: 'overwrite' | 'skip' = 'overwrite',
  existingDataMap?: Record<string, any[]>,
): Promise<{ imported: number; errors: string[] }> {
  if (!payload?.data || !payload?.exportType) {
    throw new Error('Invalid export file. Missing "data" or "exportType" field.');
  }

  const preset = EXPORT_PRESETS[payload.exportType];
  if (!preset) {
    throw new Error(`Unknown export type: ${payload.exportType}`);
  }

  let imported = 0;
  const errors: string[] = [];
  const isShared = (entity: string) => SHARED_TABLES.has(entity as ExportableEntity);
  const total = preset.entities.length;

  for (let idx = 0; idx < total; idx++) {
    const entity = preset.entities[idx];
    const rows = payload.data[entity];
    if (!Array.isArray(rows) || rows.length === 0) {
      onPct?.(((idx + 1) / total) * 100);
      continue;
    }

    onProgress?.(`Importing ${entity.replace(/_/g, ' ')} (${rows.length} items)...`);
    onPct?.((idx / total) * 100);

    // If skip mode, filter out existing IDs using pre-fetched data or fetch now
    let filteredRows = rows;
    if (conflictResolution === 'skip') {
      try {
        const existingData = existingDataMap?.[entity] ?? await fetchEntityData(entity as ExportableEntity, userId);
        const existingIds = new Set(existingData.map((r: any) => r.id));
        filteredRows = rows.filter((row: any) => !existingIds.has(row.id));
      } catch {
        // If fetch fails, proceed with all rows
      }
    }

    if (filteredRows.length === 0) {
      onPct?.(((idx + 1) / total) * 100);
      continue;
    }

    const cleaned = filteredRows.map((row: any) => {
      const { search_vector, ...rest } = row;
      if (rest.user_id) {
        rest.user_id = userId;
      }
      return rest;
    });

    const onConflictKey = getOnConflictKey(entity);
    const BATCH_SIZE = isSelfHosted() ? 50 : 200;

    try {
      if (isSelfHosted()) {
        await upsertViaPostgrest(entity, cleaned, BATCH_SIZE);
      } else {
        // Parallel batch upserts
        const batches: any[][] = [];
        for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
          batches.push(cleaned.slice(i, i + BATCH_SIZE));
        }

        const batchResults = await Promise.all(
          batches.map((batch) =>
            supabase.from(entity as any).upsert(batch as any, { onConflict: onConflictKey }),
          ),
        );

        for (const { error } of batchResults) {
          if (error) {
            errors.push(`${entity}: ${error.message}`);
          }
        }
      }
      imported += cleaned.length;
    } catch (err: any) {
      errors.push(`${entity}: ${err.message}`);
    }

    onPct?.(((idx + 1) / total) * 100);
  }

  return { imported, errors };
}

async function upsertViaPostgrest(table: string, rows: any[], batchSize = 50): Promise<void> {
  const batches: any[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }

  // Parallel PostgREST upserts
  const results = await Promise.all(
    batches.map(async (batch) => {
      const response = await fetch(`${getApiBaseUrl()}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          ...getRestHeaders(),
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(err.message || `Import failed for ${table}`);
      }
    }),
  );
}

function getOnConflictKey(entity: string): string {
  switch (entity) {
    case 'profiles':
      return 'user_id';
    case 'user_roles':
      return 'user_id,role';
    default:
      return 'id';
  }
}

// ---- XML helpers ----

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function jsonToXml(obj: any, rootName: string): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<${rootName}>\n`;
  xml += objectToXml(obj, 1);
  xml += `</${rootName}>`;
  return xml;
}

function objectToXml(obj: any, indent: number): string {
  const pad = '  '.repeat(indent);
  let xml = '';

  for (const [key, val] of Object.entries(obj)) {
    const tag = key.replace(/[^a-zA-Z0-9_]/g, '_');
    if (Array.isArray(val)) {
      xml += `${pad}<${tag}>\n`;
      for (const item of val) {
        xml += `${pad}  <item>\n`;
        if (typeof item === 'object' && item !== null) {
          xml += objectToXml(item, indent + 2);
        } else {
          xml += `${pad}    <value>${escapeXml(String(item ?? ''))}</value>\n`;
        }
        xml += `${pad}  </item>\n`;
      }
      xml += `${pad}</${tag}>\n`;
    } else if (typeof val === 'object' && val !== null) {
      xml += `${pad}<${tag}>\n`;
      xml += objectToXml(val, indent + 1);
      xml += `${pad}</${tag}>\n`;
    } else {
      xml += `${pad}<${tag}>${escapeXml(String(val ?? ''))}</${tag}>\n`;
    }
  }
  return xml;
}

function xmlToJson(xmlStr: string): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');
  const root = doc.documentElement;

  if (root.querySelector('parsererror')) {
    throw new Error('Invalid XML file');
  }

  return xmlNodeToJson(root);
}

export function xmlToJsonPublic(xmlStr: string): any {
  return xmlToJson(xmlStr);
}

function xmlNodeToJson(node: Element): any {
  const result: any = {};

  for (const child of Array.from(node.children)) {
    const tag = child.tagName;

    if (child.children.length > 0 && child.children[0]?.tagName === 'item') {
      result[tag] = Array.from(child.children)
        .filter(c => c.tagName === 'item')
        .map(item => {
          if (item.children.length === 1 && item.children[0].tagName === 'value') {
            return parsePrimitive(item.children[0].textContent || '');
          }
          return xmlNodeToJson(item);
        });
    } else if (child.children.length > 0) {
      result[tag] = xmlNodeToJson(child);
    } else {
      result[tag] = parsePrimitive(child.textContent || '');
    }
  }

  return result;
}

function parsePrimitive(val: string): any {
  if (val === 'null' || val === '') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(val) && val.length < 16) return Number(val);
  return val;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
