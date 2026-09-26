'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createExpense, updateExpense } from '@/app/actions/expenses';
import type {
  Expense,
  ExpenseStatus,
  ExpensePaymentMethod,
} from '@/types/expense';

interface CategoryOption {
  id: string;
  name: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface ProjectOption {
  id: string;
  name: string;
  project_code: string | null;
}

interface ExpenseFormProps {
  mode: 'create' | 'edit';
  expense?: Expense;
  categories: CategoryOption[];
  suppliers: SupplierOption[];
  projects: ProjectOption[];
}

const statusOptions: { value: ExpenseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'void', label: 'Void' },
];

const methodOptions: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_deposit', label: 'Bank Deposit' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

export function ExpenseForm({
  mode,
  expense,
  categories,
  suppliers,
  projects,
}: ExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [expenseDate, setExpenseDate] = useState(
    expense?.expense_date ?? new Date().toISOString().split('T')[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    expense?.invoice_number ?? ''
  );
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? '');
  const [projectId, setProjectId] = useState(expense?.project_id ?? '');
  const [supplierId, setSupplierId] = useState(expense?.supplier_id ?? '');
  const [amount, setAmount] = useState(
    expense?.amount != null ? String(expense.amount) : ''
  );
  const [description, setDescription] = useState(expense?.description ?? '');
  const [status, setStatus] = useState<ExpenseStatus>(
    expense?.status ?? 'draft'
  );
  const [method, setMethod] = useState<ExpensePaymentMethod | ''>(
    (expense?.payment_method as ExpensePaymentMethod) ?? ''
  );
  const [notes, setNotes] = useState(expense?.notes ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!expenseDate) {
      setError('Expense date is required.');
      return;
    }

    startTransition(async () => {
      const payload = {
        expense_date: expenseDate,
        invoice_number: invoiceNumber.trim() || undefined,
        category_id: categoryId,
        project_id: projectId || undefined,
        supplier_id: supplierId || undefined,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        status,
        payment_method: method || undefined,
        notes: notes.trim() || undefined,
      };

      const result =
        mode === 'create'
          ? await createExpense(payload)
          : await updateExpense({ id: expense!.id, ...payload });

      if (!result.success) {
        setError(result.error);
      } else if (mode === 'create' && result.data) {
        const created = result.data as { id: string };
        router.push(`/expenses/${created.id}`);
      } else {
        router.push(`/expenses/${expense!.id}`);
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
          <Label htmlFor="expense_date">Expense Date *</Label>
          <Input
            id="expense_date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice_number">Invoice Number</Label>
          <Input
            id="invoice_number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="INV-2026-001"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
                  {p.project_code && ` (${p.project_code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ExpenseStatus)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={method || 'none'}
            onValueChange={(v) =>
              setMethod(v === 'none' ? '' : (v as ExpensePaymentMethod))
            }
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this expense for?"
          rows={2}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
          disabled={isPending}
        />
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
        <Button
          type="submit"
          disabled={isPending || !categoryId || !amount || !expenseDate}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {mode === 'create' ? 'Record Expense' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
