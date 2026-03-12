

## Plan: Excel (.xlsx) Import/Export for Device Inventory & Support Users

### Build Error Fix
The `send-email-otp` edge function uses `import { Resend } from "npm:resend@2.0.0"` which fails. Will switch to the ESM-compatible import pattern used by other edge functions.

### Excel Import/Export Implementation

**Approach**: Add a lightweight XLSX generation/parsing library. Since we can't add npm packages in plan mode, we'll implement a pure-JS solution using the existing Web APIs to create valid `.xlsx` files (which are ZIP archives of XML files) and parse incoming `.xlsx` files.

**However**, building a full XLSX parser from scratch is complex. Instead, the plan will:

1. **Export as XLSX**: Generate CSV-compatible Excel files using the `.xlsx` extension with proper UTF-8 BOM and tab-separated values that Excel opens natively. Actually, we'll generate proper CSV files with `.xlsx`-friendly formatting.

2. **Better approach**: Use a minimal XLSX builder that creates proper Office Open XML format using JSZip-like approach, OR simply use the already-working CSV export pattern and extend it to XLSX-compatible format.

**Revised approach - most practical**: 
- Add `xlsx` npm package (SheetJS community edition) for proper .xlsx read/write
- This is the standard approach for browser-based Excel file handling

### Changes

#### 1. Fix Build Error
- **`supabase/functions/send-email-otp/index.ts`**: Change `npm:resend@2.0.0` to `https://esm.sh/resend@2.0.0`

#### 2. Add XLSX Package
- Install `xlsx` (SheetJS) package for Excel file handling

#### 3. Update `src/lib/dataExportImport.ts`
- Add `ExportFormat` type to include `'xlsx'`
- Add `exportToXlsx()` function that converts entity data into a multi-sheet workbook
- Add `parseXlsxFile()` function that reads .xlsx and converts sheets back to the standard import payload format
- Each entity (e.g., `device_inventory`, `support_users`) becomes a separate sheet in the workbook

#### 4. Update `src/components/shared/DataExportImportButton.tsx`
- Add "Export as Excel" option in the export dropdown
- Add "Download Example (.xlsx)" button that generates an example Excel file with headers and sample rows
- Update file input to accept `.xlsx` files alongside `.json` and `.xml`
- Route `.xlsx` files through the new XLSX parser

#### 5. Example File Generation
- `generateExampleXlsx(preset)`: Creates a workbook with one sheet per entity, containing:
  - Header row with all column names
  - 1-2 example data rows with realistic sample data
  - Column headers match the database schema exactly
- For **devices**: sheets for `device_categories`, `device_suppliers`, `device_inventory`, `device_service_history`
- For **support_users**: sheets for `support_units`, `support_departments`, `support_users`

#### 6. Docker Backend Support
- Update `docker/backend/server.js` to handle XLSX imports if needed (the frontend handles parsing, so no backend changes needed)

### Data Flow
```text
Export:  DB → fetch entities → build XLSX workbook (multi-sheet) → download .xlsx
Import:  .xlsx file → parse sheets → map to {exportType, data: {entity: rows[]}} → existing import pipeline
Example: Generate workbook with headers + sample rows → download .xlsx
```

### Sheet Mapping
- Device preset: Sheet "device_categories" | "device_suppliers" | "device_inventory" | "device_service_history"
- Support preset: Sheet "support_units" | "support_departments" | "support_users"
- Each sheet name = entity name, columns = database columns

