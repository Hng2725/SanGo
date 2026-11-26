import { Injectable } from '@nestjs/common';
import type { SearchVenuesQuery, VenueCardDto, Paginated } from '@sango/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSearchWhere } from './search-where.builder';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchVenuesQuery): Promise<Paginated<VenueCardDto>> {
    const now = new Date();
    const where = buildSearchWhere(query, now);

    const orderBy = this.resolveOrderBy(query.sort);

    const [total, venues] = await Promise.all([
      this.prisma.venue.count({ where }),
      this.prisma.venue.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          courts: {
            where: {
              isActive: true,
              ...(query.sport ? { sport: query.sport } : {}),
            },
            include: { priceRules: true },
          },
        },
      }),
    ]);

    const items: VenueCardDto[] = venues.map((venue) => {
      const activeCourts = venue.courts;

      const sports = [...new Set(activeCourts.map((c) => c.sport))] as VenueCardDto['sports'];

      let minPricePerHour: number | null = null;
      for (const court of activeCourts) {
        const prices: number[] = [court.basePricePerHour];
        for (const rule of court.priceRules) {
          prices.push(rule.pricePerHour);
        }
        const courtMin = Math.min(...prices);
        if (minPricePerHour === null || courtMin < minPricePerHour) {
          minPricePerHour = courtMin;
        }
      }

      return {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
        address: venue.address,
        district: venue.district,
        city: venue.city,
        imageUrl: venue.imageUrls[0] ?? null,
        sports,
        minPricePerHour,
        avgRating: venue.avgRating,
        reviewCount: venue.reviewCount,
        latitude: venue.latitude,
        longitude: venue.longitude,
      };
    });

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  private resolveOrderBy(sort: SearchVenuesQuery['sort']) {
    switch (sort) {
      case 'newest':
        return { createdAt: 'desc' as const };
      case 'name':
        return { name: 'asc' as const };
      case 'rating':
      default:
        return { avgRating: 'desc' as const };
    }
  }
}
