import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let service: ReviewsService;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    service = new ReviewsService(prisma);
  });

  it('từ chối đánh giá khi đơn chưa COMPLETED (409 REVIEW_NOT_ALLOWED)', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'bk-1',
      customerId: 'user-1',
      status: 'CONFIRMED',
      court: { venueId: 'venue-1' },
      review: null,
    } as never);

    await expect(
      service.create('user-1', { bookingId: 'bk-1', rating: 5, comment: 'Tốt' }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'REVIEW_NOT_ALLOWED' },
    });
  });

  it('từ chối đánh giá lần 2 khi đơn đã có review (409 REVIEW_NOT_ALLOWED)', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'bk-1',
      customerId: 'user-1',
      status: 'COMPLETED',
      court: { venueId: 'venue-1' },
      review: { id: 'rev-1' },
    } as never);

    await expect(service.create('user-1', { bookingId: 'bk-1', rating: 4 })).rejects.toMatchObject({
      status: 409,
      response: { code: 'REVIEW_NOT_ALLOWED' },
    });
  });

  it('tạo đánh giá thành công và tính lại avgRating/reviewCount của cụm sân', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'bk-1',
      customerId: 'user-1',
      status: 'COMPLETED',
      court: { venueId: 'venue-1' },
      review: null,
    } as never);

    prisma.review.create.mockResolvedValue({
      id: 'rev-1',
      bookingId: 'bk-1',
      venueId: 'venue-1',
      userId: 'user-1',
      rating: 4,
      comment: 'Sân sạch',
      ownerReply: null,
      createdAt: new Date('2026-11-20T12:00:00.000Z'),
      updatedAt: new Date('2026-11-20T12:00:00.000Z'),
      user: { id: 'user-1', fullName: 'Nguyễn Văn A' },
      venue: { id: 'venue-1', name: 'Sân A', ownerId: 'owner-1' },
      booking: { court: { id: 'court-1', name: 'Sân 1' } },
    } as never);

    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.3333 },
      _count: { rating: 3 },
    } as never);
    prisma.venue.update.mockResolvedValue({} as never);

    const dto = await service.create('user-1', {
      bookingId: 'bk-1',
      rating: 4,
      comment: 'Sân sạch',
    });

    expect(dto.rating).toBe(4);
    expect(prisma.venue.update.mock.calls).toEqual([
      [
        {
          where: { id: 'venue-1' },
          data: { avgRating: 4.33, reviewCount: 3 },
        },
      ],
    ]);
  });
});
