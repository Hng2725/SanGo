import { getAllowedActions } from './allowed-actions';

describe('allowed-actions', () => {
  const startAt = new Date('2026-11-20T11:00:00.000Z');
  const endAt = new Date('2026-11-20T12:00:00.000Z');

  it('OWNER với đơn PENDING trước giờ chơi được CONFIRM và REJECT', () => {
    const actions = getAllowedActions({ status: 'PENDING', startAt, endAt }, 'OWNER', {
      now: new Date('2026-11-20T09:00:00.000Z'),
      cancelBeforeHours: 2,
      hasReview: false,
    });
    expect(actions).toEqual(['CONFIRM', 'REJECT']);
  });

  it('OWNER với đơn PENDING đã tới giờ chơi chỉ được REJECT (không CONFIRM)', () => {
    const actions = getAllowedActions({ status: 'PENDING', startAt, endAt }, 'OWNER', {
      now: startAt,
      cancelBeforeHours: 2,
      hasReview: false,
    });
    expect(actions).toEqual(['REJECT']);
  });

  it('OWNER với đơn CONFIRMED sau endAt được COMPLETE', () => {
    const actions = getAllowedActions({ status: 'CONFIRMED', startAt, endAt }, 'OWNER', {
      now: endAt,
      cancelBeforeHours: 2,
      hasReview: false,
    });
    expect(actions).toEqual(['COMPLETE']);
  });

  it('CUSTOMER với đơn CONFIRMED trước hạn được CANCEL + COMPLAIN; quá hạn chỉ còn COMPLAIN', () => {
    const beforeDeadline = getAllowedActions({ status: 'CONFIRMED', startAt, endAt }, 'CUSTOMER', {
      now: new Date('2026-11-20T08:00:00.000Z'),
      cancelBeforeHours: 2,
      hasReview: false,
    });
    expect(beforeDeadline).toEqual(['CANCEL', 'COMPLAIN']);

    const afterDeadline = getAllowedActions({ status: 'CONFIRMED', startAt, endAt }, 'CUSTOMER', {
      now: new Date('2026-11-20T10:00:00.000Z'),
      cancelBeforeHours: 2,
      hasReview: false,
    });
    expect(afterDeadline).toEqual(['COMPLAIN']);
  });

  it('CUSTOMER với đơn COMPLETED chưa đánh giá có REVIEW và COMPLAIN; đã đánh giá chỉ còn COMPLAIN', () => {
    const noReview = getAllowedActions({ status: 'COMPLETED', startAt, endAt }, 'CUSTOMER', {
      now: new Date('2026-11-20T13:00:00.000Z'),
      cancelBeforeHours: 2,
      hasReview: false,
    });
    expect(noReview).toEqual(['REVIEW', 'COMPLAIN']);

    const hasReview = getAllowedActions({ status: 'COMPLETED', startAt, endAt }, 'CUSTOMER', {
      now: new Date('2026-11-20T13:00:00.000Z'),
      cancelBeforeHours: 2,
      hasReview: true,
    });
    expect(hasReview).toEqual(['COMPLAIN']);
  });
});
