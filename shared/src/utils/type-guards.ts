import { BOOKING_STATUSES } from '../constants/booking-status';
import { ERROR_CODES } from '../constants/error-codes';
import { ROLES } from '../constants/roles';
import type { BookingStatus } from '../constants/booking-status';
import type { Role } from '../constants/roles';
import type { ApiErrorBody, ApiResponse } from '../types/api';
export function isOneOf<T extends readonly string[]>(values: T, x: unknown): x is T[number] { return typeof x === 'string' && values.includes(x); }
export function isRole(x: unknown): x is Role { return isOneOf(ROLES, x); }
export function isBookingStatus(x: unknown): x is BookingStatus { return isOneOf(BOOKING_STATUSES, x); }
function record(x: unknown): x is Record<string, unknown> { return typeof x === 'object' && x !== null && !Array.isArray(x); }
export function isApiErrorBody(x: unknown): x is ApiErrorBody { return record(x) && typeof x.statusCode === 'number' && typeof x.error === 'string' && isOneOf(ERROR_CODES, x.code) && typeof x.message === 'string' && typeof x.path === 'string' && typeof x.timestamp === 'string'; }
export function isApiResponse<T>(x: unknown): x is ApiResponse<T> { return record(x) && Object.prototype.hasOwnProperty.call(x, 'data'); }
