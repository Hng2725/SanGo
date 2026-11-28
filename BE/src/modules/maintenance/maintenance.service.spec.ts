import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService', () => {
  const prisma = {
    maintenanceBlock: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    slotLock: {
      findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const courtsService = {
    getCourtForOwner: jest.fn(),
  };

  const service = new MaintenanceService(prisma as never, courtsService as never);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-11-28T00:00:00Z'));
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    );
  });
  afterEach(() => jest.useRealTimers());

  describe('create', () => {
    const futureStart = '2026-12-01T01:00:00.000Z';
    const futureEnd = '2026-12-01T03:00:00.000Z';

    it('uses a transaction and court lock before checking and creating maintenance', async () => {
      courtsService.getCourtForOwner.mockResolvedValue({ id: 'c1' });
      prisma.maintenanceBlock.findFirst.mockResolvedValue(null);
      prisma.slotLock.findMany.mockResolvedValue([]);
      prisma.maintenanceBlock.create.mockResolvedValue({
        id: 'mb1',
        courtId: 'c1',
        startAt: new Date(futureStart),
        endAt: new Date(futureEnd),
        reason: null,
        createdAt: new Date(),
      });
      const result = await service.create('c1', 'owner1', 'u1', {
        startAt: futureStart,
        endAt: futureEnd,
      });
      expect(result.id).toBe('mb1');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('FOR UPDATE')]),
        'c1',
      );
      expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.maintenanceBlock.findFirst.mock.invocationCallOrder[0],
      );
    });

    it('checks live holds as well as booking locks for maintenance conflicts', async () => {
      courtsService.getCourtForOwner.mockResolvedValue({ id: 'c1' });
      prisma.maintenanceBlock.findFirst.mockResolvedValue(null);
      prisma.slotLock.findMany.mockResolvedValue([{ booking: null, holdId: 'hold1' }]);
      await expect(
        service.create('c1', 'owner1', 'u1', {
          startAt: futureStart,
          endAt: futureEnd,
        }),
      ).rejects.toMatchObject({ response: { code: 'MAINTENANCE_CONFLICT' } });
      const query: unknown = prisma.slotLock.findMany.mock.calls[0][0];
      expect(query).toHaveProperty('where.OR.1.holdId', { not: null });
      expect(query).toHaveProperty('where.OR.1.expiresAt.gte', new Date());
    });

    it('ném lỗi 403 khi không sở hữu sân con', async () => {
      courtsService.getCourtForOwner.mockRejectedValue({
        status: HttpStatus.FORBIDDEN,
      });

      await expect(
        service.create('c1', 'owner1', 'u1', {
          startAt: futureStart,
          endAt: futureEnd,
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('ném lỗi 409 MAINTENANCE_CONFLICT kèm mã đơn khi trùng với đơn đang hiệu lực', async () => {
      courtsService.getCourtForOwner.mockResolvedValue({ id: 'c1' });
      prisma.maintenanceBlock.findFirst.mockResolvedValue(null);

      prisma.slotLock.findMany.mockResolvedValue([
        { id: 'lock1', booking: { code: 'SG261120ABCD' } },
        { id: 'lock2', booking: { code: 'SG261120EFGH' } },
      ]);

      let caught: unknown;
      try {
        await service.create('c1', 'owner1', 'u1', {
          startAt: futureStart,
          endAt: futureEnd,
        });
      } catch (err: unknown) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(AppException);
      const appErr = caught as AppException;
      expect(appErr.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(appErr.getResponse()).toMatchObject({
        code: 'MAINTENANCE_CONFLICT',
        details: {
          bookingCodes: ['SG261120ABCD', 'SG261120EFGH'],
        },
      });
    });

    it('ném lỗi 409 CONFLICT khi trùng với một lịch bảo trì khác', async () => {
      courtsService.getCourtForOwner.mockResolvedValue({ id: 'c1' });
      prisma.maintenanceBlock.findFirst.mockResolvedValue({ id: 'existing_mb' });

      let caught: unknown;
      try {
        await service.create('c1', 'owner1', 'u1', {
          startAt: futureStart,
          endAt: futureEnd,
        });
      } catch (err: unknown) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(AppException);
      const appErr = caught as AppException;
      expect(appErr.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(appErr.getResponse()).toMatchObject({
        code: 'CONFLICT',
      });
    });
  });

  describe('remove', () => {
    it('ném lỗi 403 khi xóa lịch bảo trì thuộc sân của chủ khác', async () => {
      prisma.maintenanceBlock.findUnique.mockResolvedValue({
        id: 'mb1',
        court: {
          venue: {
            ownerId: 'other_owner',
          },
        },
      });

      await expect(service.remove('mb1', 'owner1')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });
  });
});
