import { EventEmitter2 } from '@nestjs/event-emitter';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import type { AuthUser } from '@sango/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingLifecycleService } from '../booking-lifecycle/booking-lifecycle.service';
import { BookingsService } from '../bookings/bookings.service';
import { SlotLockService } from '../bookings/slot-lock.service';
import { PricingService } from '../pricing/pricing.service';
import { RecurringService } from './recurring.service';

describe('RecurringService', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let bookingsService: jest.Mocked<BookingsService>;
  let slotLockService: jest.Mocked<SlotLockService>;
  let pricingService: jest.Mocked<PricingService>;
  let bookingLifecycleService: jest.Mocked<BookingLifecycleService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let service: RecurringService;

  const customer: AuthUser = {
    id: 'cust-1',
    email: 'c@sango.vn',
    fullName: 'Khách',
    role: 'CUSTOMER',
    ownerStatus: 'NONE',
  };

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    bookingsService = {
      assertSlotsBookable: jest.fn().mockResolvedValue(undefined),
      createBookingInTx: jest.fn().mockResolvedValue({ id: 'bk-new' }),
    } as unknown as jest.Mocked<BookingsService>;
    slotLockService = {
      findLocked: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SlotLockService>;
    pricingService = {
      quote: jest.fn().mockResolvedValue({ total: 150_000, breakdown: [] }),
    } as unknown as jest.Mocked<PricingService>;
    bookingLifecycleService = {
      transitionInTx: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<BookingLifecycleService>;
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    service = new RecurringService(
      prisma,
      bookingsService,
      slotLockService,
      pricingService,
      bookingLifecycleService,
      eventEmitter,
    );
  });

  it('trả 409 SLOT_ALREADY_BOOKED khi có tuần trùng và skipConflicts = false', async () => {
    prisma.court.findUnique.mockResolvedValue({
      id: 'court-1',
      venueId: 'venue-1',
      isActive: true,
      venue: { id: 'venue-1', status: 'ACTIVE' },
    } as never);

    // Tuần 1 trống, tuần 2 bị đặt
    slotLockService.findLocked.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        startAt: new Date('2026-12-08T11:00:00.000Z'),
        bookingId: 'bk-existing',
        holdId: null,
        expiresAt: null,
      },
    ]);

    await expect(
      service.create('cust-1', {
        courtId: 'court-1',
        firstDate: '2026-12-01',
        startMinute: 1080,
        slotCount: 1,
        weeks: 2,
        contactPhone: '0901234567',
        skipConflicts: false,
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'SLOT_ALREADY_BOOKED',
        details: { conflictedDates: ['2026-12-08'] },
      }),
    });
  });

  it('tạo đúng số đơn khi skipConflicts = true và trả về skippedDates', async () => {
    prisma.court.findUnique.mockResolvedValue({
      id: 'court-1',
      venueId: 'venue-1',
      isActive: true,
      venue: { id: 'venue-1', status: 'ACTIVE' },
    } as never);

    slotLockService.findLocked
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          startAt: new Date('2026-12-08T11:00:00.000Z'),
          bookingId: 'bk-existing',
          holdId: null,
          expiresAt: null,
        },
      ])
      .mockResolvedValueOnce([]);

    prisma.recurringSeries.create.mockResolvedValue({ id: 'series-1' } as never);
    prisma.recurringSeries.findUniqueOrThrow.mockResolvedValue({
      id: 'series-1',
      customerId: 'cust-1',
      courtId: 'court-1',
      dayOfWeek: 2,
      startMinute: 1080,
      slotCount: 1,
      firstDate: '2026-12-01',
      weeks: 3,
      status: 'ACTIVE',
      createdAt: new Date('2026-11-27T10:00:00.000Z'),
      court: {
        id: 'court-1',
        name: 'Sân 1',
        sport: 'FOOTBALL',
        venue: { id: 'venue-1', name: 'Sân A', slug: 'san-a', address: '123 A', ownerId: 'o1' },
      },
      bookings: [{ status: 'PENDING' }, { status: 'PENDING' }],
    } as never);
    prisma.booking.findMany.mockResolvedValue([] as never);

    const res = await service.create('cust-1', {
      courtId: 'court-1',
      firstDate: '2026-12-01',
      startMinute: 1080,
      slotCount: 1,
      weeks: 3,
      contactPhone: '0901234567',
      skipConflicts: true,
    });

    expect(bookingsService.createBookingInTx).toHaveBeenCalledTimes(2);
    expect(res.skippedDates).toEqual(['2026-12-08']);
  });

  it('hủy chuỗi chỉ hủy các đơn còn trong hạn và bỏ qua đơn quá hạn hủy', async () => {
    const farFuture = new Date(Date.now() + 24 * 3600_000);
    const tooClose = new Date(Date.now() + 30 * 60_000); // 30p < cancelBeforeHours=2

    prisma.recurringSeries.findUnique.mockResolvedValue({
      id: 'series-1',
      customerId: 'cust-1',
      bookings: [
        {
          id: 'bk-ok',
          status: 'CONFIRMED',
          startAt: farFuture,
          court: { venue: { cancelBeforeHours: 2 } },
        },
        {
          id: 'bk-late',
          status: 'CONFIRMED',
          startAt: tooClose,
          court: { venue: { cancelBeforeHours: 2 } },
        },
      ],
    } as never);

    prisma.recurringSeries.update.mockResolvedValue({
      id: 'series-1',
      customerId: 'cust-1',
      courtId: 'court-1',
      dayOfWeek: 2,
      startMinute: 1080,
      slotCount: 1,
      firstDate: '2026-12-01',
      weeks: 2,
      status: 'CANCELLED',
      createdAt: new Date('2026-11-27T10:00:00.000Z'),
      court: {
        id: 'court-1',
        name: 'Sân 1',
        sport: 'FOOTBALL',
        venue: { id: 'venue-1', name: 'Sân A', slug: 'san-a', address: '123 A', ownerId: 'o1' },
      },
      bookings: [{ status: 'CANCELLED' }, { status: 'CONFIRMED' }],
    } as never);

    const res = await service.cancelSeries('series-1', customer);

    expect(res.cancelledCount).toBe(1);
    expect(res.skippedCount).toBe(1);
    expect(bookingLifecycleService.transitionInTx).toHaveBeenCalledTimes(1);
  });
});
