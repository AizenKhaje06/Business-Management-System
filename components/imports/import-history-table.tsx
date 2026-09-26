'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Upload,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import type { ImportHistoryEntry } from '@/lib/import-config';

interface ImportHistoryTableProps {
  history: ImportHistoryEntry[];
}

const statusConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string }
> = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-700',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'bg-rose-100 text-rose-700',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    color: 'bg-gray-100 text-gray-700',
  },
};

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ImportHistoryTable({ history }: ImportHistoryTableProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={Upload}
        title="No imports yet"
        description="Your import history will appear here once you start importing data."
        action={
          <Button asChild size="sm">
            <Link href="/import">Start an Import</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Valid</TableHead>
              <TableHead className="text-right">Invalid</TableHead>
              <TableHead className="text-right">Duplicates</TableHead>
              <TableHead className="text-right">Imported</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => {
              const config = statusConfig[entry.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {entry.file_name}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">
                        {entry.file_type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {entry.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {entry.total_rows}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {entry.valid_rows}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600">
                    {entry.invalid_rows}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600">
                    {entry.duplicate_rows}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {entry.imported_rows}
                  </TableCell>
                  <TableCell>
                    <Badge className={config.color} variant="outline">
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(entry.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.imported_by_email || '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
