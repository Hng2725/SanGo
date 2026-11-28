import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import type { AuthUser } from '@sango/shared';

function prismaResult<T>(value: T): Prisma.PrismaPromise<T> {
  const promise = Promise.resolve(value);
  void Object.defineProperty(promise, Symbol.toStringTag, { value: 'PrismaPromise' });
  return promise as Prisma.PrismaPromise<T>;
}

/** ---- Helpers ---- */
function makeDate(isoOrVn: string): Date {
  return new Date(isoOrVn);
}

/** Tạo SlotLock giả với booking kèm theo */
function makeLock(
  overrides: Partial<{
    courtId: string;
    startAt: Date;
    bookingId: string | null;
    holdId: string | null;
    expiresAt: Date | null;
    hold: { userId: string } | null;
    booking: { id: string; code: string; status: string; customer: { fullName: string } } | null;
  }> = {},
) {
  return {
    id: 'lock-1',
    courtId: 'court-1',
    startAt: makeDate('2026-11-27T01:00:00.000Z'), // 08:00 VN future
    bookingId: null,
    holdId: null,
    expiresAt: null,
    hold: null,
    booking: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/** Tạo OpeningHour giả: T2–CN 06:00–22:00 (360–1320) */
function makeOpeningHours() {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `oh-${i}`,
    venueId: 'venue-1',
    dayOfWeek: i,
    isClosed: false,
    openMinute: 360,
    closeMinute: 1320,
  }));
}

/** AuthUser OWNER */
function ownerViewer(id = 'owner-1'): AuthUser {
  return {
    id,
    email: 'owner@test.com',
    fullName: 'Owner',
    role: 'OWNER',
    ownerStatus: 'APPROVED',
  };
}

