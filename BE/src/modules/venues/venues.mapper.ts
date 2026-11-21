import type { Court, OpeningHour, PriceRule, Venue } from '@prisma/client';
import type {
  CourtDto,
  OpeningHourDto,
  OwnerVenueDetailDto,
  PriceRuleDto,
  VenueDetailDto,
  VenueDto,
} from '@sango/shared';

export function toOpeningHourDto(oh: OpeningHour): OpeningHourDto {
  return {
    dayOfWeek: oh.dayOfWeek,
    isClosed: oh.isClosed,
    openMinute: oh.openMinute,
    closeMinute: oh.closeMinute,
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

export function toPriceRuleDto(rule: PriceRule): PriceRuleDto {
  return {
    id: rule.id,
    dayType: rule.dayType,
    startMinute: rule.startMinute,
    endMinute: rule.endMinute,
    pricePerHour: rule.pricePerHour,
    label: rule.label,
  };
}

export function toVenueDto(venue: Venue): VenueDto {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    description: venue.description,
    address: venue.address,
    district: venue.district,
    city: venue.city,
    latitude: venue.latitude,
    longitude: venue.longitude,
    phone: venue.phone,
    imageUrls: venue.imageUrls,
    cancelBeforeHours: venue.cancelBeforeHours,
    status: venue.status,
    avgRating: venue.avgRating,
    reviewCount: venue.reviewCount,
    createdAt: venue.createdAt.toISOString(),
  };
}

export function toOwnerVenueDetailDto(
  venue: Venue & { courts: Court[]; openingHours: OpeningHour[] },
): OwnerVenueDetailDto {
  return {
    ...toVenueDto(venue),
    courts: venue.courts.map(toCourtDto),
    openingHours: venue.openingHours
      .map(toOpeningHourDto)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
  };
}

export function toVenueDetailDto(
  venue: Venue & {
    owner: { fullName: string };
    courts: (Court & { priceRules: PriceRule[] })[];
    openingHours: OpeningHour[];
  },
): VenueDetailDto {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    description: venue.description,
    address: venue.address,
    district: venue.district,
    city: venue.city,
    latitude: venue.latitude,
    longitude: venue.longitude,
    phone: venue.phone,
    imageUrls: venue.imageUrls,
    cancelBeforeHours: venue.cancelBeforeHours,
    avgRating: venue.avgRating,
    reviewCount: venue.reviewCount,
    createdAt: venue.createdAt.toISOString(),
    owner: {
      fullName: venue.owner.fullName,
    },
    courts: venue.courts.map((court) => ({
      id: court.id,
      name: court.name,
      sport: court.sport,
      basePricePerHour: court.basePricePerHour,
      priceRules: court.priceRules.map(toPriceRuleDto),
    })),
    openingHours: venue.openingHours
      .map(toOpeningHourDto)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
  };
}
