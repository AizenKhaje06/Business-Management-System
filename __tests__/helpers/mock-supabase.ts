import type { CurrentUserContext, PermissionName, RoleName } from '@/types/auth';

export interface MockSupabaseClient {
  auth: {
    getUser: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
  };
  from: jest.Mock;
  storage: {
    from: jest.Mock;
  };
  channel: jest.Mock;
}

export type QueryChain = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  or: jest.Mock;
  in: jest.Mock;
  not: jest.Mock;
  is: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  count: jest.Mock;
};

export function createMockQueryChain(data: any = [], error: any = null): QueryChain {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: data[0] || null, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data: data[0] || null, error }),
  };
  // Terminal calls return { data, error }
  chain.select.mockImplementation(() => {
    // Return this so chaining continues, but also set up terminal resolution
    return chain;
  });
  // Override: when the chain is "awaited" (via then), return data
  // We make the chain itself thenable
  (chain as any).then = (resolve: any) =>
    Promise.resolve({ data, error }).then(resolve);
  return chain as QueryChain;
}

export function createMockSupabaseClient(
  overrides: Partial<MockSupabaseClient> = {}
): MockSupabaseClient {
  const chain = createMockQueryChain();
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      ...overrides.auth,
    },
    from: jest.fn().mockReturnValue(chain),
    storage: {
      from: jest.fn().mockReturnValue({
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        upload: jest.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
        createSignedUrls: jest.fn().mockResolvedValue({ data: [], error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    }),
    ...overrides,
  };
}

export function createMockUserContext(
  overrides: Partial<CurrentUserContext> = {}
): CurrentUserContext {
  return {
    id: 'user-1',
    email: 'test@example.com',
    profile: {
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role_id: 'role-1',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      role: {
        id: 'role-1',
        name: 'ADMIN' as RoleName,
        description: 'Administrator',
        level: 2,
        created_at: '2024-01-01T00:00:00Z',
      },
    },
    permissions: [
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'invoices.view',
      'invoices.create',
      'invoices.edit',
      'invoices.delete',
      'invoices.approve',
      'expenses.view',
      'expenses.create',
      'expenses.edit',
      'expenses.approve',
      'reports.view',
      'reports.export',
      'users.view',
      'users.create',
      'users.edit',
      'users.manage',
      'audit.view',
    ] as PermissionName[],
    role: 'ADMIN' as RoleName,
    ...overrides,
  };
}

export function createMockStaffContext(
  overrides: Partial<CurrentUserContext> = {}
): CurrentUserContext {
  return createMockUserContext({
    id: 'staff-1',
    email: 'staff@example.com',
    profile: {
      id: 'staff-1',
      email: 'staff@example.com',
      first_name: 'Staff',
      last_name: 'Member',
      role_id: 'role-5',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      role: {
        id: 'role-5',
        name: 'STAFF' as RoleName,
        description: 'Staff member',
        level: 5,
        created_at: '2024-01-01T00:00:00Z',
      },
    },
    permissions: [
      'contacts.view',
      'invoices.view',
      'expenses.view',
      'expenses.create',
    ] as PermissionName[],
    role: 'STAFF' as RoleName,
    ...overrides,
  });
}

export function createMockViewerContext(
  overrides: Partial<CurrentUserContext> = {}
): CurrentUserContext {
  return createMockUserContext({
    id: 'viewer-1',
    email: 'viewer@example.com',
    profile: {
      id: 'viewer-1',
      email: 'viewer@example.com',
      first_name: 'Viewer',
      last_name: 'User',
      role_id: 'role-6',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      role: {
        id: 'role-6',
        name: 'VIEWER' as RoleName,
        description: 'Read-only viewer',
        level: 6,
        created_at: '2024-01-01T00:00:00Z',
      },
    },
    permissions: [
      'contacts.view',
      'invoices.view',
      'expenses.view',
      'reports.view',
    ] as PermissionName[],
    role: 'VIEWER' as RoleName,
    ...overrides,
  });
}
