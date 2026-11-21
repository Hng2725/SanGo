import { HttpStatus, Injectable } from '@nestjs/common';
import type { Court, Venue } from '@prisma/client';
import type { CourtDto, CreateCourtInput, UpdateCourtInput } from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { VenuesService } from '../venues/venues.service';
import { toCourtDto } from './courts.mapper';

@Injectable()
export class CourtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venuesService: VenuesService,
  ) {}

  async getCourtForOwner(courtId: string, ownerId: string): Promise<Court & { venue: Venue }> {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });
    if (!court) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Sân con không tồn tại');
    }
    if (court.venue.ownerId !== ownerId) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền quản lý sân con này',
      );
    }
    return court;
  }

  async getActiveCourt(courtId: string): Promise<Court & { venue: Venue }> {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });
    if (!court || !court.isActive || court.venue.status !== 'ACTIVE') {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Sân con không tồn tại hoặc đã ngừng hoạt động',
      );
    }
    return court;
  }

  async create(venueId: string, ownerId: string, input: CreateCourtInput): Promise<CourtDto> {
    await this.venuesService.assertVenueOwner(venueId, ownerId);

    const existing = await this.prisma.court.findFirst({
      where: { venueId, name: input.name },
    });
    if (existing) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'CONFLICT',
        'Tên sân đã tồn tại trong cụm sân này',
      );
    }

    const court = await this.prisma.court.create({
      data: {
        venueId,
        name: input.name,
        sport: input.sport,
        basePricePerHour: input.basePricePerHour,
        isActive: true,
      },
    });

    return toCourtDto(court);
  }

  async update(courtId: string, ownerId: string, input: UpdateCourtInput): Promise<CourtDto> {
    const court = await this.getCourtForOwner(courtId, ownerId);

    if (input.name && input.name !== court.name) {
      const existing = await this.prisma.court.findFirst({
        where: {
          venueId: court.venueId,
          name: input.name,
          NOT: { id: courtId },
        },
      });
      if (existing) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'Tên sân đã tồn tại trong cụm sân này',
        );
      }
    }

    const updated = await this.prisma.court.update({
      where: { id: courtId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sport !== undefined ? { sport: input.sport } : {}),
        ...(input.basePricePerHour !== undefined
          ? { basePricePerHour: input.basePricePerHour }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return toCourtDto(updated);
  }

  async remove(courtId: string, ownerId: string): Promise<void> {
    await this.getCourtForOwner(courtId, ownerId);

    const bookingCount = await this.prisma.booking.count({
      where: { courtId },
    });

    if (bookingCount > 0) {
      await this.prisma.court.update({
        where: { id: courtId },
        data: { isActive: false },
      });
    } else {
      await this.prisma.court.delete({
        where: { id: courtId },
      });
    }
  }
}
