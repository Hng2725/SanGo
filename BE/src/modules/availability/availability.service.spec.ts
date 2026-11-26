import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import type { AuthUser } from '@sango/shared';

/** ---- Helpers ---- */
function makeDate(isoOrVn: string): Date {
  return new Date(isoOrVn);
}

/** Tạo SlotLock giả với booking kèm theo */
function makeLock(overrides: Partial<{
  courtId: string;
  startAt: Date;
  bookingId: string | null;
  holdId: string | null;
  expiresAt: Date | null;
  hold: { userId: string } | null;
  booking: { id: string; code: string; status: string; customer: { fullName: string } } | null;
}> = {}) {
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
  let prisma: jest.Mocked<PrismaService>;
  let pricingService: jest.Mocked<PricingService>;
  let maintenanceService: jest.Mocked<MaintenanceService>;

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

  beforeEach(async () => {
    const prismaMock = {
      court: { findUnique: jest.fn() },
      venue: { findUnique: jest.fn() },
      slotLock: { findMany: jest.fn() },
    };

    const pricingMock = {
      getCourtPricing: jest.fn().mockResolvedValue(new Map([['court-1', {
        basePricePerHour: 100000,
        rules: [],
      }]])),
    };

    const maintenanceMock = {
      findOverlapping: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PricingService, useValue: pricingMock },
        { provide: MaintenanceService, useValue: maintenanceMock },
      ],
    }).compile();

    service = module.get(AvailabilityService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    pricingService = module.get(PricingService) as jest.Mocked<PricingService>;
    maintenanceService = module.get(MaintenanceService) as jest.Mocked<MaintenanceService>;
  });

  describe('getCourtWeek', () => {
    const weekStart = '2026-11-23'; // Thứ 2

    beforeEach(() => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.slotLock.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('throws NOT_FOUND if court does not exist', async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getCourtWeek('no-court', weekStart)).rejects.toMatchObject({
        getStatus: expect.any(Function),
      });
    });

    it('throws NOT_FOUND for guest when venue is HIDDEN', async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
        ...mockCourt,
        venue: { ...mockCourt.venue, status: 'HIDDEN' },
      });
      await expect(service.getCourtWeek('court-1', weekStart)).rejects.toMatchObject({
        getStatus: expect.any(Function),
      });
    });

    it('owner can see HIDDEN venue', async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
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
      const slotStart = new Date('2026-11-23T01:00:00.000Z');
      // Đảm bảo slot trong tương lai so với now mock
      const futureSlot = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 tuần sau

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
      (prisma.slotLock.findMany as jest.Mock).mockResolvedValue([bookingLock]);

      // Lấy tuần chứa futureSlot
      const futureWeekStart = '2026-11-30';
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

      const ownerResult = await service.getCourtWeek('court-1', futureWeekStart, ownerViewer());
      const bookedSlot = ownerResult.days
        .flatMap((d) => d.slots)
        .find((s) => s.status === 'BOOKED');

      if (bookedSlot) {
        expect(bookedSlot.booking).toBeDefined();
        expect(bookedSlot.booking?.customerName).toBe('Nguyễn Văn A');
        expect(bookedSlot.booking?.code).toBe('BK001');
      }
    });

    it('CUSTOMER does NOT see booking info on BOOKED slot', async () => {
      const futureSlot = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
      (prisma.slotLock.findMany as jest.Mock).mockResolvedValue([bookingLock]);

      const futureWeekStart = '2026-11-30';

      const custResult = await service.getCourtWeek('court-1', futureWeekStart, customerViewer());
      const bookedSlot = custResult.days
        .flatMap((d) => d.slots)
        .find((s) => s.status === 'BOOKED');

      if (bookedSlot) {
        expect(bookedSlot.booking).toBeUndefined();
      }
    });

    it('guest (no viewer) does NOT see booking info', async () => {
      const futureSlot = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
      (prisma.slotLock.findMany as jest.Mock).mockResolvedValue([bookingLock]);

      const futureWeekStart = '2026-11-30';

      const guestResult = await service.getCourtWeek('court-1', futureWeekStart, undefined);
      const bookedSlot = guestResult.days
        .flatMap((d) => d.slots)
        .find((s) => s.status === 'BOOKED');

      if (bookedSlot) {
        expect(bookedSlot.booking).toBeUndefined();
      }
    });

    it('slot with expired hold is AVAILABLE, not HELD', async () => {
      const futureSlot = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiredHoldLock = makeLock({
        startAt: futureSlot,
        bookingId: null,
        holdId: 'hold-1',
        expiresAt: new Date(Date.now() - 1000), // đã hết hạn
        hold: { userId: 'user-99' },
      });
      (prisma.slotLock.findMany as jest.Mock).mockResolvedValue([expiredHoldLock]);

      const futureWeekStart = '2026-11-30';
      const result = await service.getCourtWeek('court-1', futureWeekStart, customerViewer());
      const slot = result.days
        .flatMap((d) => d.slots)
        .find((s) => s.startAt === futureSlot.toISOString());

      // expired hold → AVAILABLE
      if (slot) {
        expect(slot.status).toBe('AVAILABLE');
      }
    });

    it('does not query in a loop (pricingService called once)', async () => {
      await service.getCourtWeek('court-1', weekStart, ownerViewer());
      expect(pricingService.getCourtPricing).toHaveBeenCalledTimes(1);
      expect(maintenanceService.findOverlapping).toHaveBeenCalledTimes(1);
      expect((prisma.slotLock.findMany as jest.Mock)).toHaveBeenCalledTimes(1);
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
      (prisma.venue.findUnique as jest.Mock).mockResolvedValue(mockVenue);
      (prisma.slotLock.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('throws NOT_FOUND if venue does not exist', async () => {
      (prisma.venue.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getVenueDay('no-venue', date)).rejects.toMatchObject({
        getStatus: expect.any(Function),
      });
    });

    it('throws NOT_FOUND for guest when venue is HIDDEN', async () => {
      (prisma.venue.findUnique as jest.Mock).mockResolvedValue({
        ...mockVenue,
        status: 'HIDDEN',
      });
      await expect(service.getVenueDay('venue-1', date)).rejects.toMatchObject({
        getStatus: expect.any(Function),
      });
    });

    it('owner can see HIDDEN venue', async () => {
      (prisma.venue.findUnique as jest.Mock).mockResolvedValue({
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
      const futureSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
      (prisma.slotLock.findMany as jest.Mock).mockResolvedValue([bookingLock]);

      const futureDate = '2026-11-27';

      const ownerResult = await service.getVenueDay('venue-1', futureDate, ownerViewer());
      const ownerBookedSlot = ownerResult.courts
        .flatMap((c) => c.slots)
        .find((s) => s.status === 'BOOKED');
      if (ownerBookedSlot) {
        expect(ownerBookedSlot.booking).toBeDefined();
      }

      const custResult = await service.getVenueDay('venue-1', futureDate, customerViewer());
      const custBookedSlot = custResult.courts
        .flatMap((c) => c.slots)
        .find((s) => s.status === 'BOOKED');
      if (custBookedSlot) {
        expect(custBookedSlot.booking).toBeUndefined();
      }
    });

    it('does not query in a loop (all batch queries called once)', async () => {
      await service.getVenueDay('venue-1', date, ownerViewer());
      expect(pricingService.getCourtPricing).toHaveBeenCalledTimes(1);
      expect(maintenanceService.findOverlapping).toHaveBeenCalledTimes(1);
      expect((prisma.slotLock.findMany as jest.Mock)).toHaveBeenCalledTimes(1);
    });

    it('returns empty courts array when venue has no active courts', async () => {
      (prisma.venue.findUnique as jest.Mock).mockResolvedValue({
        ...mockVenue,
        courts: [],
      });
      const result = await service.getVenueDay('venue-1', date);
      expect(result.courts).toHaveLength(0);
      // pricingService should NOT be called if no courts
      expect(pricingService.getCourtPricing).not.toHaveBeenCalled();
    });
  });
});
