import type { ErrorCode } from '../constants/error-codes';
export interface ApiResponse<T> { data: T }
export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number }
export interface ValidationIssue { path: string; message: string }
export interface ApiErrorBody { statusCode: number; error: string; code: ErrorCode; message: string; details?: unknown; path: string; timestamp: string }
