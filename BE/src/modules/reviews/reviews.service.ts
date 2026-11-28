import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateReviewInput,
  OwnerReviewsQuery,
  Paginated,
  ReplyReviewInput,
  ReviewDto,
  ReviewListDto,
  UpdateReviewInput,
  VenueReviewsQuery,
} from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { isPrismaUniqueError } from '../../common/utils/prisma-errors';
import { paginate, toSkipTake } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { reviewInclude, toReviewDto } from './reviews.mapper';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private async recalculateVenueRating(
    tx: Prisma.TransactionClient,
    venueId: string,
  ): Promise<void> {
    const agg = await tx.review.aggregate({
      where: { venueId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const count = agg._count.rating ?? 0;
    const avgRating = count > 0 ? Number((agg._avg.rating ?? 0).toFixed(2)) : 0;

    await tx.venue.update({
      where: { id: venueId },
      data: { avgRating, reviewCount: count },
    });
  }

  async create(userId: string, input: CreateReviewInput): Promise<ReviewDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        court: { select: { venueId: true } },
        review: { select: { id: true } },
      },
    });

    if (!booking) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Đơn đặt sân không tồn tại');
    }
    if (booking.customerId !== userId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền đánh giá đơn đặt này',
      );
    }
    if (booking.status !== 'COMPLETED') {
      throw new AppException(
        HttpStatus.CONFLICT,
        'REVIEW_NOT_ALLOWED',
        'Chỉ có thể đánh giá sau khi đơn đã hoàn thành',
      );
    }
    if (booking.review) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'REVIEW_NOT_ALLOWED',
        'Đơn đặt này đã được đánh giá',
      );
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const review = await tx.review.create({
          data: {
            bookingId: booking.id,
            venueId: booking.court.venueId,
            userId,
            rating: input.rating,
            comment: input.comment ?? null,
          },
          include: reviewInclude,
        });
        await this.recalculateVenueRating(tx, booking.court.venueId);
        return review;
      });
      return toReviewDto(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'REVIEW_NOT_ALLOWED',
          'Đơn đặt này đã được đánh giá',
        );
      }
      throw error;
    }
  }

  async update(reviewId: string, userId: string, input: UpdateReviewInput): Promise<ReviewDto> {
    const existing = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Đánh giá không tồn tại');
    }
    if (existing.userId !== userId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền chỉnh sửa đánh giá này',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...(input.rating !== undefined ? { rating: input.rating } : {}),
          ...(input.comment !== undefined ? { comment: input.comment } : {}),
        },
        include: reviewInclude,
      });
      await this.recalculateVenueRating(tx, existing.venueId);
      return review;
    });

    return toReviewDto(updated);
  }

  async remove(reviewId: string, userId: string): Promise<void> {
    const existing = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Đánh giá không tồn tại');
    }
    if (existing.userId !== userId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền xóa đánh giá này',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: reviewId } });
      await this.recalculateVenueRating(tx, existing.venueId);
    });
  }

  async listByVenue(venueId: string, query: VenueReviewsQuery): Promise<ReviewListDto> {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total, grouped, venue] = await Promise.all([
      this.prisma.review.findMany({
        where: { venueId },
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.review.count({ where: { venueId } }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { venueId },
        _count: { rating: true },
      }),
      this.prisma.venue.findUnique({
        where: { id: venueId },
        select: { avgRating: true, reviewCount: true },
      }),
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const row of grouped) {
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count.rating;
      }
    }

    return {
      ...paginate(items.map(toReviewDto), total, query.page, query.pageSize),
      summary: {
        avgRating: venue?.avgRating ?? 0,
        count: venue?.reviewCount ?? total,
        distribution,
      },
    };
  }

  async listForOwner(ownerId: string, query: OwnerReviewsQuery): Promise<Paginated<ReviewDto>> {
    const where: Prisma.ReviewWhereInput = {
      venue: { ownerId },
      ...(query.venueId ? { venueId: query.venueId } : {}),
      ...(query.rating !== undefined ? { rating: query.rating } : {}),
    };

    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.review.count({ where }),
    ]);

    return paginate(items.map(toReviewDto), total, query.page, query.pageSize);
  }

  async reply(reviewId: string, ownerId: string, input: ReplyReviewInput): Promise<ReviewDto> {
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { venue: { select: { ownerId: true } } },
    });

    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Đánh giá không tồn tại');
    }
    if (existing.venue.ownerId !== ownerId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền phản hồi đánh giá của cụm sân này',
      );
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { ownerReply: input.reply },
      include: reviewInclude,
    });

    return toReviewDto(updated);
  }
}
