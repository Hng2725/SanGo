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
      findMany: jest.fn(),
    },
  };

  const courtsService = {
    getCourtForOwner: jest.fn(),
  };

  const service = new MaintenanceService(prisma as never, courtsService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const futureStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 4 * 3600 * 1000).toISOString();

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
