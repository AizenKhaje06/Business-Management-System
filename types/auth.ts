/**
 * Role and permission type definitions for the RBAC system.
 */

export const ROLE_NAMES = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'ACCOUNTANT',
  'STAFF',
  'VIEWER',
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const PERMISSION_NAMES = [
  'users.create',
  'users.view',
  'users.edit',
  'users.deactivate',
  'users.manage',
  'settings.view',
  'settings.edit',
  'reports.view',
  'reports.export',
  'contacts.create',
  'contacts.view',
  'contacts.edit',
  'contacts.delete',
  'invoices.create',
  'invoices.view',
  'invoices.edit',
  'invoices.delete',
  'invoices.approve',
  'orders.create',
  'orders.view',
  'orders.edit',
  'orders.delete',
  'orders.approve',
  'inventory.create',
  'inventory.view',
  'inventory.edit',
  'inventory.delete',
  'expenses.create',
  'expenses.view',
  'expenses.edit',
  'expenses.delete',
  'expenses.approve',
  'audit.view',
] as const;

export type PermissionName = (typeof PERMISSION_NAMES)[number];

export interface Role {
  id: string;
  name: RoleName;
  description: string;
  level: number;
  created_at: string;
}

export interface Permission {
  id: string;
  name: PermissionName;
  description: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithRole extends Profile {
  role: Role | null;
}

export interface CurrentUserContext {
  id: string;
  email: string;
  profile: ProfileWithRole | null;
  permissions: PermissionName[];
  role: RoleName | null;
}
