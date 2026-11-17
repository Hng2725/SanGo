import { describe, expect, it } from 'vitest';
import { isApiErrorBody, isApiResponse, isBookingStatus, isOneOf, isRole } from './type-guards';
describe('type guards', () => {
  it('recognizes known enum values only', () => { expect(isRole('ADMIN')).toBe(true); expect(isRole('GUEST')).toBe(false); expect(isBookingStatus('PENDING')).toBe(true); expect(isOneOf(['A', 'B'] as const, 7)).toBe(false); });
  it('recognizes the API envelope', () => { expect(isApiResponse({ data: [] })).toBe(true); expect(isApiResponse({ items: [] })).toBe(false); });
  it('requires complete error metadata', () => { expect(isApiErrorBody({ statusCode: 401, error: 'Unauthorized', code: 'UNAUTHORIZED', message: 'Login', path: '/api/me', timestamp: 'now' })).toBe(true); expect(isApiErrorBody({ code: 'UNAUTHORIZED' })).toBe(false); });
});
