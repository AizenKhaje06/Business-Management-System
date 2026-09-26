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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPayment, updatePayment } from '@/app/actions/payments';
import type { Payment, PaymentStatus, PaymentMethod } from '@/types/payment';

interface ProjectOption {
  id: string;
  name: string;
  project_code: string | null;
  client_id: string;
  budget: number | null;
}

interface PaymentSummaryData {
  contract_amount: number | null;
  total_payments: number;
  outstanding_balance: number;
}

interface PaymentFormProps {
  mode: 'create' | 'edit';
  payment?: Payment;
  projects: ProjectOption[];
  initialSummary?: PaymentSummaryData;
}

const statusOptions: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
  { value: 'partial', label: 'Partial' },
  { value: 'cancelled', label: 'Cancelled' },
];

const methodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_deposit', label: 'Bank Deposit' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

function formatCurrency(v: number | null): string {
  if (v === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(v);
}

export function PaymentForm({
  mode,
  payment,
  projects,
  initialSummary,
}: PaymentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState(payment?.project_id ?? '');
  const [amount, setAmount] = useState(
    payment?.amount != null ? String(payment.amount) : ''
  );
  const [paymentDate, setPaymentDate] = useState(
    payment?.payment_date ?? new Date().toISOString().split('T')[0]
  );
  const [method, setMethod] = useState<PaymentMethod | ''>(
    (payment?.payment_method as PaymentMethod) ?? ''
  );
  const [status, setStatus] = useState<PaymentStatus>(
    payment?.status ?? 'pending'
  );
  const [reference, setReference] = useState(payment?.reference_number ?? '');
  const [notes, setNotes] = useState(payment?.notes ?? '');
  const [summary, setSummary] = useState<PaymentSummaryData | null>(
    initialSummary ?? null
  );
  const [loadingSummary, setLoadingSummary] = useState(false);

  async function loadSummary(pid: string) {
    if (!pid) return;
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/payments/summary?projectId=${pid}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json);
      }
    } finally {
      setLoadingSummary(false);
    }
  }

  function handleProjectChange(pid: string) {
    setProjectId(pid);
    setSummary(null);
    loadSummary(pid);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!projectId) {
      setError('Please select a project.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!paymentDate) {
      setError('Payment date is required.');
      return;
    }

    startTransition(async () => {
      const payload = {
        project_id: projectId,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_method: method || undefined,
        status,
        reference_number: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const result =
        mode === 'create'
          ? await createPayment(payload)
          : await updatePayment({ id: payment!.id, ...payload });

      if (!result.success) {
        setError(result.error);
      } else if (mode === 'create' && result.data) {
        const created = result.data as { id: string };
        router.push(`/payments/${created.id}`);
      } else {
        router.push(`/payments/${payment!.id}`);
      }
    });
  }

  const selectedProject = projects.find((p) => p.id === projectId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select
            value={projectId}
            onValueChange={handleProjectChange}
            disabled={isPending || mode === 'edit'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.project_code && ` (${p.project_code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_date">Payment Date *</Label>
          <Input
            id="payment_date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            disabled={isPending}
          />
        </div>
      </div>

      {/* Project financial summary */}
      {(summary || loadingSummary) && (
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedProject?.name} — Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {loadingSummary ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            ) : summary ? (
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4">
                <div>
                  <p className="text-muted-foreground">Contract Amount</p>
                  <p className="font-semibold">
                    {formatCurrency(summary.contract_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Paid</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(summary.total_payments)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outstanding</p>
                  <p className="font-semibold text-amber-600">
                    {formatCurrency(summary.outstanding_balance)}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as PaymentStatus)}
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={method || 'none'}
            onValueChange={(v) =>
              setMethod(v === 'none' ? '' : (v as PaymentMethod))
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

        <div className="space-y-2">
          <Label htmlFor="reference">Reference Number</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Cheque no., transaction ID..."
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
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
          disabled={isPending || !projectId || !amount || !paymentDate}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {mode === 'create' ? 'Record Payment' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
