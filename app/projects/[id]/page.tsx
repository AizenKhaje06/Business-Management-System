import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProjectProfile } from '@/components/projects/project-profile';
import {
  getProjectWithClient,
  getProjectStats,
  getProjectMembers,
  getProjectStatusHistory,
  getProjectPayments,
  getProjectExpenses,
  getProjectMaterials,
  getProjectActivity,
  getActiveStaff,
  getProjectCosting,
  getProjectCostBreakdown,
} from '@/app/actions/projects';
import { getProjectPhotos } from '@/app/actions/photos';
import { getProjectDocuments } from '@/app/actions/documents';

interface ProjectDetailPageProps {
  params: { id: string };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const ctx = await getCurrentUserContext();

  if (!ctx) {
    return (
      <AppShell>
        <ErrorState
          title="Access Error"
          message="Unable to load your user context."
        />
      </AppShell>
    );
  }

  if (!ctx.permissions.includes('invoices.view')) {
    return (
      <AppShell>
        <PageHeader title="Project" />
        <ErrorState
          title="Access Denied"
          message="You do not have permission to view projects."
        />
      </AppShell>
    );
  }

  const project = await getProjectWithClient(params.id);

  if (!project) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
          </div>
          <ErrorState
            title="Project Not Found"
            message="The project you are looking for does not exist or has been removed."
          />
        </div>
      </AppShell>
    );
  }

  const [
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
  ] = await Promise.all([
    getProjectStats(params.id),
    getProjectMembers(params.id),
    getProjectStatusHistory(params.id),
    getProjectPayments(params.id),
    getProjectExpenses(params.id),
    getProjectMaterials(params.id),
    getProjectDocuments(params.id),
    getProjectActivity(params.id),
    getActiveStaff(),
    getProjectCosting(params.id),
    getProjectCostBreakdown(params.id),
    getProjectPhotos(params.id),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
        <ProjectProfile
          project={project}
          stats={stats}
          members={members}
          statusHistory={statusHistory}
          payments={payments}
          expenses={expenses}
          materials={materials}
          documents={documents}
          activity={activity}
          staff={staff}
          costing={costing}
          costBreakdown={costBreakdown}
          photos={photos}
          canEdit={ctx.permissions.includes('invoices.edit')}
          canDelete={ctx.permissions.includes('invoices.delete')}
        />
      </div>
    </AppShell>
  );
}
