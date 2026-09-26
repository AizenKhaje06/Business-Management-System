import * as XLSX from 'xlsx';

export interface ExportMeta {
  title: string;
  filters: Array<{ label: string; value: string }>;
  totals: Array<{ label: string; value: string }>;
}

export interface ExportColumn {
  header: string;
  key: string;
  align?: 'left' | 'right';
  format?: 'currency' | 'date' | 'text';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getDateString(): string {
  return new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCsv(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  meta: ExportMeta,
  fileName: string
): void {
  const lines: string[] = [];

  lines.push(`# ${meta.title}`);
  lines.push(`# Generated: ${getDateString()}`);
  if (meta.filters.length > 0) {
    lines.push(`# Filters: ${meta.filters.map((f) => `${f.label}=${f.value}`).join('; ')}`);
  }
  lines.push('');

  lines.push(columns.map((c) => escapeCsv(c.header)).join(','));
  for (const row of rows) {
    lines.push(
      columns
        .map((col) => {
          const val = row[col.key];
          if (col.format === 'currency' && typeof val === 'number') {
            return val.toFixed(2);
          }
          return escapeCsv(val);
        })
        .join(',')
    );
  }

  if (meta.totals.length > 0) {
    lines.push('');
    for (const t of meta.totals) {
      lines.push(`${escapeCsv(t.label)},${escapeCsv(t.value)}`);
    }
  }

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${fileName}.csv`);
}

export function exportXlsx(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  meta: ExportMeta,
  fileName: string
): void {
  const headerRow = columns.map((c) => c.header);
  const dataRows = rows.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      if (col.format === 'currency' && typeof val === 'number') {
        return Number(val.toFixed(2));
      }
      return val ?? '';
    })
  );

  const aoa: unknown[][] = [
    [meta.title],
    [`Generated: ${getDateString()}`],
    meta.filters.length > 0
      ? [`Filters: ${meta.filters.map((f) => `${f.label}=${f.value}`).join('; ')}`]
      : [],
    [],
    headerRow,
    ...dataRows,
  ];

  if (meta.totals.length > 0) {
    aoa.push([]);
    for (const t of meta.totals) {
      aoa.push([t.label, t.value]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map((c) => ({
    wch: Math.max(c.header.length, 15),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `${fileName}.xlsx`);
}

export function exportPdf(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  meta: ExportMeta,
  fileName: string
): void {
  const dateStr = getDateString();
  const filterStr =
    meta.filters.length > 0
      ? meta.filters.map((f) => `${f.label}: ${f.value}`).join('  |  ')
      : 'None';

  const tableHeader = columns
    .map(
      (c) =>
        `<th style="text-align:${c.align || 'left'};padding:6px 10px;border-bottom:2px solid #333;font-size:11px;">${c.header}</th>`
    )
    .join('');

  const tableRows = rows
    .map(
      (row) =>
        `<tr>` +
        columns
          .map((col) => {
            const val = row[col.key];
            let display: string;
            if (col.format === 'currency' && typeof val === 'number') {
              display = formatCurrency(val);
            } else if (col.format === 'date' && val) {
              display = new Date(String(val)).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            } else {
              display = String(val ?? '-');
            }
            return `<td style="text-align:${col.align || 'left'};padding:5px 10px;border-bottom:1px solid #eee;font-size:11px;">${display.replace(/</g, '&lt;')}</td>`;
          })
          .join('') +
        `</tr>`
    )
    .join('');

  const totalsRows = meta.totals
    .map(
      (t) =>
        `<tr><td colspan="${Math.max(columns.length - 1, 1)}" style="text-align:right;padding:6px 10px;font-weight:bold;border-top:2px solid #333;font-size:11px;">${t.label}</td><td style="text-align:right;padding:6px 10px;font-weight:bold;border-top:2px solid #333;font-size:11px;">${t.value}</td></tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${meta.title}</title>
<style>
  @page { margin: 1in; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; margin: 0; padding: 20px; }
  .header { margin-bottom: 20px; }
  .title { font-size: 20px; font-weight: bold; margin: 0 0 4px 0; }
  .meta { font-size: 11px; color: #666; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  .footer { margin-top: 24px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <p class="title">${meta.title}</p>
    <p class="meta">Generated: ${dateStr}</p>
    <p class="meta">Filters: ${filterStr}</p>
  </div>
  <table>
    <thead><tr>${tableHeader}</tr></thead>
    <tbody>${tableRows}</tbody>
    <tfoot>${totalsRows}</tfoot>
  </table>
  <div class="footer">Generated by Business Management System</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  triggerDownload(blob, `${fileName}.html`);
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
