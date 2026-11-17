import { describe, expect, it } from 'vitest';
import { getErrorCode, getErrorMessage } from './errors';
const body = { statusCode: 409, error: 'Conflict', code: 'EMAIL_TAKEN', message: 'Email đã được đăng ký', path: '/api/auth/register', timestamp: '2026-11-17T00:00:00Z' };
describe('API error display', () => {
  it('reads a direct API error', () => { expect(getErrorMessage(body)).toBe(body.message); expect(getErrorCode(body)).toBe('EMAIL_TAKEN'); });
  it('reads an RTK Query error envelope', () => { expect(getErrorMessage({ status: 409, data: body })).toBe(body.message); expect(getErrorCode({ data: body })).toBe('EMAIL_TAKEN'); });
  it('falls back for transport errors', () => { expect(getErrorMessage({ status: 'FETCH_ERROR' })).toBe('Không kết nối được máy chủ'); expect(getErrorCode(null)).toBeUndefined(); });
});
