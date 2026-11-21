import { HttpStatus } from '@nestjs/common';
import { VenuesService } from './venues.service';

describe('VenuesService', () => {
  const prisma = {
    venue: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    openingHour: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new VenuesService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assertVenueOwner', () => {
    it('ném lỗi 404 khi cụm sân không tồn tại', async () => {
      prisma.venue.findUnique.mockResolvedValue(null);

      await expect(service.assertVenueOwner('v1', 'owner1')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('ném lỗi 403 khi cụm sân thuộc về chủ khác', async () => {
      prisma.venue.findUnique.mockResolvedValue({
        id: 'v1',
        ownerId: 'other_owner',
      });

      await expect(service.assertVenueOwner('v1', 'owner1')).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('trả về venue khi chủ sân hợp lệ', async () => {
      const mockVenue = { id: 'v1', ownerId: 'owner1' };
      prisma.venue.findUnique.mockResolvedValue(mockVenue);

      const result = await service.assertVenueOwner('v1', 'owner1');
      expect(result).toBe(mockVenue);
    });
  });

  describe('create', () => {
    it('sinh hậu tố cho slug khi slug gốc đã tồn tại', async () => {
      // Slug 'san-bong-hoa-lu' đã có trong DB
      prisma.venue.findUnique.mockResolvedValue({ id: 'v_existing', slug: 'san-bong-hoa-lu' });

      prisma.$transaction.mockImplementation(
        async (cb: (tx: typeof prisma) => Promise<unknown>) => {
          return cb(prisma);
        },
      );

      prisma.venue.create.mockImplementation(({ data }: { data: { slug: string } }) => {
        expect(data.slug).toMatch(/^san-bong-hoa-lu-[a-z0-9]{4}$/);
        return { id: 'v_new', ...data };
      });

      prisma.venue.findUniqueOrThrow.mockResolvedValue({
        id: 'v_new',
        slug: 'san-bong-hoa-lu-abcd',
        name: 'Sân bóng Hoa Lư',
        description: null,
        address: '123 Đinh Tiên Hoàng',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        latitude: null,
        longitude: null,
        phone: null,
        imageUrls: [],
        cancelBeforeHours: 2,
        status: 'ACTIVE',
        avgRating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        courts: [],
        openingHours: [],
      });

      const res = await service.create('owner1', {
        name: 'Sân bóng Hoa Lư',
        address: '123 Đinh Tiên Hoàng',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        imageUrls: [],
        cancelBeforeHours: 2,
      });

      expect(res.name).toBe('Sân bóng Hoa Lư');
    });
  });

  describe('getPublicBySlug', () => {
    it('ném lỗi 404 khi cụm sân ở trạng thái HIDDEN', async () => {
      prisma.venue.findUnique.mockResolvedValue({
        id: 'v1',
        slug: 'san-an',
        status: 'HIDDEN',
      });

      await expect(service.getPublicBySlug('san-an')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });
});
