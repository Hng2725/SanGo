import { HttpStatus, Injectable } from '@nestjs/common';
import type { Venue } from '@prisma/client';
import type {
  CreateVenueInput,
  LocationDto,
  OpeningHourDto,
  OpeningHoursInput,
  OwnerVenueDetailDto,
  UpdateVenueInput,
  VenueDetailDto,
  VenueDto,
} from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toOpeningHourDto,
  toOwnerVenueDetailDto,
  toVenueDetailDto,
  toVenueDto,
} from './venues.mapper';

export function slugifyVn(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Kiểm tra quyền sở hữu ở tầng dữ liệu. Không tồn tại -> 404, khác chủ -> 403. */
  async assertVenueOwner(venueId: string, ownerId: string): Promise<Venue> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
    });
    if (!venue) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Cụm sân không tồn tại');
    }
    if (venue.ownerId !== ownerId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền quản lý cụm sân này',
      );
    }
    return venue;
  }

  async listMine(ownerId: string): Promise<VenueDto[]> {
    const venues = await this.prisma.venue.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return venues.map(toVenueDto);
  }

  async getMine(id: string, ownerId: string): Promise<OwnerVenueDetailDto> {
    await this.assertVenueOwner(id, ownerId);
    const venue = await this.prisma.venue.findUniqueOrThrow({
      where: { id },
      include: {
        courts: { orderBy: { createdAt: 'asc' } },
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    });
    return toOwnerVenueDetailDto(venue);
  }

  async create(ownerId: string, input: CreateVenueInput): Promise<OwnerVenueDetailDto> {
    let slug = slugifyVn(input.name);
    if (!slug) slug = 'cum-san';

    const existing = await this.prisma.venue.findUnique({ where: { slug } });
    if (existing) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const venue = await tx.venue.create({
        data: {
          ownerId,
          name: input.name,
          slug,
          description: input.description,
          address: input.address,
          district: input.district,
          city: input.city,
          latitude: input.latitude,
          longitude: input.longitude,
          phone: input.phone,
          imageUrls: input.imageUrls,
          cancelBeforeHours: input.cancelBeforeHours,
          status: 'ACTIVE',
        },
      });

      const defaultOpeningHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
        venueId: venue.id,
        dayOfWeek,
        isClosed: false,
        openMinute: 360, // 06:00
        closeMinute: 1320, // 22:00
      }));

      await tx.openingHour.createMany({
        data: defaultOpeningHours,
      });

      return tx.venue.findUniqueOrThrow({
        where: { id: venue.id },
        include: {
          courts: true,
          openingHours: { orderBy: { dayOfWeek: 'asc' } },
        },
      });
    });

    return toOwnerVenueDetailDto(created);
  }

  async update(id: string, ownerId: string, input: UpdateVenueInput): Promise<OwnerVenueDetailDto> {
    await this.assertVenueOwner(id, ownerId);

    const updated = await this.prisma.venue.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.district !== undefined ? { district: input.district } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
        ...(input.cancelBeforeHours !== undefined
          ? { cancelBeforeHours: input.cancelBeforeHours }
          : {}),
      },
      include: {
        courts: { orderBy: { createdAt: 'asc' } },
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    return toOwnerVenueDetailDto(updated);
  }

  async hide(id: string, ownerId: string): Promise<void> {
    await this.assertVenueOwner(id, ownerId);
    await this.prisma.venue.update({
      where: { id },
      data: { status: 'HIDDEN' },
    });
  }

  async replaceOpeningHours(
    venueId: string,
    ownerId: string,
    input: OpeningHoursInput,
  ): Promise<OpeningHourDto[]> {
    await this.assertVenueOwner(venueId, ownerId);

    const hours = await this.prisma.$transaction(async (tx) => {
      await tx.openingHour.deleteMany({ where: { venueId } });
      await tx.openingHour.createMany({
        data: input.map((h) => ({
          venueId,
          dayOfWeek: h.dayOfWeek,
          isClosed: h.isClosed,
          openMinute: h.openMinute,
          closeMinute: h.closeMinute,
        })),
      });
      return tx.openingHour.findMany({
        where: { venueId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    return hours.map(toOpeningHourDto);
  }

  async getOpeningHours(venueId: string): Promise<OpeningHourDto[]> {
    const hours = await this.prisma.openingHour.findMany({
      where: { venueId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return hours.map(toOpeningHourDto);
  }

  async getPublicBySlug(slug: string): Promise<VenueDetailDto> {
    const venue = await this.prisma.venue.findUnique({
      where: { slug },
      include: {
        owner: { select: { fullName: true } },
        courts: {
          where: { isActive: true },
          include: { priceRules: true },
          orderBy: { createdAt: 'asc' },
        },
        openingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    if (!venue || venue.status !== 'ACTIVE') {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy cụm sân');
    }

    return toVenueDetailDto(venue);
  }

  async getLocations(): Promise<LocationDto[]> {
    const venues = await this.prisma.venue.findMany({
      where: { status: 'ACTIVE' },
      select: { city: true, district: true },
      distinct: ['city', 'district'],
      orderBy: [{ city: 'asc' }, { district: 'asc' }],
    });

    const cityMap = new Map<string, Set<string>>();
    for (const v of venues) {
      if (!cityMap.has(v.city)) {
        cityMap.set(v.city, new Set());
      }
      cityMap.get(v.city)?.add(v.district);
    }

    const result: LocationDto[] = [];
    for (const [city, districtSet] of cityMap.entries()) {
      result.push({
        city,
        districts: Array.from(districtSet),
      });
    }
    return result;
  }
}
