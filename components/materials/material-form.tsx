'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
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
import { createMaterial, updateMaterial } from '@/app/actions/suppliers';
import type { MaterialWithSupplier } from '@/types/supplier';

interface MaterialFormProps {
  mode: 'create' | 'edit';
  material?: MaterialWithSupplier;
  suppliers: Array<{ id: string; name: string }>;
}

export function MaterialForm({ mode, material, suppliers }: MaterialFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(material?.name ?? '');
  const [description, setDescription] = useState(material?.description ?? '');
  const [unit, setUnit] = useState(material?.unit ?? '');
  const [unitCost, setUnitCost] = useState(
    material?.unit_cost != null ? String(material.unit_cost) : ''
  );
  const [supplierId, setSupplierId] = useState(material?.supplier_id ?? '');
  const [isActive, setIsActive] = useState(material?.is_active ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Material name is required.');
      return;
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        unit: unit.trim() || undefined,
        unit_cost: unitCost ? parseFloat(unitCost) : undefined,
        supplier_id: supplierId || undefined,
        is_active: isActive,
      };

      const result =
        mode === 'create'
          ? await createMaterial(payload)
          : await updateMaterial({ id: material!.id, ...payload });

      if (!result.success) {
        setError(result.error);
      } else if (mode === 'create' && result.data) {
        router.push(`/materials/${(result.data as { id: string }).id}`);
      } else {
        router.push(`/materials/${material!.id}`);
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

      <div className="space-y-2">
        <Label htmlFor="name">Material Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="pcs, kg, m, box..."
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit_cost">Default Cost</Label>
          <Input
            id="unit_cost"
            type="number"
            step="0.01"
            min="0"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="0.00"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Supplier</Label>
        <Select
          value={supplierId || 'none'}
          onValueChange={(v) => setSupplierId(v === 'none' ? '' : v)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Not specified —</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {mode === 'create' ? 'Create Material' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
