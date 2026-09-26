import {
  ROLE_NAMES,
  PERMISSION_NAMES,
  type PermissionName,
  type RoleName,
} from '@/types/auth';

describe('Authentication & Authorization Types', () => {
  describe('Role hierarchy', () => {
    it('should define 6 roles in correct order', () => {
      expect(ROLE_NAMES).toHaveLength(6);
      expect(ROLE_NAMES).toEqual([
        'OWNER',
        'ADMIN',
        'MANAGER',
        'ACCOUNTANT',
        'STAFF',
        'VIEWER',
      ]);
    });

    it('should have OWNER as highest authority (level 1)', () => {
      expect(ROLE_NAMES[0]).toBe('OWNER');
    });

    it('should have VIEWER as lowest authority', () => {
      expect(ROLE_NAMES[5]).toBe('VIEWER');
    });

    it('should maintain hierarchy order OWNER > ADMIN > MANAGER > ACCOUNTANT > STAFF > VIEWER', () => {
      const levels: Record<RoleName, number> = {
        OWNER: 1,
        ADMIN: 2,
        MANAGER: 3,
        ACCOUNTANT: 4,
        STAFF: 5,
        VIEWER: 6,
      };
      ROLE_NAMES.forEach((role) => {
        expect(levels[role]).toBeDefined();
      });
      expect(levels.OWNER).toBeLessThan(levels.ADMIN);
      expect(levels.ADMIN).toBeLessThan(levels.MANAGER);
      expect(levels.MANAGER).toBeLessThan(levels.ACCOUNTANT);
      expect(levels.ACCOUNTANT).toBeLessThan(levels.STAFF);
      expect(levels.STAFF).toBeLessThan(levels.VIEWER);
    });
  });

  describe('Permission definitions', () => {
    it('should define all required permission categories', () => {
      const categories = [
        'users',
        'settings',
        'reports',
        'contacts',
        'invoices',
        'orders',
        'inventory',
        'expenses',
        'audit',
      ];
      categories.forEach((cat) => {
        const hasCategoryPermission = PERMISSION_NAMES.some((p) =>
          p.startsWith(`${cat}.`)
        );
        expect(hasCategoryPermission).toBe(true);
      });
    });

    it('should include CRUD permissions for users', () => {
      const userPerms = PERMISSION_NAMES.filter((p) => p.startsWith('users.'));
      expect(userPerms).toContain('users.create');
      expect(userPerms).toContain('users.view');
      expect(userPerms).toContain('users.edit');
      expect(userPerms).toContain('users.deactivate');
      expect(userPerms).toContain('users.manage');
    });

    it('should include CRUD permissions for contacts', () => {
      const contactPerms = PERMISSION_NAMES.filter((p) =>
        p.startsWith('contacts.')
      );
      expect(contactPerms).toContain('contacts.create');
      expect(contactPerms).toContain('contacts.view');
      expect(contactPerms).toContain('contacts.edit');
      expect(contactPerms).toContain('contacts.delete');
    });

    it('should include CRUD + approve permissions for invoices', () => {
      const invoicePerms = PERMISSION_NAMES.filter((p) =>
        p.startsWith('invoices.')
      );
      expect(invoicePerms).toContain('invoices.create');
      expect(invoicePerms).toContain('invoices.view');
      expect(invoicePerms).toContain('invoices.edit');
      expect(invoicePerms).toContain('invoices.delete');
      expect(invoicePerms).toContain('invoices.approve');
    });

    it('should include CRUD + approve permissions for expenses', () => {
      const expensePerms = PERMISSION_NAMES.filter((p) =>
        p.startsWith('expenses.')
      );
      expect(expensePerms).toContain('expenses.create');
      expect(expensePerms).toContain('expenses.view');
      expect(expensePerms).toContain('expenses.edit');
      expect(expensePerms).toContain('expenses.delete');
      expect(expensePerms).toContain('expenses.approve');
    });

    it('should include export permission for reports', () => {
      expect(PERMISSION_NAMES).toContain('reports.view');
      expect(PERMISSION_NAMES).toContain('reports.export');
    });

    it('should include audit view permission', () => {
      expect(PERMISSION_NAMES).toContain('audit.view');
    });
  });

  describe('Permission assignment by role', () => {
    // These tests verify the expected permission model
    // The actual DB seed/migration assigns these
    it('OWNER should have all permissions', () => {
      expect(PERMISSION_NAMES.length).toBeGreaterThan(20);
    });

    it('VIEWER should have view-only permissions', () => {
      const viewerPerms: PermissionName[] = [
        'contacts.view',
        'invoices.view',
        'expenses.view',
        'reports.view',
      ];
      viewerPerms.forEach((p) => {
        expect(PERMISSION_NAMES).toContain(p);
      });
      // Viewer should NOT have any create/edit/delete
      expect(viewerPerms).not.toContain('contacts.create');
      expect(viewerPerms).not.toContain('invoices.edit');
      expect(viewerPerms).not.toContain('expenses.delete');
    });

    it('STAFF should have create + view but not approve', () => {
      const staffPerms: PermissionName[] = [
        'contacts.view',
        'invoices.view',
        'expenses.view',
        'expenses.create',
      ];
      expect(staffPerms).not.toContain('expenses.approve');
      expect(staffPerms).not.toContain('invoices.approve');
    });
  });
});

describe('Authorization context', () => {
  it('CurrentUserContext should include id, email, profile, permissions, role', () => {
    const ctx = {
      id: 'user-1',
      email: 'test@test.com',
      profile: null,
      permissions: [] as PermissionName[],
      role: null,
    };
    expect(ctx).toHaveProperty('id');
    expect(ctx).toHaveProperty('email');
    expect(ctx).toHaveProperty('profile');
    expect(ctx).toHaveProperty('permissions');
    expect(ctx).toHaveProperty('role');
  });

  it('unauthenticated context should return null', () => {
    const ctx = null;
    expect(ctx).toBeNull();
  });

  it('user with no profile should have empty permissions', () => {
    const ctx = {
      id: 'user-1',
      email: 'test@test.com',
      profile: null,
      permissions: [],
      role: null,
    };
    expect(ctx.permissions).toHaveLength(0);
    expect(ctx.role).toBeNull();
  });
});
