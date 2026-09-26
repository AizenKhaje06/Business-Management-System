export {
  getCurrentUserContext,
  getProfileWithRole,
  getRolePermissions,
  requireAuth,
  requirePermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleLevel,
  canManageUser,
  canCreateExpense,
  canApproveExpense,
  canManageUsers,
  canViewReports,
  canCreateUser,
  canEditUser,
  canDeactivateUser,
} from './authorization';

export type { CurrentUserContext } from '@/types/auth';