/** AuthUser CUSTOMER */
function customerViewer(): AuthUser {
  return {
    id: 'cust-1',
    email: 'cust@test.com',
    fullName: 'Customer',
    role: 'CUSTOMER',
    ownerStatus: 'NONE',
  };
}

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: DeepMockProxy<PrismaService>;
  let pricingService: DeepMockProxy<PricingService>;
  let maintenanceService: DeepMockProxy<MaintenanceService>;

  const mockCourt = {
    id: 'court-1',
    name: 'Sân A',
    sport: 'BADMINTON' as const,
    isActive: true,
    venueId: 'venue-1',
    basePricePerHour: 100000,
    createdAt: new Date(),
    updatedAt: new Date(),
    venue: {
      id: 'venue-1',
      ownerId: 'owner-1',
      name: 'SanGo Test',
      slug: 'sango-test',
      description: null,
      address: '123 Test',
      district: 'Q1',
      city: 'HCM',
      latitude: null,
      longitude: null,
      phone: null,
      imageUrls: [],
      cancelBeforeHours: 2,
      status: 'ACTIVE' as const,
      avgRating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      openingHours: makeOpeningHours(),
    },
  };

  const provideCourt = (
    value: Prisma.CourtGetPayload<{
      include: { venue: { include: { openingHours: true } } };
    }> | null,
  ) => prisma.court.findUnique.mockResolvedValue(value);
  const provideVenue = (
    value: Prisma.VenueGetPayload<{
      include: { openingHours: true; courts: { select: { id: true; name: true; sport: true } } };
    }> | null,
  ) => prisma.venue.findUnique.mockResolvedValue(value);

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-20T00:00:00.000Z'));
    const prismaMock = mockDeep<PrismaService>();

    const pricingMock = mockDeep<PricingService>();
    pricingMock.getCourtPricing.mockResolvedValue(
      new Map([
        [
          'court-1',
          {
            basePricePerHour: 100000,
            rules: [],
          },
        ],
      ]),
    );

    const maintenanceMock = mockDeep<MaintenanceService>();
    maintenanceMock.findOverlapping.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PricingService, useValue: pricingMock },
        { provide: MaintenanceService, useValue: maintenanceMock },
      ],
    }).compile();

    service = module.get(AvailabilityService);
    prisma = prismaMock;
    pricingService = pricingMock;
    maintenanceService = maintenanceMock;
  });

  afterEach(() => jest.useRealTimers());

  describe('getCourtWeek', () => {
    const weekStart = '2026-11-23'; // Thứ 2

    beforeEach(() => {
      provideCourt(mockCourt);
      prisma.slotLock.findMany.mockResolvedValue([]);
    });

    it('includes Sunday overnight reservations and maintenance after the calendar week ends', async () => {
      provideCourt({
        ...mockCourt,
        venue: {
          ...mockCourt.venue,
          openingHours: makeOpeningHours().map((hour) => ({
            ...hour,
            openMinute: 1080,
            closeMinute: 1560,
          })),
        },
      });
      const startAt = new Date('2026-11-29T18:00:00.000Z'); // Monday 01:00 VN belongs to Sunday's shift.
      prisma.slotLock.findMany.mockImplementation((args) => {
        const range = args?.where?.startAt;
        const included =
          range &&
          typeof range === 'object' &&
          'lt' in range &&
          range.lt instanceof Date &&
          range.lt > startAt;
        return prismaResult(
          included
            ? [
                makeLock({
                  startAt,
                  bookingId: 'booking-1',
                  booking: {
                    id: 'booking-1',
                    code: 'SGTEST',
                    status: 'CONFIRMED',
                    customer: { fullName: 'Khách' },
                  },
                }),
              ]
            : [],
        );
      });
      const result = await service.getCourtWeek('court-1', weekStart);
      expect(
        result.days[6].slots.find((slot) => slot.startAt === startAt.toISOString())?.status,
      ).toBe('BOOKED');
      expect(maintenanceService.findOverlapping.mock.calls[0][2].getTime()).toBeGreaterThan(
        startAt.getTime(),
      );
    });

    it('throws NOT_FOUND if court does not exist', async () => {
      provideCourt(null);
      await expect(service.getCourtWeek('no-court', weekStart)).rejects.toBeInstanceOf(
        AppException,
      );
    });

    it('throws NOT_FOUND for guest when venue is HIDDEN', async () => {
      provideCourt({
        ...mockCourt,
        venue: { ...mockCourt.venue, status: 'HIDDEN' },
      });
      await expect(service.getCourtWeek('court-1', weekStart)).rejects.toBeInstanceOf(AppException);
    });

    it('owner can see HIDDEN venue', async () => {
      provideCourt({
        ...mockCourt,
        venue: { ...mockCourt.venue, status: 'HIDDEN' },
      });
      const result = await service.getCourtWeek('court-1', weekStart, ownerViewer());
      expect(result.court.id).toBe('court-1');
    });

    it('returns 7 days with correct weekStart', async () => {
      const result = await service.getCourtWeek('court-1', weekStart);
      expect(result.weekStart).toBe(weekStart);
      expect(result.days).toHaveLength(7);
      expect(result.days[0].date).toBe(weekStart);
    });

    it('OWNER sees booking info on BOOKED slot', async () => {
      // Khung 08:00 VN ngày 2026-11-23 (Thứ 2) = UTC 2026-11-23T01:00:00Z

      // Đảm bảo slot trong tương lai so với now mock
      const futureSlot = new Date('2026-11-30T01:00:00.000Z'); // 1 tuần sau

      const bookingLock = makeLock({
        startAt: futureSlot,
        bookingId: 'booking-1',
        booking: {
          id: 'booking-1',
          code: 'BK001',
          status: 'CONFIRMED',
          customer: { fullName: 'Nguyễn Văn A' },
        },
      });
      prisma.slotLock.findMany.mockResolvedValue([bookingLock]);

      // Lấy tuần chứa futureSlot
      const futureWeekStart = '2026-11-30';
      provideCourt(mockCourt);

      const ownerResult = await service.getCourtWeek('court-1', futureWeekStart, ownerViewer());
      const bookedSlot = ownerResult.days
        .flatMap((d) => d.slots)
        .find((s) => s.status === 'BOOKED');

      expect(bookedSlot).toBeDefined();
      if (bookedSlot) {
        expect(bookedSlot.booking).toBeDefined();
        expect(bookedSlot.booking?.customerName).toBe('Nguyễn Văn A');
        expect(bookedSlot.booking?.code).toBe('BK001');
      }
    });

    it('CUSTOMER does NOT see booking info on BOOKED slot', async () => {
      const futureSlot = new Date('2026-11-30T01:00:00.000Z');
      const bookingLock = makeLock({
        startAt: futureSlot,
        bookingId: 'booking-1',
        booking: {
          id: 'booking-1',
          code: 'BK001',
          status: 'CONFIRMED',
          customer: { fullName: 'Nguyễn Văn A' },
        },
      });
      prisma.slotLock.findMany.mockResolvedValue([bookingLock]);

      const futureWeekStart = '2026-11-30';

      const custResult = await service.getCourtWeek('court-1', futureWeekStart, customerViewer());
      const bookedSlot = custResult.days.flatMap((d) => d.slots).find((s) => s.status === 'BOOKED');

      expect(bookedSlot).toBeDefined();
      if (bookedSlot) {
        expect(bookedSlot.booking).toBeUndefined();
      }
    });

    it('guest (no viewer) does NOT see booking info', async () => {
      const futureSlot = new Date('2026-11-30T01:00:00.000Z');
      const bookingLock = makeLock({
        startAt: futureSlot,
        bookingId: 'booking-1',
        booking: {
          id: 'booking-1',
          code: 'BK001',
          status: 'CONFIRMED',
          customer: { fullName: 'Nguyễn Văn A' },
        },
      });
      prisma.slotLock.findMany.mockResolvedValue([bookingLock]);

      const futureWeekStart = '2026-11-30';

      const guestResult = await service.getCourtWeek('court-1', futureWeekStart, undefined);
      const bookedSlot = guestResult.days
        .flatMap((d) => d.slots)
        .find((s) => s.status === 'BOOKED');

      expect(bookedSlot).toBeDefined();
      if (bookedSlot) {
        expect(bookedSlot.booking).toBeUndefined();
      }
    });

    it('slot with expired hold is AVAILABLE, not HELD', async () => {
      const futureSlot = new Date('2026-11-30T01:00:00.000Z');
      const expiredHoldLock = makeLock({
        startAt: futureSlot,
        bookingId: null,
        holdId: 'hold-1',
        expiresAt: new Date(Date.now() - 1000), // đã hết hạn
        hold: { userId: 'user-99' },
      });
      prisma.slotLock.findMany.mockResolvedValue([expiredHoldLock]);

      const futureWeekStart = '2026-11-30';
      const result = await service.getCourtWeek('court-1', futureWeekStart, customerViewer());
      const slot = result.days
        .flatMap((d) => d.slots)
        .find((s) => s.startAt === futureSlot.toISOString());

      // expired hold → AVAILABLE
      expect(slot).toBeDefined();
      if (slot) {
        expect(slot.status).toBe('AVAILABLE');
      }
    });

    it('does not query in a loop (pricingService called once)', async () => {
      await service.getCourtWeek('court-1', weekStart, ownerViewer());
      expect(pricingService.getCourtPricing.mock.calls).toHaveLength(1);
      expect(maintenanceService.findOverlapping.mock.calls).toHaveLength(1);
      expect(prisma.slotLock.findMany.mock.calls).toHaveLength(1);
    });
  });

  describe('getVenueDay', () => {
    const date = '2026-11-23';

    const mockVenue = {
      id: 'venue-1',
      ownerId: 'owner-1',
      name: 'SanGo Test',
      slug: 'sango-test',
      description: null,
      address: '123 Test',
      district: 'Q1',
      city: 'HCM',
      latitude: null,
      longitude: null,
      phone: null,
      imageUrls: [],
      cancelBeforeHours: 2,
      status: 'ACTIVE' as const,
      avgRating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      openingHours: makeOpeningHours(),
      courts: [{ id: 'court-1', name: 'Sân A', sport: 'BADMINTON' as const }],
    };

    beforeEach(() => {
      provideVenue(mockVenue);
      prisma.slotLock.findMany.mockResolvedValue([]);
    });

    it('includes maintenance after midnight in an operating day', async () => {
      provideVenue({
        ...mockVenue,
        openingHours: makeOpeningHours().map((hour) => ({
          ...hour,
          openMinute: 1080,
          closeMinute: 1560,
        })),
      });
      const startAt = new Date('2026-11-23T18:00:00.000Z');
      maintenanceService.findOverlapping.mockImplementation((_ids, _start, end) =>
        Promise.resolve(
          end > startAt
            ? [
                {
                  id: 'maintenance-1',
                  createdById: 'owner-1',
                  courtId: 'court-1',
                  startAt,
                  endAt: new Date(startAt.getTime() + 3600000),
                  reason: 'Bảo trì',
                  createdAt: new Date(),
                },
              ]
            : [],
        ),
      );
      const result = await service.getVenueDay('venue-1', date);
      expect(
        result.courts[0].slots.find((slot) => slot.startAt === startAt.toISOString())?.status,
      ).toBe('MAINTENANCE');
    });

    it('throws NOT_FOUND if venue does not exist', async () => {
      provideVenue(null);
      await expect(service.getVenueDay('no-venue', date)).rejects.toBeInstanceOf(AppException);
    });

    it('throws NOT_FOUND for guest when venue is HIDDEN', async () => {
      provideVenue({
        ...mockVenue,
        status: 'HIDDEN',
      });
      await expect(service.getVenueDay('venue-1', date)).rejects.toBeInstanceOf(AppException);
    });

    it('owner can see HIDDEN venue', async () => {
      provideVenue({
        ...mockVenue,
        status: 'HIDDEN',
      });
      const result = await service.getVenueDay('venue-1', date, ownerViewer());
      expect(result.venueId).toBe('venue-1');
    });

    it('returns correct venueId and date', async () => {
      const result = await service.getVenueDay('venue-1', date);
      expect(result.venueId).toBe('venue-1');
      expect(result.date).toBe(date);
    });

    it('OWNER sees booking info, CUSTOMER does not', async () => {
      const futureSlot = new Date('2026-11-27T01:00:00.000Z');
      const bookingLock = makeLock({
        courtId: 'court-1',
        startAt: futureSlot,
        bookingId: 'booking-1',
        booking: {
          id: 'booking-1',
          code: 'BK001',
          status: 'CONFIRMED',
          customer: { fullName: 'Nguyễn Văn A' },
        },
      });
      prisma.slotLock.findMany.mockResolvedValue([bookingLock]);

      const futureDate = '2026-11-27';

      const ownerResult = await service.getVenueDay('venue-1', futureDate, ownerViewer());
      const ownerBookedSlot = ownerResult.courts
        .flatMap((c) => c.slots)
        .find((s) => s.status === 'BOOKED');
      expect(ownerBookedSlot).toBeDefined();
      if (ownerBookedSlot) {
        expect(ownerBookedSlot.booking).toBeDefined();
      }

      const custResult = await service.getVenueDay('venue-1', futureDate, customerViewer());
      const custBookedSlot = custResult.courts
        .flatMap((c) => c.slots)
        .find((s) => s.status === 'BOOKED');
      expect(custBookedSlot).toBeDefined();
      if (custBookedSlot) {
        expect(custBookedSlot.booking).toBeUndefined();
      }
    });

    it('does not query in a loop (all batch queries called once)', async () => {
      await service.getVenueDay('venue-1', date, ownerViewer());
      expect(pricingService.getCourtPricing.mock.calls).toHaveLength(1);
      expect(maintenanceService.findOverlapping.mock.calls).toHaveLength(1);
      expect(prisma.slotLock.findMany.mock.calls).toHaveLength(1);
    });

    it('returns empty courts array when venue has no active courts', async () => {
      provideVenue({
        ...mockVenue,
        courts: [],
      });
      const result = await service.getVenueDay('venue-1', date);
      expect(result.courts).toHaveLength(0);
      // pricingService should NOT be called if no courts
      expect(pricingService.getCourtPricing.mock.calls).toHaveLength(0);
    });
  });
});
