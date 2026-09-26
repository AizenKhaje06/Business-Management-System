'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Archive,
  Trash2,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Calendar,
  DollarSign,
  FolderOpen,
  Receipt,
  Activity,
} from 'lucide-react';
import type { Client, ClientStatus } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { archiveClient, deleteClient } from '@/app/actions/clients';

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface ClientProfileProps {
  client: Client;
  stats: {
    projectCount: number;
    totalContractValue: number;
    totalPayments: number;
    outstandingBalance: number;
  };
  projects: Array<{
    id: string;
    name: string;
    status: string;
    budget: number | null;
    progress: number;
    start_date: string | null;
    end_date: string | null;
  }>;
  payments: Array<{
    id: string;
    project_id: string;
    project_name: string;
    amount: number;
    payment_date: string;
    payment_method: string | null;
    reference_number: string | null;
  }>;
  documents: Array<{
    id: string;
    name: string;
    file_url: string;
    file_type: string | null;
    created_at: string;
  }>;
  activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
    user_email: string | null;
  }>;
  canEdit: boolean;
  canDelete: boolean;
}

const statusColors: Record<ClientStatus, string> = {
  active: 'bg-green-100 text-green-800 hover:bg-green-100',
  inactive: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  archived: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ClientProfile({
  client,
  stats,
  projects,
  payments,
  documents,
  activity,
  canEdit,
  canDelete,
}: ClientProfileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveClient(client.id);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteClient(client.id);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push('/clients');
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
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {client.name}
              </h2>
              <Badge className={statusColors[client.status]} variant="outline">
                {client.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {client.client_code}
              {client.company_name && ` · ${client.company_name}`}
            </p>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/clients/${client.id}/edit`)}
                  disabled={isPending}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                {client.status !== 'archived' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchive}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="mr-2 h-4 w-4" />
                    )}
                    Archive
                  </Button>
                )}
              </>
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
                    <AlertDialogTitle>Delete Client</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {client.name}? This action
                      cannot be undone and will remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contract Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalContractValue)}
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
              {formatCurrency(stats.totalPayments)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(stats.outstandingBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Contact Person</p>
                <p className="text-sm text-muted-foreground">
                  {client.contact_person || 'Not specified'}
                </p>
              </div>
            </div>
            {client.email && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a
                    href={`mailto:${client.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {client.email}
                  </a>
                </div>
              </div>
            )}
            {client.phone && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    {client.phone}
                  </p>
                </div>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {client.address}
                    {(client.city || client.state || client.postal_code) && (
                      <br />
                    )}
                    {[client.city, client.state, client.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                    {client.country && ` ${client.country}`}
                  </p>
                </div>
              </div>
            )}
            {client.website && (
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Website</p>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              </div>
            )}
            {client.tax_id && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tax ID</p>
                  <p className="text-sm text-muted-foreground">
                    {client.tax_id}
                  </p>
                </div>
              </div>
            )}
            {client.notes && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Notes</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="projects">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="projects">
                <FolderOpen className="mr-1 h-3 w-3 sm:hidden" />
                <span className="hidden sm:inline">Projects</span>
              </TabsTrigger>
              <TabsTrigger value="payments">
                <Receipt className="mr-1 h-3 w-3 sm:hidden" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="mr-1 h-3 w-3 sm:hidden" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="photos">
                <FileText className="mr-1 h-3 w-3 sm:hidden" />
                <span className="hidden sm:inline">Photos</span>
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="mr-1 h-3 w-3 sm:hidden" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-4">
              {projects.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No projects"
                  description="This client has no projects yet."
                />
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <Card key={project.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{project.name}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <Badge variant="outline">{project.status}</Badge>
                              <span>
                                <Calendar className="mr-1 inline h-3 w-3" />
                                {formatDate(project.start_date)} —{' '}
                                {formatDate(project.end_date)}
                              </span>
                              {project.budget !== null && (
                                <span>
                                  <DollarSign className="mr-1 inline h-3 w-3" />
                                  {formatCurrency(project.budget)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-24">
                            <ProgressBar value={project.progress || 0} />
                            <p className="mt-1 text-right text-xs text-muted-foreground">
                              {project.progress || 0}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {payments.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No payments"
                  description="No payments have been recorded for this client."
                />
              ) : (
                <div className="rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                          Project
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                          Method
                        </th>
                        <th className="p-3 text-right text-sm font-medium text-muted-foreground">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b last:border-0">
                          <td className="p-3 text-sm">
                            {formatDate(payment.payment_date)}
                          </td>
                          <td className="p-3 text-sm">
                            {payment.project_name}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {payment.payment_method || '-'}
                          </td>
                          <td className="p-3 text-right text-sm font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              {documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents"
                  description="No documents have been uploaded for this client."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium">
                            {doc.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              <EmptyState
                icon={FileText}
                title="No photos"
                description="No photos have been uploaded for this client."
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {activity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No activity"
                  description="No recent activity for this client."
                />
              ) : (
                <div className="space-y-3">
                  {activity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 border-l-2 border-muted pl-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.created_at)}
                          {entry.user_email && ` · ${entry.user_email}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
