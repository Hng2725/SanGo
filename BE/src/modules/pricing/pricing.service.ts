import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CourtPricingDto, PriceQuote, PricingConfigInput } from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CourtsService } from '../courts/courts.service';
import { toPriceRuleDto } from '../venues/venues.mapper';
import { calculatePrice, InvalidPriceRangeError, type PricingInput } from './pricing.calculator';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courtsService: CourtsService,
  ) {}

  async getCourtPricing(
    courtIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, PricingInput>> {
    const db = tx ?? this.prisma;
    const courts = await db.court.findMany({
      where: { id: { in: courtIds } },
      include: { priceRules: true },
    });

    const result = new Map<string, PricingInput>();
    for (const court of courts) {
      result.set(court.id, {
        basePricePerHour: court.basePricePerHour,
        rules: court.priceRules.map((rule) => ({
          dayType: rule.dayType,
          startMinute: rule.startMinute,
          endMinute: rule.endMinute,
          pricePerHour: rule.pricePerHour,
          label: rule.label,
        })),
      });
    }
    return result;
  }

  async quote(
    courtId: string,
    startAt: Date,
    endAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<PriceQuote> {
    const db = tx ?? this.prisma;
    const court = await db.court.findUnique({
      where: { id: courtId },
      include: { priceRules: true, venue: { select: { status: true } } },
    });

    if (!court || !court.isActive || court.venue.status !== 'ACTIVE') {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Sân con không tồn tại hoặc đã ngừng hoạt động',
      );
    }

    const pricingInput: PricingInput = {
      basePricePerHour: court.basePricePerHour,
      rules: court.priceRules.map((r) => ({
        dayType: r.dayType,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
        pricePerHour: r.pricePerHour,
        label: r.label,
      })),
    };

    try {
      return calculatePrice(pricingInput, startAt, endAt);
    } catch (error) {
      if (error instanceof InvalidPriceRangeError) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', error.message);
      }
      throw error;
    }
  }

  async getForOwner(courtId: string, ownerId: string): Promise<CourtPricingDto> {
    const court = await this.courtsService.getCourtForOwner(courtId, ownerId);
    const rules = await this.prisma.priceRule.findMany({
      where: { courtId },
      orderBy: [{ dayType: 'asc' }, { startMinute: 'asc' }],
    });

    return {
      courtId,
      basePricePerHour: court.basePricePerHour,
      rules: rules.map(toPriceRuleDto),
    };
  }

  async replaceForOwner(
    courtId: string,
    ownerId: string,
    input: PricingConfigInput,
  ): Promise<CourtPricingDto> {
    await this.courtsService.getCourtForOwner(courtId, ownerId);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.court.update({
        where: { id: courtId },
        data: { basePricePerHour: input.basePricePerHour },
      });

      await tx.priceRule.deleteMany({ where: { courtId } });

      if (input.rules.length > 0) {
        await tx.priceRule.createMany({
          data: input.rules.map((rule) => ({
            courtId,
            dayType: rule.dayType,
            startMinute: rule.startMinute,
            endMinute: rule.endMinute,
            pricePerHour: rule.pricePerHour,
            label: rule.label,
          })),
        });
      }

      const rules = await tx.priceRule.findMany({
        where: { courtId },
        orderBy: [{ dayType: 'asc' }, { startMinute: 'asc' }],
      });

      return {
        courtId,
        basePricePerHour: input.basePricePerHour,
        rules: rules.map(toPriceRuleDto),
      };
    });

    return updated;
  }

  async copyToCourts(
    sourceCourtId: string,
    ownerId: string,
    targetCourtIds: string[],
  ): Promise<void> {
    await this.courtsService.getCourtForOwner(sourceCourtId, ownerId);

    // Kiểm tra tất cả targetCourtIds đều phải thuộc quyền sở hữu của ownerId
    const targetCourts = await this.prisma.court.findMany({
      where: {
        id: { in: targetCourtIds },
        venue: { ownerId },
      },
      select: { id: true },
    });

    if (targetCourts.length !== targetCourtIds.length) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Một số sân con đích không thuộc quyền sở hữu của bạn',
      );
    }

    const sourceCourt = await this.prisma.court.findUniqueOrThrow({
      where: { id: sourceCourtId },
      include: { priceRules: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const targetId of targetCourtIds) {
        await tx.court.update({
          where: { id: targetId },
          data: { basePricePerHour: sourceCourt.basePricePerHour },
        });

        await tx.priceRule.deleteMany({ where: { courtId: targetId } });

        if (sourceCourt.priceRules.length > 0) {
          await tx.priceRule.createMany({
            data: sourceCourt.priceRules.map((rule) => ({
              courtId: targetId,
              dayType: rule.dayType,
              startMinute: rule.startMinute,
              endMinute: rule.endMinute,
              pricePerHour: rule.pricePerHour,
              label: rule.label,
            })),
          });
        }
      }
    });
  }
}
