import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import type { AuthUser } from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { SlotLockService } from '../bookings/slot-lock.service';
import { BookingLifecycleCron } from './booking-lifecycle.cron';
import { BookingLifecycleService } from './booking-lifecycle.service';

describe('BookingLifecycleService & Cron', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let slotLockService: jest.Mocked<SlotLockService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let service: BookingLifecycleService;
  let cron: BookingLifecycleCron;

  const customerUser: AuthUser = {
    id: 'cust-1',
    email: 'c@sango.vn',
    fullName: 'Khách',
    role: 'CUSTOMER',
    ownerStatus: 'NONE',
  };

  const ownerUser: AuthUser = {
    id: 'owner-1',
    email: 'o@sango.vn',
    fullName: 'Chủ sân',
    role: 'OWNER',
    ownerStatus: 'APPROVED',
  };

  const makeRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'bk-1',
    code: 'SG261120ABCD',
    customerId: 'cust-1',
    courtId: 'court-1',
    startAt: new Date('2026-11-20T11:00:00.000Z'),
    endAt: new Date('2026-11-20T12:00:00.000Z'),
    totalPrice: 150000,
    priceBreakdown: [],
    status: 'PENDING' as const,
    contactPhone: '0901234567',
    note: null,
    cancelReason: null,
    rejectReason: null,
    confirmedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    completedAt: null,
    recurringSeriesId: null,
    createdAt: new Date('2026-11-19T10:00:00.000Z'),
    updatedAt: new Date('2026-11-19T10:00:00.000Z'),
    court: {
      id: 'court-1',
      name: 'Sân 1',
      sport: 'FOOTBALL' as const,
      venue: {
        id: 'venue-1',
        name: 'Sân A',
        slug: 'san-a',
        address: '123 Đường A',
        ownerId: 'owner-1',
        cancelBeforeHours: 2,
      },
    },
    customer: {
      id: 'cust-1',
      fullName: 'Khách',
      phone: '0901234567',
    },
    review: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-20T08:00:00.000Z'));
    prisma = mockDeep<PrismaService>();
    slotLockService = {
      releaseBooking: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SlotLockService>;
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    prisma.$transaction.mockImplementation((fn) => fn(prisma));

    service = new BookingLifecycleService(prisma, slotLockService, eventEmitter);
    cron = new BookingLifecycleCron(prisma, service);
  });

  afterEach(() => jest.useRealTimers());

  it('đơn chờ xác nhận không hiển thị hạn hủy dành cho đơn đã xác nhận', async () => {
    prisma.booking.findUnique.mockResolvedValue(makeRecord({ status: 'PENDING' }));
    const detail = await service.getDetail('bk-1', customerUser);
    expect(detail.allowedActions).toContain('CANCEL');
    expect(detail.cancelDeadline).toBeNull();
  });

  it('từ chối chuyển trạng thái không hợp lệ (COMPLETED -> CANCELLED) với 409', async () => {
    prisma.booking.findUnique.mockResolvedValue(makeRecord({ status: 'COMPLETED' }));

    await expect(
      service.transition('bk-1', 'CANCELLED', 'CUSTOMER', customerUser),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'INVALID_STATUS_TRANSITION' },
    });
  });

  it('từ chối chủ sân khác với 403 FORBIDDEN', async () => {
    prisma.booking.findUnique.mockResolvedValue(makeRecord());

    await expect(
      service.transition('bk-1', 'CONFIRMED', 'OWNER', { ...ownerUser, id: 'other-owner' }),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: 'FORBIDDEN' },
    });
  });

  it('từ chối hủy đơn CONFIRMED quá hạn với 409 CANCELLATION_NOT_ALLOWED', async () => {
    prisma.booking.findUnique.mockResolvedValue(makeRecord({ status: 'CONFIRMED' }));

    // startAt = 11:00Z, cancelBeforeHours = 2 => deadline = 09:00Z; now = 10:00Z
    await expect(
      service.transition('bk-1', 'CANCELLED', 'CUSTOMER', customerUser, {
        now: new Date('2026-11-20T10:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'CANCELLATION_NOT_ALLOWED' },
    });
  });

  it('hủy đơn thành công giải phóng SlotLock và phát sự kiện', async () => {
    const initial = makeRecord({ status: 'PENDING' });
    const cancelled = makeRecord({
      status: 'CANCELLED',
      cancelledAt: new Date('2026-11-20T08:00:00.000Z'),
      cancelReason: 'Bận việc',
    });
    prisma.booking.findUnique.mockResolvedValueOnce(initial).mockResolvedValueOnce(cancelled);
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.transition('bk-1', 'CANCELLED', 'CUSTOMER', customerUser, {
      reason: 'Bận việc',
      now: new Date('2026-11-20T08:00:00.000Z'),
    });

    expect(result.status).toBe('CANCELLED');
    expect(slotLockService.releaseBooking.mock.calls).toHaveLength(1);
    expect(eventEmitter.emit.mock.calls).toEqual([['booking.cancelled', { bookingId: 'bk-1' }]]);
  });

  it('trả 409 INVALID_STATUS_TRANSITION khi khóa lạc quan updateMany trả count = 0', async () => {
    prisma.booking.findUnique.mockResolvedValue(makeRecord({ status: 'PENDING' }));
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });

    try {
      await service.transition('bk-1', 'CONFIRMED', 'OWNER', ownerUser, {
        now: new Date('2026-11-20T08:00:00.000Z'),
      });
      fail('Phải ném lỗi');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getStatus()).toBe(409);
    }
  });

  it('cron tự động hoàn thành đơn CONFIRMED đã kết thúc và từ chối đơn PENDING quá giờ', async () => {
    prisma.booking.findMany
      .mockResolvedValueOnce([{ id: 'bk-complete' }] as never)
      .mockResolvedValueOnce([{ id: 'bk-reject' }] as never);

    const transitionSpy = jest.spyOn(service, 'transition').mockResolvedValue({} as never);

    const res = await cron.handleLifecycleTransitions();

    expect(res).toEqual({ completed: 1, rejected: 1 });
    expect(transitionSpy).toHaveBeenNthCalledWith(
      1,
      'bk-complete',
      'COMPLETED',
      'SYSTEM',
      undefined,
      expect.objectContaining({ now: new Date('2026-11-20T08:00:00.000Z') }),
    );
    expect(transitionSpy).toHaveBeenNthCalledWith(
      2,
      'bk-reject',
      'REJECTED',
      'SYSTEM',
      undefined,
      expect.objectContaining({ reason: 'Quá hạn xác nhận' }),
    );
  });
});
