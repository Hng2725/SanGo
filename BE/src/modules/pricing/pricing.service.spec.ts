import { HttpStatus } from '@nestjs/common';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const prisma = {
    court: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    priceRule: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const courtsService = {
    getCourtForOwner: jest.fn(),
  };

  const service = new PricingService(prisma as never, courtsService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('replaceForOwner', () => {
    it('ném lỗi 403 khi người dùng không sở hữu sân con', async () => {
      courtsService.getCourtForOwner.mockRejectedValue({
        status: HttpStatus.FORBIDDEN,
      });

      await expect(
        service.replaceForOwner('court1', 'owner1', {
          basePricePerHour: 100_000,
          rules: [],
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });
  });

  describe('copyToCourts', () => {
    it('ném lỗi 403 khi một số sân đích thuộc chủ khác', async () => {
      courtsService.getCourtForOwner.mockResolvedValue({
        id: 'court1',
        venueId: 'v1',
      });

      // Chỉ tìm thấy 1/2 sân thuộc owner1
      prisma.court.findMany.mockResolvedValue([{ id: 'target1' }]);

      await expect(
        service.copyToCourts('court1', 'owner1', ['target1', 'target_other']),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });
  });
});
