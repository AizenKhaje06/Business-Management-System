'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Filter, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination as PaginationComponent } from '@/components/ui/pagination';
import { PaginationNav } from '@/components/ui/pagination-nav';
import { CreateProductionOrderModal } from './create-production-order-modal';
import { deleteProductionOrder } from '@/app/actions/production';
import { toast } from 'sonner';
import type { ProductionOrderWithDetails } from '@/types/production';

interface ProductionOrdersTableProps {
  orders: ProductionOrderWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  status: string;
  priority: string;
  canCreate: boolean;
}

export function ProductionOrdersTable({
  orders,
  total,
  page,
  pageSize,
  search,
  status,
  priority,
  canCreate,
}: ProductionOrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(search);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams({ search: localSearch, page: '1' });
  };

  const updateSearchParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/production?${params.toString()}`);
  };

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm(`Delete production order ${orderNumber}?`)) return;

    setIsDeleting(id);
    const result = await deleteProductionOrder(id);

    if (result.success) {
      toast.success('Production order deleted');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete');
    }
    setIsDeleting(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      approved: 'secondary',
      in_progress: 'default',
      paused: 'outline',
      completed: 'secondary',
      cancelled: 'destructive',
      on_hold: 'outline',
    };

    const labels: Record<string, string> = {
      pending: 'Pending',
      approved: 'Approved',
      in_progress: 'In Progress',
      paused: 'Paused',
      completed: 'Completed',
      cancelled: 'Cancelled',
      on_hold: 'On Hold',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const labels: Record<string, string> = {
      urgent: 'Urgent',
      high: 'High',
      normal: 'Normal',
      low: 'Low',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[priority] || colors.normal}`}
      >
        {labels[priority] || priority}
      </span>
    );
  };

  const getProgressPercentage = (order: ProductionOrderWithDetails) => {
    if (!order.stages || order.stages.length === 0) return 0;
    const completed = order.stages.filter((s) => s.status === 'completed').length;
    return Math.round((completed / order.stages.length) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by order number..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {canCreate && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Production Order
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <Select
          value={status}
          onValueChange={(value) => updateSearchParams({ status: value, page: '1' })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={priority}
          onValueChange={(value) => updateSearchParams({ priority: value, page: '1' })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No production orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.product?.name}</div>
                      {order.product?.sku && (
                        <div className="text-xs text-muted-foreground">
                          {order.product.sku}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.client ? (
                      <Link
                        href={`/clients/${order.client.id}`}
                        className="text-primary hover:underline"
                      >
                        {order.client.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${getProgressPercentage(order)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getProgressPercentage(order)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.assigned_to_user ? (
                      <span>
                        {order.assigned_to_user.first_name}{' '}
                        {order.assigned_to_user.last_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/production/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/production/${order.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(order.id, order.order_number)}
                        disabled={isDeleting === order.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationNav
        currentPage={page}
        totalPages={Math.ceil(total / pageSize)}
        basePath="/production"
        queryParams={{
          search: search || undefined,
          status: status !== 'all' ? status : undefined,
          priority: priority !== 'all' ? priority : undefined,
        }}
      />

      {/* Create Modal */}
      <CreateProductionOrderModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
