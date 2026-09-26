'use client';

import { useRouter } from 'next/navigation';
import {
  Pencil,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Package,
} from 'lucide-react';
import type {
  Supplier,
  MaterialWithSupplier,
  MaterialPurchaseWithRelations,
} from '@/types/supplier';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SupplierProfileProps {
  supplier: Supplier;
  materials: MaterialWithSupplier[];
  purchases: MaterialPurchaseWithRelations[];
  canEdit: boolean;
}

function formatCurrency(v: number | null): string {
  if (v === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(v));
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SupplierProfile({
  supplier,
  materials,
  purchases,
  canEdit,
}: SupplierProfileProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50">
            <Building2 className="h-7 w-7 text-blue-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {supplier.name}
              </h2>
              <Badge
                variant="outline"
                className={
                  supplier.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }
              >
                {supplier.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{supplier.supplier_code}</span>
              {supplier.contact_person && (
                <>
                  <span>·</span>
                  <span>{supplier.contact_person}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.email && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {supplier.email}
                  </p>
                </div>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    {supplier.phone}
                  </p>
                </div>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {supplier.address}
                    {(supplier.city || supplier.state) && <br />}
                    {[supplier.city, supplier.state, supplier.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                    {supplier.country && ` ${supplier.country}`}
                  </p>
                </div>
              </div>
            )}
            {supplier.website && (
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Website</p>
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {supplier.website}
                  </a>
                </div>
              </div>
            )}
            {supplier.tax_id && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tax ID</p>
                  <p className="text-sm text-muted-foreground">
                    {supplier.tax_id}
                  </p>
                </div>
              </div>
            )}
            {supplier.payment_terms && (
              <div>
                <p className="text-sm font-medium">Payment Terms</p>
                <p className="text-sm text-muted-foreground">
                  {supplier.payment_terms}
                </p>
              </div>
            )}
            {supplier.notes && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Notes</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {supplier.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Materials ({materials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No materials linked to this supplier.
              </p>
            ) : (
              <div className="space-y-2">
                {materials.slice(0, 10).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/materials/${m.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {m.material_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(m.unit_cost)}
                      </p>
                      {m.unit && (
                        <p className="text-xs text-muted-foreground">
                          per {m.unit}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {purchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.slice(0, 10).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.purchase_code}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(p.purchase_date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.material_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.project_name || '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {Number(p.quantity)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(Number(p.unit_cost))}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(Number(p.total_cost))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
