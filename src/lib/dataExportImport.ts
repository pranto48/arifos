import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';
import { exportToXlsx } from '@/lib/xlsxHelpers';

export type ExportableEntity = 
  | 'tasks' | 'task_categories' | 'task_checklists' | 'task_follow_up_notes'
  | 'notes' | 'support_users' | 'support_departments' | 'support_units'
  | 'device_inventory' | 'device_categories' | 'device_suppliers' | 'device_service_history'
  | 'projects' | 'project_milestones'
  | 'profiles' | 'user_roles';

export type ExportFormat = 'json' | 'xml' | 'xlsx';

interface ExportConfig {
  entities: ExportableEntity[];
  label: string;
}

export interface ImportPreviewWarning {
  entity: string;
  rowIndex: number;
  message: string;
}

export interface ImportPreviewSummary {
  fixedPayload: any;
  warnings: ImportPreviewWarning[];
  schemaSummary: {
    entitiesDetected: number;
    rowsDetected: number;
    missingEntities: string[];
    invalidEntityShapes: string[];
  };
  entityBreakdown: Array<{
    entity: string;
    rows: number;
    idAutoConverted: number;
    relationshipsRemapped: number;
  }>;
  idAutoConverted: number;
  relationshipsRemapped: number;
  idConversionDetails: Array<{
    entity: string;
    rowIndex: number;
    originalId: string;
    convertedId: string;
  }>;
  relationRemapDetails: Array<{
    entity: string;
    fkColumn: string;
    targetEntity: string;
    count: number;
  }>;
  rowRemapDetails: Array<{
    entity: string;
    rowIndex: number;
    fkColumn: string;
    from: string;
    to: string;
  }>;
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


const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_REGEX.test(value);
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const FOREIGN_KEY_REMAP: Record<string, Record<string, string>> = {
  support_departments: { unit_id: 'support_units' },
  support_users: { department_id: 'support_departments' },
  task_checklists: { task_id: 'tasks' },
  task_follow_up_notes: { task_id: 'tasks' },
  project_milestones: { project_id: 'projects' },
  device_inventory: {
    category_id: 'device_categories',
    supplier_id: 'device_suppliers',
    support_user_id: 'support_users',
  },
  device_service_history: {
    device_id: 'device_inventory',
    task_id: 'tasks',
  },
};

function buildIdRemapMap(entities: ExportableEntity[], data: Record<string, any>): Record<string, Map<string, string>> {
  const maps: Record<string, Map<string, string>> = {};

  for (const entity of entities) {
    const rows = data?.[entity];
    if (!Array.isArray(rows)) continue;

    const remap = new Map<string, string>();
    for (const row of rows) {
      const id = row?.id;
      if (typeof id === 'string' && id.length > 0 && !isValidUuid(id)) {
        if (!remap.has(id)) {
          remap.set(id, makeUuid());
        }
      }
    }
    if (remap.size > 0) {
      maps[entity] = remap;
    }
  }

  return maps;
}

function applyIdAndFkRemap(row: any, entity: string, idRemapMap: Record<string, Map<string, string>>): any {
  const next = { ...row };

  const idMap = idRemapMap[entity];
  if (idMap && typeof next.id === 'string' && idMap.has(next.id)) {
    next.id = idMap.get(next.id);
  }

  const fkMap = FOREIGN_KEY_REMAP[entity] || {};
  for (const [fkColumn, targetEntity] of Object.entries(fkMap)) {
    const value = next[fkColumn];
    const targetMap = idRemapMap[targetEntity];
    if (targetMap && typeof value === 'string' && targetMap.has(value)) {
      next[fkColumn] = targetMap.get(value);
    }
  }

  return next;
}

export function buildImportPreview(payload: any, userId: string): ImportPreviewSummary {
  const preset = EXPORT_PRESETS[payload?.exportType];
  if (!preset || !payload?.data || typeof payload.data !== 'object') {
    throw new Error('Invalid import payload');
  }

  const data = payload.data as Record<string, any>;
  const idRemapMap = buildIdRemapMap(preset.entities, data);
  const fixedData: Record<string, any[]> = {};
  const warnings: ImportPreviewWarning[] = [];
  const idConversionDetails: ImportPreviewSummary['idConversionDetails'] = [];
  const rowRemapDetails: ImportPreviewSummary['rowRemapDetails'] = [];
  const relationRemapCounter = new Map<string, number>();
  const entityBreakdown: ImportPreviewSummary['entityBreakdown'] = [];

  const missingEntities = preset.entities.filter((entity) => !Array.isArray(data[entity]));
  const invalidEntityShapes = preset.entities.filter((entity) => {
    const rows = data[entity];
    return Array.isArray(rows) && rows.some((row) => row === null || typeof row !== 'object' || Array.isArray(row));
  });

  for (const entity of preset.entities) {
    const rows = Array.isArray(data[entity]) ? data[entity] : [];
    let entityIdConversions = 0;
    let entityFkRemaps = 0;

    fixedData[entity] = rows
      .map((row: any, rowIndex: number) => {
        if (row === null || typeof row !== 'object' || Array.isArray(row)) {
          warnings.push({
            entity,
            rowIndex,
            message: 'Row is not a valid object and was skipped.',
          });
          return null;
        }

        const originalId = row.id;
        const remapped = applyIdAndFkRemap({ ...row }, entity, idRemapMap);

        if (typeof originalId === 'string' && remapped.id !== originalId) {
          entityIdConversions++;
          idConversionDetails.push({
            entity,
            rowIndex,
            originalId,
            convertedId: remapped.id,
          });
        }

        const fkMap = FOREIGN_KEY_REMAP[entity] || {};
        for (const [fkColumn, targetEntity] of Object.entries(fkMap)) {
          const from = row[fkColumn];
          const to = remapped[fkColumn];
          if (typeof from === 'string' && typeof to === 'string' && from !== to) {
            entityFkRemaps++;
            rowRemapDetails.push({ entity, rowIndex, fkColumn, from, to });
            const key = `${entity}|${fkColumn}|${targetEntity}`;
            relationRemapCounter.set(key, (relationRemapCounter.get(key) || 0) + 1);
          }
        }

        if ('user_id' in remapped) {
          remapped.user_id = userId;
        }

        return remapped;
      })
      .filter((row): row is Record<string, any> => Boolean(row));

    entityBreakdown.push({
      entity,
      rows: fixedData[entity].length,
      idAutoConverted: entityIdConversions,
      relationshipsRemapped: entityFkRemaps,
    });
  }

  const relationRemapDetails: ImportPreviewSummary['relationRemapDetails'] = Array.from(relationRemapCounter.entries()).map(([key, count]) => {
    const [entity, fkColumn, targetEntity] = key.split('|');
    return { entity, fkColumn, targetEntity, count };
  });

  const fixedPayload = {
    ...payload,
    data: fixedData,
    exportedAt: payload.exportedAt || new Date().toISOString(),
  };

  const rowsDetected = preset.entities.reduce((acc, entity) => acc + (Array.isArray(data[entity]) ? data[entity].length : 0), 0);

  return {
    fixedPayload,
    warnings,
    schemaSummary: {
      entitiesDetected: preset.entities.filter((entity) => Array.isArray(data[entity])).length,
      rowsDetected,
      missingEntities,
      invalidEntityShapes,
    },
    entityBreakdown,
    idAutoConverted: idConversionDetails.length,
    relationshipsRemapped: rowRemapDetails.length,
    idConversionDetails,
    relationRemapDetails,
    rowRemapDetails,
  };
}

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
  } else if (format === 'xlsx') {
    const blob = exportToXlsx(result, preset);
    return { blob, filename: `lifeos-${preset}-${dateStr}.xlsx` };
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
  const preview = buildImportPreview(payload, userId);
  const preset = EXPORT_PRESETS[preview.fixedPayload.exportType];

  let imported = 0;
  const errors: string[] = [];
  const isShared = (entity: string) => SHARED_TABLES.has(entity as ExportableEntity);
  const total = preset.entities.length;
  const idRemapMap = buildIdRemapMap(preset.entities, payload.data);

  for (let idx = 0; idx < total; idx++) {
    const entity = preset.entities[idx];
    const rows = preview.fixedPayload.data[entity];
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
      const remapped = applyIdAndFkRemap(rest, entity, idRemapMap);
      if (remapped.user_id) {
        remapped.user_id = userId;
      }
      return remapped;
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
