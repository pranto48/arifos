import { useMemo, useState, useRef } from 'react';
import { Download, Upload, FileJson, FileCode, Loader2, Check, AlertTriangle, SkipForward, Replace, FileDown, FileSpreadsheet, ArrowRightLeft, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  exportData,
  importData,
  parseImportFile,
  detectConflicts,
  downloadBlob,
  buildImportPreview,
  type ExportFormat,
  type ExportableEntity,
  type ImportPreviewSummary,
  EXPORT_PRESETS,
} from '@/lib/dataExportImport';
import { generateExampleXlsx, parseXlsxFile } from '@/lib/xlsxHelpers';
import { PRODUCT_ANALYTICS_EVENTS, trackProductAnalyticsEvent } from '@/lib/productAnalytics';

interface DataExportImportButtonProps {
  preset: string;
  label?: string;
}

interface ConflictItem {
  entity: string;
  id: string;
  existingName: string;
}

type ConflictResolution = 'overwrite' | 'skip';

// Generate example import file content for a given preset
function generateExampleFile(preset: string): object {
  const config = EXPORT_PRESETS[preset];
  if (!config) return {};

  const exampleData: Record<string, any[]> = {};

  for (const entity of config.entities) {
    switch (entity) {
      case 'tasks':
        exampleData.tasks = [{
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Example Task',
          description: 'This is an example task for import reference',
          status: 'pending',
          priority: 'medium',
          task_type: 'office',
          due_date: '2026-03-15',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'task_categories':
        exampleData.task_categories = [{
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Example Category',
          color: '#3b82f6',
          icon: 'Briefcase',
          category_type: 'office',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'notes':
        exampleData.notes = [{
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Example Note',
          content: 'This is an example note content for import reference.',
          note_type: 'office',
          is_pinned: false,
          is_favorite: false,
          tags: ['example'],
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'support_units':
        exampleData.support_units = [{
          id: '44444444-4444-4444-8444-444444444444',
          name: 'Example Unit',
          description: 'Example organizational unit',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'support_departments':
        exampleData.support_departments = [{
          id: '55555555-5555-4555-8555-555555555555',
          name: 'Example Department',
          unit_id: '44444444-4444-4444-8444-444444444444',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'support_users':
        exampleData.support_users = [{
          id: '66666666-6666-4666-8666-666666666666',
          name: 'John Doe',
          email: 'john@example.com',
          department_id: '55555555-5555-4555-8555-555555555555',
          designation: 'Engineer',
          is_active: true,
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'device_categories':
        exampleData.device_categories = [{
          id: '77777777-7777-4777-8777-777777777777',
          name: 'Laptop',
          description: 'Portable computers',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'device_inventory':
        exampleData.device_inventory = [{
          id: '88888888-8888-4888-8888-888888888888',
          device_name: 'Dell Latitude 5540',
          serial_number: 'SN-EXAMPLE-001',
          status: 'available',
          category_id: '77777777-7777-4777-8777-777777777777',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'projects':
        exampleData.projects = [{
          id: '99999999-9999-4999-8999-999999999999',
          title: 'Example Project',
          description: 'An example project for import reference',
          status: 'active',
          priority: 'medium',
          project_type: 'office',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'profiles':
        exampleData.profiles = [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          full_name: 'Example User',
          email: 'user@example.com',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'user_roles':
        exampleData.user_roles = [{
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          role: 'admin',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      default:
        exampleData[entity] = [];
    }
  }

  return {
    exportType: preset,
    exportedAt: new Date().toISOString(),
    version: '1.0',
    _note: 'Replace YOUR_USER_ID with your actual user ID. All IDs should be valid UUIDs.',
    data: exampleData,
  };
}

export function DataExportImportButton({ preset, label }: DataExportImportButtonProps) {
  const { user } = useAuth();
  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportEntity, setExportEntity] = useState('');
  // Category picker
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<ExportableEntity[]>([]);
  const [pendingFormat, setPendingFormat] = useState<ExportFormat>('json');
  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importEntity, setImportEntity] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [showResult, setShowResult] = useState(false);
  // Conflict state
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [showConflict, setShowConflict] = useState(false);
  const [showPreImportWizard, setShowPreImportWizard] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('overwrite');
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewSummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = EXPORT_PRESETS[preset];
  const displayLabel = label || config?.label || preset;

  const highlightedRemaps = useMemo(() => {
    return (importPreview?.relationRemapDetails || []).filter(item =>
      item.entity.startsWith('device_') ||
      item.entity.startsWith('support_') ||
      item.targetEntity.startsWith('device_') ||
      item.targetEntity.startsWith('support_')
    );
  }, [importPreview]);

  const previewJsonSnippet = useMemo(() => {
    if (!importPreview?.fixedPayload) return '';
    return JSON.stringify(importPreview.fixedPayload, null, 2);
  }, [importPreview]);

  // ---- Download example file ----
  const handleDownloadExample = (format: 'json' | 'xlsx' = 'json') => {
    if (format === 'xlsx') {
      try {
        const blob = generateExampleXlsx(preset);
        downloadBlob(blob, `lifeos-${preset}-example.xlsx`);
        toast.success('Example Excel file downloaded! Edit it and import.');
      } catch (err: any) {
        toast.error(`Failed to generate example: ${err.message}`);
      }
      return;
    }
    const example = generateExampleFile(preset);
    const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `lifeos-${preset}-example.json`);
    toast.success('Example file downloaded! Edit it with your data and import.');
  };

  // ---- Export with category picker ----

  const openCategoryPicker = (format: ExportFormat) => {
    if (!config) return;
    setPendingFormat(format);
    setSelectedEntities([...config.entities]);
    setShowCategoryPicker(true);
  };

  const toggleEntity = (entity: ExportableEntity) => {
    setSelectedEntities(prev =>
      prev.includes(entity) ? prev.filter(e => e !== entity) : [...prev, entity]
    );
  };

  const handleExport = async () => {
    if (!user || selectedEntities.length === 0) return;
    setShowCategoryPicker(false);
    setExporting(true);
    setExportProgress(0);

    try {
      const { blob, filename } = await exportData(
        preset,
        user.id,
        pendingFormat,
        selectedEntities,
        (entity, pct) => {
          setExportEntity(entity);
          setExportProgress(pct);
        }
      );
      downloadBlob(blob, filename);
      toast.success(`${displayLabel} exported as ${pendingFormat.toUpperCase()}`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
      setExportProgress(0);
      setExportEntity('');
    }
  };

  // ---- Import with conflict detection ----

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.name.endsWith('.json') && !file.name.endsWith('.xml') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select a JSON, XML, or Excel (.xlsx) file');
      return;
    }

    setImporting(true);
    setImportProgress(5);
    setImportEntity('Parsing file...');

    try {
      // Parse file - handle xlsx separately
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const payload = isXlsx ? await parseXlsxFile(file, preset) : await parseImportFile(file);

      if (!payload?.data || !payload?.exportType) {
        throw new Error('Invalid export file.');
      }

      const presetConfig = EXPORT_PRESETS[payload.exportType];
      if (!presetConfig) throw new Error(`Unknown export type: ${payload.exportType}`);

      setImportEntity('Building import preview...');
      setImportProgress(25);

      const preview = buildImportPreview(payload, user.id);
      setImportPreview(preview);
      setPendingPayload(preview.fixedPayload);
      setShowPreImportWizard(true);
      setImporting(false);
      setImportProgress(0);
      setImportEntity('');
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
      void trackProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.importFailed);
      setImporting(false);
      setImportProgress(0);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeImport = async (payload: any, resolution: ConflictResolution) => {
    if (!user) return;
    setShowConflict(false);
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const result = await importData(
        payload,
        user.id,
        (msg) => setImportEntity(msg),
        (pct) => setImportProgress(pct),
        resolution,
      );
      setImportResult(result);
      setShowResult(true);

      if (result.errors.length === 0) {
        toast.success(`Imported ${result.imported} items successfully`);
        void trackProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.importCompleted);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.warning(`Imported ${result.imported} items with ${result.errors.length} errors`);
        void trackProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.importFailed);
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
      void trackProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.importFailed);
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportEntity('');
      setPendingPayload(null);
      setImportPreview(null);
    }
  };

  const handleConflictResolve = () => {
    if (pendingPayload) {
      executeImport(pendingPayload, conflictResolution);
    }
  };

  const handlePreImportContinue = async () => {
    if (!pendingPayload || !user) return;

    setShowPreImportWizard(false);
    setImporting(true);
    setImportEntity('Checking for conflicts...');
    setImportProgress(15);

    try {
      const foundConflicts = await detectConflicts(pendingPayload, user.id);
      if (foundConflicts.length > 0) {
        setConflicts(foundConflicts);
        setShowConflict(true);
      } else {
        await executeImport(pendingPayload, 'overwrite');
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
      void trackProductAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.importFailed);
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportEntity('');
    }
  };

  const handleDownloadFixedPreview = () => {
    if (!importPreview?.fixedPayload) return;
    const blob = new Blob([JSON.stringify(importPreview.fixedPayload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `lifeos-${preset}-fixed-preview.json`);
    toast.success('Fixed preview JSON downloaded.');
  };

  const entityLabel = (e: string) => e.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <>
      {/* Main action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting ? 'Exporting...' : `Export ${displayLabel}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openCategoryPicker('json')}>
              <FileJson className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCategoryPicker('xml')}>
              <FileCode className="h-4 w-4 mr-2" />
              Export as XML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCategoryPicker('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing}>
          {importing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {importing ? 'Importing...' : `Import ${displayLabel}`}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" title="Download example import file">
              <FileDown className="h-4 w-4 mr-2" />
              Example File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownloadExample('json')}>
              <FileJson className="h-4 w-4 mr-2" />
              Example JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownloadExample('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Example Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <input ref={fileInputRef} type="file" accept=".json,.xml,.xlsx,.xls" className="hidden" onChange={handleFileChange} />

      {/* Export Category Picker */}
      <Dialog open={showCategoryPicker} onOpenChange={setShowCategoryPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Categories to Export</DialogTitle>
            <DialogDescription>Choose which data categories to include in your {pendingFormat.toUpperCase()} export.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {config?.entities.map(entity => (
              <div key={entity} className="flex items-center space-x-3">
                <Checkbox
                  id={`export-${entity}`}
                  checked={selectedEntities.includes(entity)}
                  onCheckedChange={() => toggleEntity(entity)}
                />
                <Label htmlFor={`export-${entity}`} className="cursor-pointer font-medium">
                  {entityLabel(entity)}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryPicker(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={selectedEntities.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export ({selectedEntities.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Progress Dialog */}
      <Dialog open={exporting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Exporting {displayLabel}
            </DialogTitle>
            <DialogDescription>
              {exportEntity ? `Processing: ${entityLabel(exportEntity)}` : 'Preparing export...'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Progress value={exportProgress} className="h-3" />
            <p className="text-xs text-muted-foreground text-right">{Math.round(exportProgress)}%</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pre-Import Wizard */}
      <Dialog open={showPreImportWizard} onOpenChange={setShowPreImportWizard}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pre-Import Validation Summary</DialogTitle>
            <DialogDescription>
              Review schema checks, auto-fixes, and remapped relationships before executing import.
            </DialogDescription>
          </DialogHeader>

          {importPreview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Schema validation summary</p>
                  <p className="text-sm font-medium">{importPreview.schemaSummary.entitiesDetected} entities, {importPreview.schemaSummary.rowsDetected} rows detected</p>
                  <div className="space-y-1 text-xs">
                    {importPreview.entityBreakdown.map((item) => (
                      <div key={item.entity} className="flex items-center justify-between gap-2">
                        <span>{entityLabel(item.entity)}</span>
                        <span className="text-muted-foreground">{item.rows} rows</span>
                      </div>
                    ))}
                  </div>
                  {importPreview.schemaSummary.missingEntities.length > 0 && (
                    <p className="text-xs text-warning mt-1">Missing entities: {importPreview.schemaSummary.missingEntities.map(entityLabel).join(', ')}</p>
                  )}
                  {importPreview.schemaSummary.invalidEntityShapes.length > 0 && (
                    <p className="text-xs text-destructive mt-1">Invalid shapes: {importPreview.schemaSummary.invalidEntityShapes.map(entityLabel).join(', ')}</p>
                  )}
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Auto-fix summary</p>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <span>{importPreview.idAutoConverted} IDs auto-converted</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <span>{importPreview.relationshipsRemapped} relationships remapped</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {importPreview.entityBreakdown.filter(item => item.idAutoConverted > 0 || item.relationshipsRemapped > 0).length === 0 ? (
                      <p className="text-muted-foreground">No ID or relationship fixes required.</p>
                    ) : (
                      importPreview.entityBreakdown
                        .filter(item => item.idAutoConverted > 0 || item.relationshipsRemapped > 0)
                        .map((item) => (
                          <div key={item.entity} className="flex items-center justify-between gap-2">
                            <span>{entityLabel(item.entity)}</span>
                            <span className="text-muted-foreground">
                              {item.idAutoConverted} IDs / {item.relationshipsRemapped} remaps
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">ID/FK remap preview</p>
                    <p className="text-xs text-muted-foreground">Highlighted device/support remaps appear first so you can verify dependency-heavy imports.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleDownloadFixedPreview}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Download fixed preview JSON
                  </Button>
                </div>

                {importPreview.idConversionDetails.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Auto-converted IDs</p>
                    <ScrollArea className="max-h-28">
                      <div className="space-y-1 text-xs">
                        {importPreview.idConversionDetails.slice(0, 50).map((item, idx) => (
                          <p key={idx}>
                            {entityLabel(item.entity)} #{item.rowIndex + 1}: {item.originalId} → {item.convertedId}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Relationship remaps</p>
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1 text-xs">
                      {(highlightedRemaps.length > 0 ? highlightedRemaps : importPreview.relationRemapDetails).length === 0 ? (
                        <p className="text-muted-foreground">No relationship remaps required.</p>
                      ) : (
                        (highlightedRemaps.length > 0 ? highlightedRemaps : importPreview.relationRemapDetails).map((item, idx) => (
                          <p key={idx}>
                            {entityLabel(item.entity)}.{item.fkColumn} → {entityLabel(item.targetEntity)} ({item.count})
                          </p>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {importPreview.rowRemapDetails.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Row-level remap examples</p>
                    <ScrollArea className="max-h-28">
                      <div className="space-y-1 text-xs">
                        {importPreview.rowRemapDetails.slice(0, 50).map((item, idx) => (
                          <p key={idx}>
                            {entityLabel(item.entity)} #{item.rowIndex + 1}: {item.fkColumn} {item.from} → {item.to}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">Row-level warning list</p>
                <ScrollArea className="max-h-40">
                  <div className="space-y-1 text-xs">
                    {importPreview.warnings.length === 0 ? (
                      <p className="text-muted-foreground">No row-level warnings detected.</p>
                    ) : (
                      importPreview.warnings.slice(0, 100).map((warning, idx) => (
                        <p key={idx} className="text-warning">
                          {entityLabel(warning.entity)} #{warning.rowIndex >= 0 ? warning.rowIndex + 1 : 'n/a'}: {warning.message}
                        </p>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Fixed preview JSON</p>
                    <p className="text-xs text-muted-foreground">This downloadable/exportable payload matches the exact data that will be imported.</p>
                  </div>
                  <Badge variant="secondary">Ready to import</Badge>
                </div>
                <ScrollArea className="max-h-52 rounded-md border bg-muted/30 p-3">
                  <pre className="text-[11px] leading-5 whitespace-pre-wrap break-all">{previewJsonSnippet}</pre>
                </ScrollArea>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPreImportWizard(false);
                setPendingPayload(null);
                setImportPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePreImportContinue}>Continue to Conflict Check</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Progress Dialog */}
      <Dialog open={importing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Importing Data
            </DialogTitle>
            <DialogDescription>{importEntity || 'Processing...'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Progress value={importProgress} className="h-3" />
            <p className="text-xs text-muted-foreground text-right">{Math.round(importProgress)}%</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={showConflict} onOpenChange={setShowConflict}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Duplicate Items Found
            </DialogTitle>
            <DialogDescription>
              {conflicts.length} existing item(s) were found that match items in your import file.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-48 rounded-md border p-3">
            <div className="space-y-2">
              {conflicts.slice(0, 20).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate mr-2">{c.existingName}</span>
                  <Badge variant="outline" className="shrink-0 text-xs">{entityLabel(c.entity)}</Badge>
                </div>
              ))}
              {conflicts.length > 20 && (
                <p className="text-xs text-muted-foreground">...and {conflicts.length - 20} more</p>
              )}
            </div>
          </ScrollArea>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-semibold">How do you want to handle duplicates?</Label>
            <div className="space-y-2">
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${conflictResolution === 'overwrite' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
                onClick={() => setConflictResolution('overwrite')}
              >
                <Replace className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">Overwrite existing</p>
                  <p className="text-xs text-muted-foreground">Replace existing items with imported data</p>
                </div>
              </div>
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${conflictResolution === 'skip' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
                onClick={() => setConflictResolution('skip')}
              >
                <SkipForward className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">Skip duplicates</p>
                  <p className="text-xs text-muted-foreground">Keep existing items, only import new ones</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConflict(false); setPendingPayload(null); }}>Cancel</Button>
            <Button onClick={handleConflictResolve}>
              {conflictResolution === 'overwrite' ? <Replace className="h-4 w-4 mr-2" /> : <SkipForward className="h-4 w-4 mr-2" />}
              {conflictResolution === 'overwrite' ? 'Overwrite & Import' : 'Skip & Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult?.errors.length ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <Check className="h-5 w-5 text-green-500" />
              )}
              Import Result
            </DialogTitle>
            <DialogDescription>
              {importResult?.imported || 0} items imported
              {importResult?.errors.length ? ` with ${importResult.errors.length} error(s)` : ' successfully'}
            </DialogDescription>
          </DialogHeader>
          {importResult?.errors.length ? (
            <div className="max-h-48 overflow-auto text-sm space-y-1">
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-destructive text-xs">{err}</p>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
