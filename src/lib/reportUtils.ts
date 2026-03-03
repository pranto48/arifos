import { format } from 'date-fns';

// ---- CSV Export ----
export function exportToCSV(headers: string[], rows: string[][], filename: string) {
  const bom = '\uFEFF';
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  downloadBlob(new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

// ---- Excel Export (TSV with .xls extension for universal compatibility) ----
export function exportToExcel(headers: string[], rows: string[][], filename: string) {
  const bom = '\uFEFF';
  const content = [
    headers.join('\t'),
    ...rows.map(row => row.map(cell => String(cell ?? '').replace(/\t/g, ' ')).join('\t'))
  ].join('\n');
  downloadBlob(new Blob([bom + content], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `${filename}.xls`);
}

// ---- Branded Print Report ----
export interface PrintReportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  summaryCards?: { label: string; value: string | number }[];
}

export function printBrandedReport(options: PrintReportOptions) {
  const { title, subtitle, headers, rows, summaryCards } = options;
  const dateStr = format(new Date(), 'dd MMM yyyy, hh:mm a');

  const summaryHtml = summaryCards?.length
    ? `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
        ${summaryCards.map(c => `
          <div style="flex:1;min-width:140px;padding:12px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">${c.label}</div>
            <div style="font-size:20px;font-weight:700;color:#0369a1;margin-top:4px">${c.value}</div>
          </div>
        `).join('')}
       </div>`
    : '';

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr>${headers.map(h => `<th style="padding:8px 10px;background:#0c4a6e;color:white;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
            ${row.map(cell => `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${cell ?? ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - LifeOS Report</title>
      <style>
        @media print { body { margin: 0; } @page { margin: 15mm; } }
        body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; }
      </style>
    </head>
    <body>
      <div style="border-bottom:3px solid #0c4a6e;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:10px;color:#0369a1;font-weight:700;letter-spacing:1px;text-transform:uppercase">LifeOS</div>
          <h1 style="margin:4px 0 0;font-size:22px;color:#0c4a6e">${title}</h1>
          ${subtitle ? `<p style="margin:2px 0 0;font-size:12px;color:#64748b">${subtitle}</p>` : ''}
        </div>
        <div style="text-align:right;font-size:11px;color:#94a3b8">
          <div>Generated: ${dateStr}</div>
          <div>Total Records: ${rows.length}</div>
        </div>
      </div>
      ${summaryHtml}
      ${tableHtml}
      <div style="margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center">
        LifeOS Report • ${dateStr} • Page 1
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
