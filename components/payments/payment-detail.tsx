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
  CheckCircle2,
  XCircle,
  Send,
  Clock,
  UserCog,
  FileCheck2,
} from 'lucide-react';
import type {
  PaymentWithRelations,
  PaymentStatus,
  PaymentMethod,
} from '@/types/payment';
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
import { deletePayment } from '@/app/actions/payments';
import {
  approvePayment,
  rejectPayment,
  postPayment,
} from '@/app/actions/approvals';

interface PaymentDetailProps {
  payment: PaymentWithRelations;
  summary: {
    contract_amount: number | null;
    total_payments: number;
    outstanding_balance: number;
  };
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

const statusColors: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  approved: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  posted: 'bg-green-100 text-green-700 hover:bg-green-100',
  partial: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const statusLabels: Record<PaymentStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  posted: 'Posted',
  partial: 'Partial',
  cancelled: 'Cancelled',
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_deposit: 'Bank Deposit',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  check: 'Check',
  other: 'Other',
};

function formatCurrency(v: number | null): string {
  if (v === null) return '-';
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

export function PaymentDetail({
  payment,
  summary,
  canEdit,
  canDelete,
  canApprove,
}: PaymentDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deletePayment(payment.id);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push('/payments');
      }
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approvePayment(payment.id);
      if (!result.success) setError(result.error);
      else router.refresh();
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectPayment(payment.id, rejectReason);
      if (!result.success) setError(result.error);
      else {
        setRejectDialogOpen(false);
        setRejectReason('');
        router.refresh();
      }
    });
  }

  function handlePost() {
    setError(null);
    startTransition(async () => {
      const result = await postPayment(payment.id);
      if (!result.success) setError(result.error);
      else router.refresh();
    });
  }

  const canApproveAction =
    canApprove && payment.status === 'pending';
  const canRejectAction =
    canApprove && ['pending', 'approved'].includes(payment.status);
  const canPostAction =
    canApprove && payment.status === 'approved';

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
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-green-50">
            <Receipt className="h-7 w-7 text-green-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {formatCurrency(Number(payment.amount))}
              </h2>
              <Badge className={statusColors[payment.status]} variant="outline">
                {statusLabels[payment.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{payment.payment_code}</span>
              <span>·</span>
              <span>{formatDate(payment.payment_date)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApproveAction && (
            <Button variant="default" size="sm" onClick={handleApprove} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          )}

          {canPostAction && (
            <Button variant="default" size="sm" onClick={handlePost} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileCheck2 className="mr-2 h-4 w-4" />
              )}
              Post
            </Button>
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
                  <DialogTitle>Reject Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <Label>Rejection Reason</Label>
                  <Textarea
                    placeholder="Explain why this payment is being rejected..."
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

          {canEdit && payment.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/payments/${payment.id}/edit`)}
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
                  <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete payment{' '}
                    {payment.payment_code}? This action cannot be undone.
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
      {payment.status === 'cancelled' && payment.rejection_reason && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Rejected:</span>{' '}
            {payment.rejection_reason}
            {payment.rejected_by_email && (
              <span className="ml-1 text-xs">
                by {payment.rejected_by_email} on {formatDateTime(payment.rejected_at)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {payment.status === 'approved' && (
        <Alert className="border-blue-200 bg-blue-50">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <span className="font-semibold">Approved</span>
            {payment.approved_by_email && (
              <span className="ml-1 text-xs">
                by {payment.approved_by_email} on {formatDateTime(payment.approved_at)}
              </span>
            )}
            {!canPostAction && (
              <span className="ml-2 text-xs">— awaiting posting</span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {payment.status === 'posted' && (
        <Alert className="border-green-200 bg-green-50">
          <FileCheck2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <span className="font-semibold">Posted</span>
            {payment.posted_at && (
              <span className="ml-1 text-xs">
                on {formatDateTime(payment.posted_at)}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {payment.status === 'pending' && (
        <Alert className="border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            <span className="font-semibold">Pending approval</span>
            {payment.submitted_by_email && (
              <span className="ml-1 text-xs">
                submitted by {payment.submitted_by_email}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contract Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.contract_amount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_payments)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.outstanding_balance > 0
                  ? 'text-amber-600'
                  : 'text-green-600'
              }`}
            >
              {formatCurrency(summary.outstanding_balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Payment Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(payment.payment_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Amount</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(Number(payment.amount))}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Receipt className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Payment Method</p>
                <p className="text-sm text-muted-foreground">
                  {payment.payment_method
                    ? methodLabels[payment.payment_method]
                    : 'Not specified'}
                </p>
              </div>
            </div>

            {payment.reference_number && (
              <div>
                <p className="text-sm font-medium">Reference Number</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {payment.reference_number}
                </p>
              </div>
            )}

            {payment.notes && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Notes</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {payment.notes}
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
            <div className="flex items-start gap-3">
              <FolderOpen className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Project</p>
                <button
                  onClick={() => router.push(`/projects/${payment.project_id}`)}
                  className="text-sm text-primary hover:underline"
                >
                  {payment.project_name}
                </button>
                {payment.project_code && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {payment.project_code}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Client</p>
                <button
                  onClick={() => router.push(`/clients/${payment.client_id}`)}
                  className="text-sm text-primary hover:underline"
                >
                  {payment.client_name}
                </button>
                {payment.client_code && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {payment.client_code}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              {payment.submitted_by_email && (
                <div className="flex items-start gap-3">
                  <Send className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Submitted By</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.submitted_by_email}
                      {payment.submitted_at && (
                        <span className="ml-1 text-xs">
                          on {formatDateTime(payment.submitted_at)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {payment.approved_by_email && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Approved By</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.approved_by_email}
                      {payment.approved_at && (
                        <span className="ml-1 text-xs">
                          on {formatDateTime(payment.approved_at)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {payment.rejected_by_email && (
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Rejected By</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.rejected_by_email}
                      {payment.rejected_at && (
                        <span className="ml-1 text-xs">
                          on {formatDateTime(payment.rejected_at)}
                        </span>
                      )}
                    </p>
                    {payment.rejection_reason && (
                      <p className="mt-1 text-sm text-red-600">
                        {payment.rejection_reason}
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
