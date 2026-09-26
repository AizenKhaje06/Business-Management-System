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
import {
  createProject,
  updateProject,
  type ProjectActionResult,
} from '@/app/actions/projects';
import type { Project, ProjectStatus, ProjectPriority } from '@/types/project';

interface ClientOption {
  id: string;
  name: string;
  client_code: string | null;
}

interface ProjectFormProps {
  mode: 'create' | 'edit';
  project?: Project;
  clients: ClientOption[];
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: { value: ProjectPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function ProjectForm({ mode, project, clients }: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState(project?.client_id ?? '');
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? 'draft'
  );
  const [priority, setPriority] = useState<ProjectPriority>(
    project?.priority ?? 'medium'
  );
  const [startDate, setStartDate] = useState(project?.start_date ?? '');
  const [endDate, setEndDate] = useState(project?.end_date ?? '');
  const [actualEndDate, setActualEndDate] = useState(
    project?.actual_end_date ?? ''
  );
  const [budget, setBudget] = useState(
    project?.budget !== null ? String(project?.budget ?? '') : ''
  );
  const [hourlyRate, setHourlyRate] = useState(
    project?.hourly_rate !== null ? String(project?.hourly_rate ?? '') : ''
  );
  const [progress, setProgress] = useState(String(project?.progress ?? 0));
  const [notes, setNotes] = useState(project?.notes ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    startTransition(async () => {
      const formData = {
        client_id: clientId,
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        progress: progress ? parseInt(progress, 10) : 0,
        notes: notes.trim() || undefined,
        ...(mode === 'edit' && project
          ? { actual_end_date: actualEndDate || undefined }
          : {}),
      };

      let result: ProjectActionResult;
      if (mode === 'create') {
        result = await createProject(formData);
      } else if (project) {
        result = await updateProject({ id: project.id, ...formData });
      } else {
        return;
      }

      if (!result.success) {
        setError(result.error);
      } else {
        if (mode === 'create' && result.data) {
          const created = result.data as Project;
          router.push(`/projects/${created.id}`);
        } else if (project) {
          router.push(`/projects/${project.id}`);
        } else {
          router.push('/projects');
        }
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
          <Label htmlFor="client">Client *</Label>
          <Select
            value={clientId}
            onValueChange={setClientId}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.client_code && ` (${c.client_code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Website Redesign"
            disabled={isPending}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Project scope and objectives..."
          rows={3}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ProjectStatus)}
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
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as ProjectPriority)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Target Completion Date</Label>
          <Input
            id="end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isPending}
          />
        </div>
        {mode === 'edit' && (
          <div className="space-y-2">
            <Label htmlFor="actual_end_date">Actual Completion Date</Label>
            <Input
              id="actual_end_date"
              type="date"
              value={actualEndDate}
              onChange={(e) => setActualEndDate(e.target.value)}
              disabled={isPending}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="budget">Contract Amount</Label>
          <Input
            id="budget"
            type="number"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="50000.00"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hourly_rate">Hourly Rate</Label>
          <Input
            id="hourly_rate"
            type="number"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="75.00"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="progress">Progress (%)</Label>
          <Input
            id="progress"
            type="number"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
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
          placeholder="Additional project notes..."
          rows={4}
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
        <Button type="submit" disabled={isPending || !name.trim() || !clientId}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {mode === 'create' ? 'Create Project' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
