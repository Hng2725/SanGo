import { describe, it, expect } from 'vitest';
import { createMaintenanceSchema } from './maintenance.schema';

describe('createMaintenanceSchema', () => {
  it('chấp nhận lịch bảo trì hợp lệ tròn 60 phút', () => {
    const valid = createMaintenanceSchema.safeParse({
      startAt: '2026-11-25T08:00:00.000Z',
      endAt: '2026-11-25T12:00:00.000Z',
      reason: 'Bảo dưỡng mặt sân cỏ',
    });
    expect(valid.success).toBe(true);
  });

  it('từ chối khi endAt <= startAt', () => {
    const invalid = createMaintenanceSchema.safeParse({
      startAt: '2026-11-25T12:00:00.000Z',
      endAt: '2026-11-25T08:00:00.000Z',
    });
    expect(invalid.success).toBe(false);
  });

  it('từ chối khi không chia hết cho 60 phút', () => {
    const invalid = createMaintenanceSchema.safeParse({
      startAt: '2026-11-25T08:30:00.000Z',
      endAt: '2026-11-25T12:00:00.000Z',
    });
    expect(invalid.success).toBe(false);
  });

  it('từ chối khi khoảng thời gian vượt quá 30 ngày', () => {
    const invalid = createMaintenanceSchema.safeParse({
      startAt: '2026-11-01T08:00:00.000Z',
      endAt: '2026-12-15T08:00:00.000Z',
    });
    expect(invalid.success).toBe(false);
  });
});
