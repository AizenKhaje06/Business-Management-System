'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Power, Loader2, Shield, UserCog, Users } from 'lucide-react';
import type { ProfileWithRole, Role, RoleName } from '@/types/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  createUser,
  updateUser,
  toggleUserActive,
  type ActionResult,
} from '@/app/actions/users';

interface UsersTableProps {
  profiles: ProfileWithRole[];
  roles: Role[];
  currentUserId: string;
  currentRoleLevel: number;
  canCreate: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
}

export function UsersTable({
  profiles,
  roles,
  currentUserId,
  currentRoleLevel,
  canCreate,
  canEdit,
  canDeactivate,
}: UsersTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfileWithRole | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<ProfileWithRole | null>(null);

  function canManageTarget(target: ProfileWithRole): boolean {
    if (target.id === currentUserId) return true;
    return currentRoleLevel < (target.role?.level ?? 99);
  }

  function handleResult(result: ActionResult, closeDialog?: () => void) {
    if (!result.success) {
      setError(result.error);
    } else {
      setError(null);
      closeDialog?.();
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {profiles.length} user{profiles.length !== 1 ? 's' : ''} total
        </p>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <CreateUserDialog
              roles={roles}
              currentRoleLevel={currentRoleLevel}
              isPending={isPending}
              onSubmit={(data) => {
                startTransition(async () => {
                  const result = await createUser(data);
                  handleResult(result, () => setCreateOpen(false));
                });
              }}
            />
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-0">
                  <EmptyState
                    icon={Users}
                    title="No users found"
                    description="User accounts will appear here once created."
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            ) : profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {profile.first_name || profile.last_name
                        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
                        : (profile as any).username || profile.email}
                    </span>
                    {profile.first_name && profile.last_name && (
                      <span className="text-xs text-muted-foreground">
                        @{(profile as any).username || profile.email.split('@')[0]}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                    {(profile as any).username || '-'}
                  </code>
                </TableCell>
                <TableCell>
                  {profile.role ? (
                    <Badge variant="outline">{profile.role.name}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Unassigned
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {profile.is_active ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && canManageTarget(profile) && (
                      <Dialog
                        open={editingUser?.id === profile.id}
                        onOpenChange={(open) => {
                          if (!open) setEditingUser(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingUser(profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <EditUserDialog
                          profile={profile}
                          roles={roles}
                          currentRoleLevel={currentRoleLevel}
                          isSelf={profile.id === currentUserId}
                          canDeactivate={canDeactivate}
                          isPending={isPending}
                          onSubmit={(data) => {
                            startTransition(async () => {
                              const result = await updateUser({
                                userId: profile.id,
                                ...data,
                              });
                              handleResult(result, () => setEditingUser(null));
                            });
                          }}
                          onToggleActive={() => {
                            startTransition(async () => {
                              const result = await toggleUserActive({
                                userId: profile.id,
                                isActive: !profile.is_active,
                              });
                              handleResult(result, () => setEditingUser(null));
                            });
                          }}
                        />
                      </Dialog>
                    )}
                    {canDeactivate && canManageTarget(profile) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isPending || profile.id === currentUserId}
                        onClick={() => setConfirmToggle(profile)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isPending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}

      <AlertDialog
        open={confirmToggle !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmToggle(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.is_active ? 'Deactivate' : 'Activate'} user?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmToggle?.is_active ? 'deactivate' : 'activate'}{' '}
              {confirmToggle?.email}?{' '}
              {confirmToggle?.is_active
                ? 'They will lose access to the system immediately.'
                : 'They will regain access to the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmToggle) return;
                const target = confirmToggle;
                setConfirmToggle(null);
                startTransition(async () => {
                  const result = await toggleUserActive({
                    userId: target.id,
                    isActive: !target.is_active,
                  });
                  handleResult(result);
                });
              }}
            >
              {confirmToggle?.is_active ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Create User Dialog ---

function CreateUserDialog({
  roles,
  currentRoleLevel,
  isPending,
  onSubmit,
}: {
  roles: Role[];
  currentRoleLevel: number;
  isPending: boolean;
  onSubmit: (data: {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    roleName: RoleName;
  }) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleName, setRoleName] = useState<RoleName>('VIEWER');
  const [showPassword, setShowPassword] = useState(false);

  const availableRoles = roles.filter((r) => r.level > currentRoleLevel);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New User</DialogTitle>
        <DialogDescription>
          Add a new user account and assign their role.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="create-username">Username</Label>
          <Input
            id="create-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="username (for login)"
            disabled={isPending}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Alphanumeric and underscore only. Used for login.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-password">Password</Label>
          <div className="relative">
            <Input
              id="create-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={isPending}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="create-first-name">First Name</Label>
            <Input
              id="create-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-last-name">Last Name</Label>
            <Input
              id="create-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={roleName}
            onValueChange={(v) => setRoleName(v as RoleName)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  {role.name} — {role.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          disabled={isPending || !username || !password}
          onClick={() =>
            onSubmit({ 
              email: `${username}@internal.local`,  // Auto-generate email from username
              password, 
              username, 
              firstName, 
              lastName, 
              roleName 
            })
          }
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create User
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// --- Edit User Dialog ---

function EditUserDialog({
  profile,
  roles,
  currentRoleLevel,
  isSelf,
  canDeactivate,
  isPending,
  onSubmit,
  onToggleActive,
}: {
  profile: ProfileWithRole;
  roles: Role[];
  currentRoleLevel: number;
  isSelf: boolean;
  canDeactivate: boolean;
  isPending: boolean;
  onSubmit: (data: {
    firstName?: string;
    lastName?: string;
    roleName: RoleName;
    isActive?: boolean;
  }) => void;
  onToggleActive: () => void;
}) {
  const [firstName, setFirstName] = useState(profile.first_name ?? '');
  const [lastName, setLastName] = useState(profile.last_name ?? '');
  const [roleName, setRoleName] = useState<RoleName>(
    (profile.role?.name as RoleName) ?? 'VIEWER'
  );

  const availableRoles = isSelf
    ? roles.filter((r) => r.level >= currentRoleLevel)
    : roles.filter((r) => r.level > currentRoleLevel);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit User</DialogTitle>
        <DialogDescription>
          Update {(profile as any).username || profile.email}&apos;s profile and role.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-first-name">First Name</Label>
            <Input
              id="edit-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-last-name">Last Name</Label>
            <Input
              id="edit-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={roleName}
            onValueChange={(v) => setRoleName(v as RoleName)}
            disabled={isPending || isSelf}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  {role.name} — {role.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSelf && (
            <p className="text-xs text-muted-foreground">
              You cannot change your own role.
            </p>
          )}
        </div>
        {canDeactivate && !isSelf && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-xs text-muted-foreground">
                {profile.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <Switch
              checked={profile.is_active}
              onCheckedChange={onToggleActive}
              disabled={isPending}
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => onSubmit({ firstName, lastName, roleName })}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
