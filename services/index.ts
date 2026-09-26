/**
 * Service layer — business logic that sits between UI and data sources.
 *
 * Each feature gets its own service module (e.g. contacts.ts, invoices.ts).
 * Services are framework-agnostic — they accept and return plain types,
 * and they handle error normalization via the ApiResult pattern.
 *
 * Pattern:
 *   export async function getEntities(): Promise<ApiResult<Entity[]>> { ... }
 *
 * This keeps server/client components thin and makes testing straightforward.
 */
export { type ApiResult } from '@/types';
