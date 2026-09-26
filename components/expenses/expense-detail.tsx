'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Trash2,
  Loader2,
  Receipt,
  DollarSign,
  Calendar,
  Building2,
  FolderOpen,
  Tag,
  CheckCircle2,
  XCircle,
  Send,
  Clock,
  UserCog,
} from 'lucide-react';
import type {
  ExpenseWithRelations,
  ExpenseStatus,
  ExpensePaymentMethod,
} from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { deleteExpense } from '@/app/actions/expenses';
import {
  submitExpense,
  approveExpense,
  rejectExpense,
} from '@/app/actions/approvals';

interface ExpenseDetailProps {
  expense: ExpenseWithRelations;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

const statusColors: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  submitted: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  approved: 'bg-green-100 text-green-700 hover:bg-green-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  void: 'bg-zinc-200 text-zinc-600 hover:bg-zinc-200',
};

const statusLabels: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  void: 'Void',
};

const methodLabels: Record<ExpensePaymentMethod, string> = {
  cash: 'Cash',
  bank_deposit: 'Bank Deposit',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  check: 'Check',
  other: 'Other',
};

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(v);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ExpenseDetail({
  expense,
  canEdit,
  canDelete,
  canApprove,
}: ExpenseDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteExpense(expense.id);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push('/expenses');
      }
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitExpense(expense.id);
      if (!result.success) setError(result.error);
      else router.refresh();
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveExpense(expense.id, approveNotes || undefined);
      if (!result.success) setError(result.error);
      else {
        setApproveDialogOpen(false);
        setApproveNotes('');
        router.refresh();
      }
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectExpense(expense.id, rejectReason);
      if (!result.success) setError(result.error);
      else {
        setRejectDialogOpen(false);
        setRejectReason('');
        router.refresh();
      }
    });
  }

  const canSubmit = expense.status === 'draft';
  const canApproveAction =
    canApprove &&
    ['submitted', 'pending'].includes(expense.status);
  const canRejectAction =
    canApprove &&
    ['submitted', 'pending'].includes(expense.status);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-orange-50">
            <Receipt className="h-7 w-7 text-orange-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {formatCurrency(Number(expense.amount))}
              </h2>
              <Badge className={statusColors[expense.status]} variant="outline">
                {statusLabels[expense.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{expense.expense_code}</span>
              <span>·</span>
              <span>{formatDate(expense.expense_date)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSubmit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit for Approval
            </Button>
          )}

          {canApproveAction && (
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" disabled={isPending}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <Label>Approval Notes (optional)</Label>
                  <Textarea
                    placeholder="Add any notes about this approval..."
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setApproveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleApprove} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Approval
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canRejectAction && (
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <Label>Rejection Reason</Label>
                  <Textarea
                    placeholder="Explain why this expense is being rejected..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRejectDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isPending || !rejectReason.trim()}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Rejection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canEdit && expense.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/expenses/${expense.id}/edit`)}
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
                  <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete expense{' '}
                    {expense.expense_code}? This action cannot be undone.
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
      </div>

      {/* Approval status banner */}
      {expense.status === 'rejected' && expense.rejection_reason && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Rejected:</span>{' '}
            {expense.rejection_reason}
            {expense.rejected_by_email && (
              <span className="ml-1 text-xs">
                by {expense.rejected_by_email} on {formatDateTime(expense.rejected_at)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {expense.status === 'approved' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <span className="font-semibold">Approved</span>
            {expense.approved_by_email && (
              <span className="ml-1 text-xs">
                by {expense.approved_by_email} on {formatDateTime(expense.approved_at)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {expense.status === 'submitted' && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <span className="font-semibold">Submitted for approval</span>
            {expense.submitted_by_email && (
              <span className="ml-1 text-xs">
                by {expense.submitted_by_email} on {formatDateTime(expense.submitted_at)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Detail grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Expense Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(expense.expense_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Amount</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(Number(expense.amount))}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Category</p>
                <p className="text-sm text-muted-foreground">
                  {expense.category_name}
                </p>
              </div>
            </div>

            {expense.invoice_number && (
              <div>
                <p className="text-sm font-medium">Invoice Number</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {expense.invoice_number}
                </p>
              </div>
            )}

            {expense.payment_method && (
              <div>
                <p className="text-sm font-medium">Payment Method</p>
                <p className="text-sm text-muted-foreground">
                  {methodLabels[expense.payment_method]}
                </p>
              </div>
            )}

            {expense.description && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Description</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {expense.description}
                </p>
              </div>
            )}

            {expense.notes && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Notes</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {expense.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related & Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expense.supplier_name && (
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Supplier</p>
                  <p className="text-sm text-muted-foreground">
                    {expense.supplier_name}
                  </p>
                </div>
              </div>
            )}

            {expense.project_name && (
              <div className="flex items-start gap-3">
                <FolderOpen className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Project</p>
                  {expense.project_id && (
                    <button
                      onClick={() =>
                        router.push(`/projects/${expense.project_id}`)
                      }
                      className="text-sm text-primary hover:underline"
                    >
                      {expense.project_name}
                    </button>
                  )}
                  {expense.project_code && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {expense.project_code}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <div className="flex items-start gap-3">
                <UserCog className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Submitted By</p>
                  <p className="text-sm text-muted-foreground">
                    {expense.submitted_by_email || '-'}
                    {expense.submitted_at && (
                      <span className="ml-1 text-xs">
                        on {formatDateTime(expense.submitted_at)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {expense.approved_by_email && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Approved By</p>
                    <p className="text-sm text-muted-foreground">
                      {expense.approved_by_email}
                      {expense.approved_at && (
                        <span className="ml-1 text-xs">
                          on {formatDateTime(expense.approved_at)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {expense.rejected_by_email && (
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Rejected By</p>
                    <p className="text-sm text-muted-foreground">
                      {expense.rejected_by_email}
                      {expense.rejected_at && (
                        <span className="ml-1 text-xs">
                          on {formatDateTime(expense.rejected_at)}
                        </span>
                      )}
                    </p>
                    {expense.rejection_reason && (
                      <p className="mt-1 text-sm text-red-600">
                        {expense.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
