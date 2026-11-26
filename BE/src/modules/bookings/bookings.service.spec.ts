import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingsService } from './bookings.service';
import { SlotLockService } from './slot-lock.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { AppException } from '../../common/exceptions/app.exception';
import { Prisma } from '@prisma/client';

// --- Helpers ---
const mockCourtActive = {
  id: 'court-1',
  venueId: 'venue-1',
  isActive: true,
  venue: { id: 'venue-1', status: 'ACTIVE' },
};
const mockOpeningHours = [
  // Thursday dayOfWeek=4, 06:00-22:00
  { id: '1', venueId: 'venue-1', dayOfWeek: 4, isClosed: false, openMinute: 360, closeMinute: 1320 },
];
const mockQuote = {
  total: 150000,
  breakdown: [{ startAt: '2030-11-28T04:00:00.000Z', endAt: '2030-11-28T05:00:00.000Z', price: 150000, label: null }],
};
// 2030-11-28 is a Thursday; 11:00 VN = 04:00 UTC
const makeInput = (overrides = {}) => ({
  courtId: 'court-1',
  startAt: '2030-11-28T04:00:00.000Z',
  endAt: '2030-11-28T05:00:00.000Z',
  contactPhone: '0901234567',
  ...overrides,
});

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: Record<string, unknown>;
  let slotLockService: Record<string, jest.Mock>;
  let pricingService: Record<string, jest.Mock>;
  let maintenanceService: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;

  const txMock: Record<string, unknown> = {};

  beforeEach(async () => {
    // Build tx mock
    txMock.court = { findUnique: jest.fn().mockResolvedValue(mockCourtActive) };
    txMock.openingHour = { findMany: jest.fn().mockResolvedValue(mockOpeningHours) };
    txMock.booking = {
      create: jest.fn().mockResolvedValue({ id: 'booking-1', code: 'SG2611260001' }),
      findUniqueOrThrow: jest.fn(),
    };
    txMock.bookingHold = { findUnique: jest.fn(), deleteMany: jest.fn(), delete: jest.fn() };
    txMock.slotLock = { updateMany: jest.fn(), createMany: jest.fn() };

    slotLockService = {
      lockForBooking: jest.fn().mockResolvedValue(undefined),
      purgeExpiredHoldLocks: jest.fn().mockResolvedValue(undefined),
      releaseBooking: jest.fn().mockResolvedValue(undefined),
      findLocked: jest.fn().mockResolvedValue([]),
    };

    pricingService = {
      quote: jest.fn().mockResolvedValue(mockQuote),
      getCourtPricing: jest.fn(),
    };

    maintenanceService = {
      findOverlapping: jest.fn().mockResolvedValue([]),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const mockBookingWithRelations = {
      id: 'booking-1',
      code: 'SG2611260001',
      status: 'PENDING',
      startAt: new Date('2030-11-28T04:00:00.000Z'),
      endAt: new Date('2030-11-28T05:00:00.000Z'),
      totalPrice: 150000,
      priceBreakdown: mockQuote.breakdown,
      contactPhone: '0901234567',
      note: null,
      cancelReason: null,
      rejectReason: null,
      recurringSeriesId: null,
      createdAt: new Date('2030-11-28T03:00:00.000Z'),
      court: {
        id: 'court-1',
        name: 'Sân 1',
        sport: 'BADMINTON',
        venue: { id: 'venue-1', name: 'Cụm sân A', slug: 'cum-san-a', address: '123 ABC' },
      },
      customer: { id: 'cust-1', fullName: 'Nguyễn Văn A', phone: '0901234567' },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txMock)),
      booking: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockBookingWithRelations),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlotLockService, useValue: slotLockService },
        { provide: PricingService, useValue: pricingService },
        { provide: MaintenanceService, useValue: maintenanceService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(BookingsService);
  });

  it('should create a booking successfully', async () => {
    const result = await service.createBooking('cust-1', makeInput());
    expect(result.id).toBe('booking-1');
    expect(result.status).toBe('PENDING');
    expect(eventEmitter.emit).toHaveBeenCalledWith('booking.created', { bookingId: 'booking-1' });
  });

  it('should throw 409 SLOT_UNAVAILABLE when slot is in the past', async () => {
    (txMock.court as { findUnique: jest.Mock }).findUnique.mockResolvedValue(mockCourtActive);
    // startAt in the past
    const pastInput = makeInput({
      startAt: '2020-01-01T04:00:00.000Z',
      endAt: '2020-01-01T05:00:00.000Z',
    });
    await expect(service.createBooking('cust-1', pastInput)).rejects.toThrow(AppException);
    try {
      await service.createBooking('cust-1', pastInput);
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).getStatus()).toBe(HttpStatus.CONFLICT);
    }
  });

  it('should throw 409 SLOT_UNAVAILABLE when overlapping maintenance', async () => {
    maintenanceService.findOverlapping.mockResolvedValue([{ id: 'maint-1' }]);
    await expect(service.createBooking('cust-1', makeInput())).rejects.toThrow(AppException);
  });

  it('should throw 409 SLOT_ALREADY_BOOKED on P2002 (non-code)', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['courtId', 'startAt'] },
    });
    (prisma.$transaction as jest.Mock).mockRejectedValue(p2002);
    await expect(service.createBooking('cust-1', makeInput())).rejects.toThrow(AppException);
    try {
      await service.createBooking('cust-1', makeInput());
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).getResponse()).toMatchObject({ code: 'SLOT_ALREADY_BOOKED' });
    }
  });

  it('should retry once on P2002 for code collision', async () => {
    const p2002Code = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['code'] },
    });
    let callCount = 0;
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      callCount++;
      if (callCount === 1) throw p2002Code;
      return fn(txMock);
    });
    const result = await service.createBooking('cust-1', makeInput());
    expect(result.id).toBe('booking-1');
    expect(callCount).toBe(2);
  });

  it('should throw 409 HOLD_EXPIRED when hold has expired', async () => {
    const expiredHold = {
      id: 'hold-1',
      userId: 'cust-1',
      courtId: 'court-1',
      startAt: new Date('2026-11-26T04:00:00.000Z'),
      endAt: new Date('2026-11-26T05:00:00.000Z'),
      expiresAt: new Date('2020-01-01T00:00:00.000Z'), // expired
    };
    (txMock.bookingHold as { findUnique: jest.Mock }).findUnique.mockResolvedValue(expiredHold);

    await expect(
      service.createBooking('cust-1', makeInput({ holdId: 'hold-1' })),
    ).rejects.toThrow(AppException);
  });

  it('should throw 409 HOLD_EXPIRED when hold belongs to another user', async () => {
    const otherUserHold = {
      id: 'hold-1',
      userId: 'other-user',
      courtId: 'court-1',
      startAt: new Date('2026-11-26T04:00:00.000Z'),
      endAt: new Date('2026-11-26T05:00:00.000Z'),
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    };
    (txMock.bookingHold as { findUnique: jest.Mock }).findUnique.mockResolvedValue(otherUserHold);

    await expect(
      service.createBooking('cust-1', makeInput({ holdId: 'hold-1' })),
    ).rejects.toThrow(AppException);
  });
});
