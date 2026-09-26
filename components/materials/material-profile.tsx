'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Trash2,
  Loader2,
  Package,
  DollarSign,
  Building2,
  ShoppingCart,
} from 'lucide-react';
import type {
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deleteMaterial } from '@/app/actions/suppliers';

interface MaterialProfileProps {
  material: MaterialWithSupplier;
  purchases: MaterialPurchaseWithRelations[];
  canEdit: boolean;
  canDelete: boolean;
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

export function MaterialProfile({
  material,
  purchases,
  canEdit,
  canDelete,
}: MaterialProfileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMaterial(material.id);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push('/materials');
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-teal-50">
            <Package className="h-7 w-7 text-teal-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {material.name}
              </h2>
              <Badge
                variant="outline"
                className={
                  material.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }
              >
                {material.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{material.material_code}</span>
              {material.sku && (
                <>
                  <span>·</span>
                  <span>SKU: {material.sku}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/materials/${material.id}/edit`)}
                disabled={isPending}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Material</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {material.name}? This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Material Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Default Cost</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(material.unit_cost)}
                  {material.unit && ` per ${material.unit}`}
                </p>
              </div>
            </div>
            {material.supplier_name && (
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Supplier</p>
                  {material.supplier_id && (
                    <button
                      onClick={() =>
                        router.push(`/suppliers/${material.supplier_id}`)
                      }
                      className="text-sm text-primary hover:underline"
                    >
                      {material.supplier_name}
                    </button>
                  )}
                </div>
              </div>
            )}
            {material.description && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Description</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {material.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              Recent Purchases ({purchases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No purchases recorded for this material.
              </p>
            ) : (
              <div className="space-y-2">
                {purchases.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium font-mono">
                        {p.purchase_code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.purchase_date)}
                        {p.supplier_name && ` · ${p.supplier_name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(Number(p.total_cost))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Number(p.quantity)} {material.unit || 'units'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
