import { useState, useRef, useCallback } from 'react';
import { Download, Upload, FileJson, FileCode, Loader2, Check, AlertTriangle, RefreshCw, SkipForward, Replace, FileDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  exportData,
  importData,
  parseImportFile,
  detectConflicts,
  downloadBlob,
  type ExportFormat,
  type ExportableEntity,
  EXPORT_PRESETS,
} from '@/lib/dataExportImport';

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
          id: 'example-task-id-1',
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
          id: 'example-cat-id-1',
          name: 'Example Category',
          color: '#3b82f6',
          icon: 'Briefcase',
          category_type: 'office',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'notes':
        exampleData.notes = [{
          id: 'example-note-id-1',
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
          id: 'example-unit-id-1',
          name: 'Example Unit',
          description: 'Example organizational unit',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'support_departments':
        exampleData.support_departments = [{
          id: 'example-dept-id-1',
          name: 'Example Department',
          unit_id: 'example-unit-id-1',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'support_users':
        exampleData.support_users = [{
          id: 'example-suser-id-1',
          name: 'John Doe',
          email: 'john@example.com',
          department_id: 'example-dept-id-1',
          designation: 'Engineer',
          is_active: true,
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'device_categories':
        exampleData.device_categories = [{
          id: 'example-dcat-id-1',
          name: 'Laptop',
          description: 'Portable computers',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'device_inventory':
        exampleData.device_inventory = [{
          id: 'example-device-id-1',
          device_name: 'Dell Latitude 5540',
          serial_number: 'SN-EXAMPLE-001',
          status: 'available',
          category_id: 'example-dcat-id-1',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'projects':
        exampleData.projects = [{
          id: 'example-project-id-1',
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
          id: 'example-profile-id-1',
          full_name: 'Example User',
          email: 'user@example.com',
          user_id: 'YOUR_USER_ID',
        }];
        break;
      case 'user_roles':
        exampleData.user_roles = [{
          id: 'example-role-id-1',
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
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('overwrite');
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = EXPORT_PRESETS[preset];
  const displayLabel = label || config?.label || preset;

  // ---- Download example file ----
  const handleDownloadExample = () => {
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

    if (!file.name.endsWith('.json') && !file.name.endsWith('.xml')) {
      toast.error('Please select a JSON or XML file');
      return;
    }

    setImporting(true);
    setImportProgress(5);
    setImportEntity('Parsing file...');

    try {
      // Parse file once, reuse payload throughout
      const payload = await parseImportFile(file);

      if (!payload?.data || !payload?.exportType) {
        throw new Error('Invalid export file.');
      }

      const presetConfig = EXPORT_PRESETS[payload.exportType];
      if (!presetConfig) throw new Error(`Unknown export type: ${payload.exportType}`);

      setImportEntity('Checking for conflicts...');
      setImportProgress(15);

      // Parallel conflict detection
      const foundConflicts = await detectConflicts(payload, user.id);

      if (foundConflicts.length > 0) {
        setConflicts(foundConflicts);
        setPendingPayload(payload);
        setShowConflict(true);
        setImporting(false);
        setImportProgress(0);
        setImportEntity('');
      } else {
        await executeImport(payload, 'overwrite');
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
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
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.warning(`Imported ${result.imported} items with ${result.errors.length} errors`);
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportEntity('');
      setPendingPayload(null);
    }
  };

  const handleConflictResolve = () => {
    if (pendingPayload) {
      executeImport(pendingPayload, conflictResolution);
    }
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

        <Button variant="ghost" size="sm" onClick={handleDownloadExample} title="Download example import file">
          <FileDown className="h-4 w-4 mr-2" />
          Example File
        </Button>
      </div>

      <input ref={fileInputRef} type="file" accept=".json,.xml" className="hidden" onChange={handleFileChange} />

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
