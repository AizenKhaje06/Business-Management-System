/**
 * Core shared type definitions for the Business Management System.
 * Feature-specific types live alongside their feature modules.
 */

export type ID = string;

export type ISODateString = string;

export type EntityStatus = 'active' | 'inactive' | 'archived';

export interface BaseEntity {
  id: ID;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export type ApiResult<T> =
  { data: T; error: null } | { data: null; error: ApiError };

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  field: string;
  direction: SortDirection;
}
