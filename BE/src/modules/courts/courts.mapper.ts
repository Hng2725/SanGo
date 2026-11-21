import type { Court } from '@prisma/client';
import type { CourtDto, CourtSummaryDto } from '@sango/shared';

export function toCourtSummaryDto(court: Court): CourtSummaryDto {
  return {
    id: court.id,
    name: court.name,
    sport: court.sport,
  };
}

export function toCourtDto(court: Court): CourtDto {
  return {
    id: court.id,
    venueId: court.venueId,
    name: court.name,
    sport: court.sport,
    basePricePerHour: court.basePricePerHour,
    isActive: court.isActive,
    createdAt: court.createdAt.toISOString(),
  };
}
