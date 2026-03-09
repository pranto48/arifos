import { Download, Printer, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { exportToCSV, exportToExcel, printBrandedReport, PrintReportOptions } from '@/lib/reportUtils';
import { AiReportSummary } from './AiReportSummary';

interface ReportActionsProps {
  headers: string[];
  rows: string[][];
  filename: string;
  title: string;
  subtitle?: string;
  summaryCards?: { label: string; value: string | number }[];
  variant?: 'default' | 'compact';
  showAi?: boolean;
}

export function ReportActions({ headers, rows, filename, title, subtitle, summaryCards, variant = 'default', showAi = true }: ReportActionsProps) {
  const handleCSV = () => exportToCSV(headers, rows, filename);
  const handleExcel = () => exportToExcel(headers, rows, filename);
  const handlePrint = () => printBrandedReport({ title, subtitle, headers, rows, summaryCards } as PrintReportOptions);

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {showAi && rows.length > 0 && (
          <AiReportSummary title={title} headers={headers} rows={rows} summaryCards={summaryCards} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCSV}>
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
      </div>
      {showAi && rows.length > 0 && (
        <AiReportSummary title={title} headers={headers} rows={rows} summaryCards={summaryCards} />
      )}
    </div>
  );
}
