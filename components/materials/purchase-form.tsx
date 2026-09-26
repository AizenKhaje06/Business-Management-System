'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPurchase } from '@/app/actions/suppliers';

interface PurchaseFormProps {
  suppliers: Array<{ id: string; name: string }>;
  materials: Array<{
    id: string;
    name: string;
    material_code: string | null;
    unit: string | null;
    unit_cost: number | null;
  }>;
  projects: Array<{ id: string; name: string }>;
}

const methodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_deposit', label: 'Bank Deposit' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

export function PurchaseForm({
  suppliers,
  materials,
  projects,
}: PurchaseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const selectedMaterial = materials.find((m) => m.id === materialId);
  const materialUnit = selectedMaterial?.unit || 'units';

  function handleMaterialSelect(id: string) {
    setMaterialId(id);
    const mat = materials.find((m) => m.id === id);
    if (mat?.unit_cost && !unitCost) {
      setUnitCost(String(mat.unit_cost));
    }
  }

  const totalCost = useMemo(() => {
    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);
    if (isNaN(qty) || isNaN(cost) || qty <= 0 || cost < 0) return null;
    return (qty * cost).toFixed(2);
  }, [quantity, unitCost]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError('Please select a supplier.');
      return;
    }
    if (!materialId) {
      setError('Please select a material.');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (!unitCost || parseFloat(unitCost) < 0) {
      setError('Unit cost is required.');
      return;
    }
    if (!purchaseDate) {
      setError('Purchase date is required.');
      return;
    }

    startTransition(async () => {
      const result = await createPurchase({
        project_id: projectId || undefined,
        supplier_id: supplierId,
        material_id: materialId,
        purchase_date: purchaseDate,
        quantity: parseFloat(quantity),
        unit_cost: parseFloat(unitCost),
        invoice_number: invoiceNumber.trim() || undefined,
        payment_method: paymentMethod || undefined,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
      } else {
        router.push('/materials');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Supplier *</Label>
          <Select
            value={supplierId}
            onValueChange={setSupplierId}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Material *</Label>
          <Select
            value={materialId}
            onValueChange={handleMaterialSelect}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent>
              {materials.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                  {m.material_code && ` (${m.material_code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Project</Label>
          <Select
            value={projectId || 'none'}
            onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Not specified —</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase_date">Purchase Date *</Label>
          <Input
            id="purchase_date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quantity">
            Quantity *{' '}
            {materialUnit && (
              <span className="text-muted-foreground text-xs">
                (in {materialUnit})
              </span>
            )}
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            min="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit_cost">Unit Cost *</Label>
          <Input
            id="unit_cost"
            type="number"
            step="0.01"
            min="0"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="0.00"
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoice_number">Invoice Number</Label>
          <Input
            id="invoice_number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="INV-001"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={paymentMethod || 'none'}
            onValueChange={(v) => setPaymentMethod(v === 'none' ? '' : v)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Not specified —</SelectItem>
              {methodOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </div>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            Total Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {quantity || '0'} {materialUnit} x{' '}
                {unitCost
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(parseFloat(unitCost) || 0)
                  : '$0.00'}
              </span>
              <span className="text-2xl font-bold">
                {totalCost !== null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(parseFloat(totalCost))
                  : '$0.00'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Total = Quantity x Unit Cost (calculated server-side for accuracy)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            isPending || !supplierId || !materialId || !quantity || !unitCost
          }
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Record Purchase
        </Button>
      </div>
    </form>
  );
}
