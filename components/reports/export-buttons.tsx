'use client';

import { Download, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  exportCsv,
  exportXlsx,
  exportPdf,
  type ExportColumn,
  type ExportMeta,
} from '@/lib/export-utils';
import { logExport } from '@/app/actions/audit';

interface ExportButtonsProps {
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  meta: ExportMeta;
  fileName: string;
  entityType?: string;
}

export function ExportButtons({
  columns,
  rows,
  meta,
  fileName,
  entityType = 'report',
}: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              exportCsv(columns, rows, meta, fileName);
              logExport(entityType, 'csv', fileName);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              exportXlsx(columns, rows, meta, fileName);
              logExport(entityType, 'xlsx', fileName);
            }}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel (XLSX)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              exportPdf(columns, rows, meta, fileName);
              logExport(entityType, 'pdf', fileName);
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-1.5 h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
