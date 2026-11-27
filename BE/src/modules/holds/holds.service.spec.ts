import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { HoldsService } from './holds.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { SlotLockService } from '../bookings/slot-lock.service';
import { AppException } from '../../common/exceptions/app.exception';
import { Prisma } from '@prisma/client';

const mockCourtActive = {
  id: 'court-1',
  venueId: 'venue-1',
  isActive: true,
  venue: { id: 'venue-1', status: 'ACTIVE' },
};
const mockOpeningHours = [
  // Thursday dayOfWeek=4, 06:00-22:00
  {
    id: '1',
    venueId: 'venue-1',
    dayOfWeek: 4,
    isClosed: false,
    openMinute: 360,
    closeMinute: 1320,
  },
];

describe('HoldsService', () => {
  let service: HoldsService;
  let prisma: Record<string, unknown>;
  let bookingsService: Record<string, jest.Mock>;
  let slotLockService: Record<string, jest.Mock>;

  const txMock: Record<string, unknown> = {};

  beforeEach(async () => {
    txMock.bookingHold = {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({
        id: 'hold-1',
        userId: 'user-1',
        courtId: 'court-1',
        startAt: new Date('2030-11-28T04:00:00.000Z'),
        endAt: new Date('2030-11-28T05:00:00.000Z'),
        expiresAt: new Date('2030-11-28T04:05:00.000Z'),
      }),
    };
    txMock.court = { findUnique: jest.fn().mockResolvedValue(mockCourtActive) };
    txMock.openingHour = { findMany: jest.fn().mockResolvedValue(mockOpeningHours) };
    txMock.slotLock = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };

    bookingsService = {
      assertSlotsBookable: jest.fn().mockResolvedValue(undefined),
    };

    slotLockService = {
      purgeExpiredHoldLocks: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      $transaction: jest
        .fn()
        .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txMock)),
      bookingHold: {
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        HoldsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BookingsService, useValue: bookingsService },
        { provide: SlotLockService, useValue: slotLockService },
      ],
    }).compile();

    service = moduleRef.get(HoldsService);
  });

  it('should create a hold successfully', async () => {
    const result = await service.createHold('user-1', {
      courtId: 'court-1',
      startAt: '2030-11-28T04:00:00.000Z',
      endAt: '2030-11-28T05:00:00.000Z',
    });
    expect(result.id).toBe('hold-1');
    expect(result.courtId).toBe('court-1');
  });

  it('should throw 409 on P2002 (slot already taken)', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['courtId', 'startAt'] },
    });
    (prisma.$transaction as jest.Mock).mockRejectedValue(p2002);

    await expect(
      service.createHold('user-1', {
        courtId: 'court-1',
        startAt: '2030-11-28T04:00:00.000Z',
        endAt: '2030-11-28T05:00:00.000Z',
      }),
    ).rejects.toThrow(AppException);
  });

  it('should throw 403 when deleting hold of another user', async () => {
    (prisma.bookingHold as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
      id: 'hold-1',
      userId: 'other-user',
    });

    await expect(service.deleteHold('hold-1', 'user-1')).rejects.toThrow(AppException);
    try {
      await service.deleteHold('hold-1', 'user-1');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('should delete own hold successfully', async () => {
    (prisma.bookingHold as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
      id: 'hold-1',
      userId: 'user-1',
    });

    await expect(service.deleteHold('hold-1', 'user-1')).resolves.toBeUndefined();
  });

  it('should purge expired holds via cron', async () => {
    await expect(service.purgeExpiredHolds()).resolves.toBeUndefined();
  });
});
