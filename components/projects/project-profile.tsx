'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Archive,
  Trash2,
  Loader2,
  FolderOpen,
  Calendar,
  DollarSign,
  Receipt,
  Package,
  FileText,
  Activity,
  Users,
  UserPlus,
  UserMinus,
  History,
  Building2,
} from 'lucide-react';
import type {
  Project,
  ProjectStatus,
  ProjectMember,
  ProjectStatusHistoryEntry,
  ProjectPayment,
  ProjectExpense,
  ProjectMaterial,
  ProjectActivity,
  ProjectCosting as ProjectCostingData,
  CostBreakdownEntry,
} from '@/types/project';
import type { PhotoWithUploader } from '@/types/photo';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProjectCosting } from '@/components/projects/project-costing';
import { PhotoGallery } from '@/components/photos/photo-gallery';
import { DocumentManager } from '@/components/documents/document-manager';
import type { DocumentWithUploader } from '@/types/document';
import {
  archiveProject,
  deleteProject,
  assignProjectMember,
  removeProjectMember,
} from '@/app/actions/projects';

interface StaffOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface ProjectProfileProps {
  project: Project & { client_name: string; client_code: string | null };
  stats: {
    totalPayments: number;
    totalExpenses: number;
    totalMaterials: number;
    outstandingBalance: number;
  };
  members: ProjectMember[];
  statusHistory: ProjectStatusHistoryEntry[];
  payments: ProjectPayment[];
  expenses: ProjectExpense[];
  materials: ProjectMaterial[];
  activity: ProjectActivity[];
  staff: StaffOption[];
  costing: ProjectCostingData | null;
  costBreakdown: CostBreakdownEntry[];
  photos: PhotoWithUploader[];
  documents: DocumentWithUploader[];
  canEdit: boolean;
  canDelete: boolean;
}

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  quotation: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  approved: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  in_progress: 'bg-green-100 text-green-700 hover:bg-green-100',
  on_hold: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Draft',
  quotation: 'Quotation',
  approved: 'Approved',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const memberRoleLabels: Record<string, string> = {
  lead: 'Lead',
  manager: 'Manager',
  member: 'Member',
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

function fullName(member: ProjectMember): string {
  if (member.first_name || member.last_name) {
    return [member.first_name, member.last_name].filter(Boolean).join(' ');
  }
  return member.email;
}

export function ProjectProfile({
  project,
  stats,
  members,
  statusHistory,
  payments,
  expenses,
  materials,
  documents,
  activity,
  staff,
  costing,
  costBreakdown,
  photos,
  canEdit,
  canDelete,
}: ProjectProfileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveProject(project.id);
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
      const result = await deleteProject(project.id);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push('/projects');
      }
    });
  }

  function handleAssignMember() {
    if (!newMemberId) return;
    setError(null);
    startTransition(async () => {
      const result = await assignProjectMember({
        project_id: project.id,
        user_id: newMemberId,
        role: newMemberRole as 'lead' | 'manager' | 'member',
      });
      if (!result.success) {
        setError(result.error);
      } else {
        setNewMemberId('');
        router.refresh();
      }
    });
  }

  function handleRemoveMember(userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeProjectMember(project.id, userId);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const availableStaff = staff.filter(
    (s) => !members.some((m) => m.user_id === s.id)
  );

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
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {project.name}
              </h2>
              <Badge className={statusColors[project.status]} variant="outline">
                {statusLabels[project.status]}
              </Badge>
              {project.archived && <Badge variant="secondary">Archived</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{project.project_code}</span>
              <span>·</span>
              <button
                onClick={() => router.push(`/clients/${project.client_id}`)}
                className="text-primary hover:underline"
              >
                {project.client_name}
              </button>
            </div>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/projects/${project.id}/edit`)}
                  disabled={isPending}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                {!project.archived && (
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
                    <AlertDialogTitle>Delete Project</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {project.name}? This
                      action cannot be undone and will remove all associated
                      data.
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
              Contract Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.budget !== null ? formatCurrency(project.budget) : '-'}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progress
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.progress || 0}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Client</p>
                <button
                  onClick={() => router.push(`/clients/${project.client_id}`)}
                  className="text-sm text-primary hover:underline"
                >
                  {project.client_name}
                </button>
              </div>
            </div>
            {project.description && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Description</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Timeline</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(project.start_date)} —{' '}
                  {formatDate(project.end_date)}
                </p>
                {project.actual_end_date && (
                  <p className="text-xs text-muted-foreground">
                    Completed: {formatDate(project.actual_end_date)}
                  </p>
                )}
              </div>
            </div>
            {project.budget !== null && (
              <div className="flex items-start gap-3">
                <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Budget</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(project.budget)}
                  </p>
                </div>
              </div>
            )}
            {project.hourly_rate !== null && (
              <div className="flex items-start gap-3">
                <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hourly Rate</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(project.hourly_rate)}
                  </p>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Priority</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {project.priority}
              </Badge>
            </div>
            {project.notes && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Notes</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-5 sm:grid-cols-9">
              <TabsTrigger value="overview">
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="costing">
                <span className="hidden sm:inline">Costing</span>
              </TabsTrigger>
              <TabsTrigger value="payments">
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="expenses">
                <span className="hidden sm:inline">Expenses</span>
              </TabsTrigger>
              <TabsTrigger value="materials">
                <span className="hidden sm:inline">Materials</span>
              </TabsTrigger>
              <TabsTrigger value="photos">
                <span className="hidden sm:inline">Photos</span>
              </TabsTrigger>
              <TabsTrigger value="documents">
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="activity">
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="team">
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" />
                    Status History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statusHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No status changes recorded.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {statusHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 border-l-2 border-muted pl-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {entry.old_status && (
                                <Badge
                                  className={statusColors[entry.old_status]}
                                  variant="outline"
                                >
                                  {statusLabels[entry.old_status]}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                →
                              </span>
                              <Badge
                                className={statusColors[entry.new_status]}
                                variant="outline"
                              >
                                {statusLabels[entry.new_status]}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(entry.created_at)}
                              {entry.changed_by_email &&
                                ` · ${entry.changed_by_email}`}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No team members assigned.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{fullName(m)}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {memberRoleLabels[m.role]}
                            </Badge>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleRemoveMember(m.user_id)}
                                disabled={isPending}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {canEdit && availableStaff.length > 0 && (
                    <div className="mt-4 flex items-end gap-2 border-t pt-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium">
                          Assign Member
                        </label>
                        <Select
                          value={newMemberId}
                          onValueChange={setNewMemberId}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select staff" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStaff.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.first_name || s.last_name
                                  ? [s.first_name, s.last_name]
                                      .filter(Boolean)
                                      .join(' ')
                                  : s.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Select
                        value={newMemberRole}
                        onValueChange={setNewMemberRole}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-9 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleAssignMember}
                        disabled={isPending || !newMemberId}
                      >
                        <UserPlus className="mr-1 h-4 w-4" />
                        Assign
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="costing" className="mt-4">
              {costing ? (
                <ProjectCosting costing={costing} breakdown={costBreakdown} />
              ) : (
                <EmptyState
                  icon={DollarSign}
                  title="Costing unavailable"
                  description="Unable to load project costing data."
                />
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {payments.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No payments"
                  description="Payment functionality will be available in a future phase."
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
                          Method
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                          Reference
                        </th>
                        <th className="p-3 text-right text-sm font-medium text-muted-foreground">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="p-3 text-sm">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {p.payment_method || '-'}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {p.reference_number || '-'}
                          </td>
                          <td className="p-3 text-right text-sm font-medium text-green-600">
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="mt-4">
              {expenses.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No expenses"
                  description="Expense functionality will be available in a future phase."
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
                          Description
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="p-3 text-right text-sm font-medium text-muted-foreground">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id} className="border-b last:border-0">
                          <td className="p-3 text-sm">
                            {formatDate(e.expense_date)}
                          </td>
                          <td className="p-3 text-sm">
                            {e.description || '-'}
                          </td>
                          <td className="p-3 text-sm">
                            <Badge variant="outline">{e.status}</Badge>
                          </td>
                          <td className="p-3 text-right text-sm font-medium">
                            {formatCurrency(e.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="mt-4">
              {materials.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No materials"
                  description="Material tracking will be available in a future phase."
                />
              ) : (
                <div className="rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                          Material
                        </th>
                        <th className="p-3 text-right text-sm font-medium text-muted-foreground">
                          Qty
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                          Unit
                        </th>
                        <th className="p-3 text-right text-sm font-medium text-muted-foreground">
                          Unit Cost
                        </th>
                        <th className="p-3 text-right text-sm font-medium text-muted-foreground">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="p-3 text-sm">{m.name}</td>
                          <td className="p-3 text-right text-sm">
                            {m.quantity}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {m.unit || '-'}
                          </td>
                          <td className="p-3 text-right text-sm">
                            {formatCurrency(m.unit_cost)}
                          </td>
                          <td className="p-3 text-right text-sm font-medium">
                            {formatCurrency(m.total_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              <PhotoGallery
                photos={photos}
                projectId={project.id}
                canUpload={canEdit}
                canDelete={canEdit}
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <DocumentManager
                documents={documents}
                entityType="project"
                entityId={project.id}
                canManage={canEdit}
                showArchiveToggle
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {activity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No activity"
                  description="No recent activity for this project."
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

            <TabsContent value="team" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Assigned Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No team members assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{fullName(m)}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {memberRoleLabels[m.role]}
                            </Badge>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleRemoveMember(m.user_id)}
                                disabled={isPending}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {canEdit && availableStaff.length > 0 && (
                    <div className="mt-4 flex items-end gap-2 border-t pt-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium">
                          Assign Member
                        </label>
                        <Select
                          value={newMemberId}
                          onValueChange={setNewMemberId}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select staff" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStaff.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.first_name || s.last_name
                                  ? [s.first_name, s.last_name]
                                      .filter(Boolean)
                                      .join(' ')
                                  : s.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Select
                        value={newMemberRole}
                        onValueChange={setNewMemberRole}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-9 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleAssignMember}
                        disabled={isPending || !newMemberId}
                      >
                        <UserPlus className="mr-1 h-4 w-4" />
                        Assign
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
