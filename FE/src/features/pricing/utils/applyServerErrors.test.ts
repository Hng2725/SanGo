import { describe, it, expect, vi } from 'vitest';
import { applyServerErrors } from './applyServerErrors';

describe('applyServerErrors', () => {
  it('maps the RTK Query rejection envelope to the field errors', () => {
    const setError = vi.fn();
    applyServerErrors(setError, { status: 400, data: {
      statusCode: 400, error: 'Bad Request', code: 'VALIDATION_ERROR',
      message: 'Validation failed', path: '/pricing', timestamp: '2026-11-20T12:00:00Z',
      details: [{ path: ['rules', 0, 'startMinute'], message: 'Khung giờ bị trùng' }],
    } });
    expect(setError).toHaveBeenCalledWith('rules.0.startMinute', {
      type: 'server', message: 'Khung giờ bị trùng',
    });
  });
  it('không làm gì nếu lỗi không đúng format ApiErrorBody', () => {
    const setError = vi.fn();
    applyServerErrors(setError, null);
    applyServerErrors(setError, { message: 'Some error' });
    expect(setError).not.toHaveBeenCalled();
  });

  it('gọi setError với đúng fieldPath và message từ details của server', () => {
    const setError = vi.fn();
    const serverError = {
      statusCode: 400,
      error: 'Bad Request',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      path: '/api/owner/courts/1/pricing',
      timestamp: '2026-11-20T12:00:00.000Z',
      details: [
        {
          path: ['rules', 0, 'startMinute'],
          message: 'Khung giờ bị trùng',
        },
        {
          path: ['basePricePerHour'],
          message: 'Giá không hợp lệ',
        },
      ],
    };

    applyServerErrors(setError, serverError);

    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith('rules.0.startMinute', {
      type: 'server',
      message: 'Khung giờ bị trùng',
    });
    expect(setError).toHaveBeenCalledWith('basePricePerHour', {
      type: 'server',
      message: 'Giá không hợp lệ',
    });
  });
});
