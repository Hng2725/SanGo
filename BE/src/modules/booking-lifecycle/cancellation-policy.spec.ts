import { evaluateCancellation, getCancelDeadline } from './cancellation-policy';

describe('cancellation-policy', () => {
  const startAt = new Date('2026-11-20T11:00:00.000Z'); // 18:00 VN

  it('cho phép khách hủy đơn CONFIRMED trước mốc 3 giờ', () => {
    const now = new Date('2026-11-20T08:00:00.000Z'); // trước 3h, mốc là 09:00Z (cancelBeforeHours=2)
    const result = evaluateCancellation({
      status: 'CONFIRMED',
      startAt,
      now,
      cancelBeforeHours: 2,
      actor: 'CUSTOMER',
    });
    expect(result).toEqual({
      allowed: true,
      deadline: new Date('2026-11-20T09:00:00.000Z'),
    });
  });

  it('cho phép khách hủy đơn CONFIRMED đúng bằng mốc hạn hủy', () => {
    const deadline = getCancelDeadline(startAt, 2);
    const result = evaluateCancellation({
      status: 'CONFIRMED',
      startAt,
      now: deadline,
      cancelBeforeHours: 2,
      actor: 'CUSTOMER',
    });
    expect(result).toEqual({ allowed: true, deadline });
  });

  it('từ chối TOO_LATE khi hủy đơn CONFIRMED quá mốc 1 phút', () => {
    const deadline = getCancelDeadline(startAt, 2);
    const now = new Date(deadline.getTime() + 60_000);
    const result = evaluateCancellation({
      status: 'CONFIRMED',
      startAt,
      now,
      cancelBeforeHours: 2,
      actor: 'CUSTOMER',
    });
    expect(result).toEqual({ allowed: false, reason: 'TOO_LATE', deadline });
  });

  it('từ chối ALREADY_STARTED khi now đúng bằng startAt', () => {
    const result = evaluateCancellation({
      status: 'CONFIRMED',
      startAt,
      now: startAt,
      cancelBeforeHours: 2,
      actor: 'CUSTOMER',
    });
    expect(result).toEqual({
      allowed: false,
      reason: 'ALREADY_STARTED',
      deadline: getCancelDeadline(startAt, 2),
    });
  });

  it('từ chối ALREADY_STARTED khi đã qua giờ chơi', () => {
    const now = new Date(startAt.getTime() + 30 * 60_000);
    const result = evaluateCancellation({
      status: 'PENDING',
      startAt,
      now,
      cancelBeforeHours: 2,
      actor: 'CUSTOMER',
    });
    expect(result).toEqual({ allowed: false, reason: 'ALREADY_STARTED', deadline: null });
  });

  it('cho phép hủy đơn PENDING chỉ 10 phút trước giờ chơi', () => {
    const now = new Date(startAt.getTime() - 10 * 60_000);
    const result = evaluateCancellation({
      status: 'PENDING',
      startAt,
      now,
      cancelBeforeHours: 2,
      actor: 'CUSTOMER',
    });
    expect(result).toEqual({ allowed: true, deadline: null });
  });

  it('cho phép hủy tới sát giờ khi cancelBeforeHours = 0', () => {
    const now = new Date(startAt.getTime() - 1000);
    const result = evaluateCancellation({
      status: 'CONFIRMED',
      startAt,
      now,
      cancelBeforeHours: 0,
      actor: 'CUSTOMER',
    });
    expect(result).toEqual({ allowed: true, deadline: startAt });
  });

  it.each(['COMPLETED', 'CANCELLED', 'REJECTED'] as const)(
    'từ chối INVALID_STATUS khi đơn đang ở trạng thái %s',
    (status) => {
      const now = new Date(startAt.getTime() - 5 * 3600_000);
      const result = evaluateCancellation({
        status,
        startAt,
        now,
        cancelBeforeHours: 2,
        actor: 'CUSTOMER',
      });
      expect(result).toEqual({ allowed: false, reason: 'INVALID_STATUS', deadline: null });
    },
  );

  it('ADMIN được phép hủy quá mốc giờ nhưng vẫn phải trước giờ chơi', () => {
    const deadline = getCancelDeadline(startAt, 2);
    const now = new Date(startAt.getTime() - 5 * 60_000);
    expect(
      evaluateCancellation({
        status: 'CONFIRMED',
        startAt,
        now,
        cancelBeforeHours: 2,
        actor: 'ADMIN',
      }),
    ).toEqual({ allowed: true, deadline });

    expect(
      evaluateCancellation({
        status: 'CONFIRMED',
        startAt,
        now: startAt,
        cancelBeforeHours: 2,
        actor: 'ADMIN',
      }),
    ).toEqual({ allowed: false, reason: 'ALREADY_STARTED', deadline });
  });

  it('tính đúng mốc hủy cho đơn qua nửa đêm (startAt 00:00 VN, mốc 22:00 VN hôm trước)', () => {
    // 00:00 VN ngày 21/11 = 17:00 UTC ngày 20/11
    const midnightStart = new Date('2026-11-20T17:00:00.000Z');
    const expectedDeadline = new Date('2026-11-20T15:00:00.000Z'); // 22:00 VN ngày 20/11
    expect(getCancelDeadline(midnightStart, 2)).toEqual(expectedDeadline);

    const justBefore = new Date('2026-11-20T14:59:59.000Z');
    const justAfter = new Date('2026-11-20T15:00:01.000Z');

    expect(
      evaluateCancellation({
        status: 'CONFIRMED',
        startAt: midnightStart,
        now: justBefore,
        cancelBeforeHours: 2,
        actor: 'CUSTOMER',
      }),
    ).toEqual({ allowed: true, deadline: expectedDeadline });

    expect(
      evaluateCancellation({
        status: 'CONFIRMED',
        startAt: midnightStart,
        now: justAfter,
        cancelBeforeHours: 2,
        actor: 'CUSTOMER',
      }),
    ).toEqual({ allowed: false, reason: 'TOO_LATE', deadline: expectedDeadline });
  });
});
