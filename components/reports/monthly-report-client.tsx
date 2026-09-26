'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportButtons } from '@/components/reports/export-buttons';
import type { ExportColumn, ExportMeta } from '@/lib/export-utils';
import type { MonthlyReportData } from '@/app/actions/reports';

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface MonthlyReportClientProps {
  data: MonthlyReportData;
  canView: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const exportColumns: ExportColumn[] = [
  { header: 'Month', key: 'month', align: 'left' },
  { header: 'Total Input', key: 'input', align: 'right', format: 'currency' },
  { header: 'Total Output', key: 'output', align: 'right', format: 'currency' },
  { header: 'Difference', key: 'difference', align: 'right', format: 'currency' },
];

export function MonthlyReportClient({
  data,
  canView,
}: MonthlyReportClientProps) {
  const { rows, grossInput, grossOutput, netTotal, availableYears } = data;
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const filteredRows = useMemo(() => {
    if (!appliedFrom && !appliedTo) return rows;
    return rows.map((row) => {
      const monthNum = MONTH_ABBR.indexOf(row.label.slice(0, 3));
      const yearNum = new Date().getFullYear();
      const monthStart = new Date(yearNum, monthNum, 1);
      const monthEnd = new Date(yearNum, monthNum + 1, 0, 23, 59, 59);
      let visible = true;
      if (appliedFrom) {
        const from = new Date(appliedFrom);
        if (monthEnd < from) visible = false;
      }
      if (appliedTo) {
        const to = new Date(appliedTo);
        if (monthStart > to) visible = false;
      }
      return visible ? row : { ...row, input: 0, output: 0, difference: 0, _hidden: true };
    });
  }, [rows, appliedFrom, appliedTo]);

  const filteredGrossInput = filteredRows.reduce((s, r) => s + r.input, 0);
  const filteredGrossOutput = filteredRows.reduce((s, r) => s + r.output, 0);
  const filteredNetTotal = filteredGrossInput - filteredGrossOutput;

  const handleApplyFilter = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedFrom('');
    setAppliedTo('');
  };

  if (!canView) {
    return (
      <EmptyState
        title="Access Denied"
        description="You do not have permission to view reports."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button onClick={handleApplyFilter} size="sm">
              Apply Filter
            </Button>
            <Button onClick={handleClearFilter} size="sm" variant="outline">
              Clear
            </Button>
            <div className="flex-1" />
            <ExportButtons
              columns={exportColumns}
              rows={filteredRows.map((r) => ({
                month: r.label,
                input: r.input,
                output: r.output,
                difference: r.difference,
              }))}
              meta={{
                title: 'Monthly Financial Report',
                filters: [
                  ...(appliedFrom ? [{ label: 'Date From', value: appliedFrom }] : []),
                  ...(appliedTo ? [{ label: 'Date To', value: appliedTo }] : []),
                ],
                totals: [
                  { label: 'Gross Input', value: formatCurrency(filteredGrossInput) },
                  { label: 'Gross Output', value: formatCurrency(filteredGrossOutput) },
                  { label: 'Net Total', value: formatCurrency(filteredNetTotal) },
                ],
              }}
              fileName="monthly-financial-report"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Input
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(filteredGrossInput)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total payments received
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Output
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(filteredGrossOutput)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total approved expenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Total
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${
                filteredNetTotal >= 0
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {formatCurrency(filteredNetTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Input minus output
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
          <div className="flex items-center gap-2 print:hidden">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {availableYears.length} year{availableYears.length !== 1 ? 's' : ''} of data
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Month</TableHead>
                <TableHead className="text-right">Total Input</TableHead>
                <TableHead className="text-right">Total Output</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const isHidden = (row as MonthlyReportData['rows'][number] & { _hidden?: boolean })._hidden;
                return (
                  <TableRow
                    key={row.month}
                    className={isHidden ? 'opacity-30' : ''}
                  >
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.input)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.output)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        row.difference >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(row.difference)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell>Gross Total</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(filteredGrossInput)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(filteredGrossOutput)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    filteredNetTotal >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(filteredNetTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
