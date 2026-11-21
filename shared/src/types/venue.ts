import type { Sport } from '../constants/sports';
import type { VenueStatus } from '../constants/booking-status';
import type { PriceRuleDto } from './pricing';

export interface CourtSummaryDto {
  id: string;
  name: string;
  sport: Sport;
}

export interface CourtDto extends CourtSummaryDto {
  venueId: string;
  basePricePerHour: number;
  isActive: boolean;
  createdAt: string;
}

export interface OpeningHourDto {
  dayOfWeek: number;
  isClosed: boolean;
  openMinute: number;
  closeMinute: number;
}

export interface VenueDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  district: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  imageUrls: string[];
  cancelBeforeHours: number;
  status: VenueStatus;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
}

export type OwnerVenueDetailDto = VenueDto & {
  courts: CourtDto[];
  openingHours: OpeningHourDto[];
};

export type VenueDetailDto = Omit<VenueDto, 'status'> & {
  owner: { fullName: string };
  courts: (CourtSummaryDto & { basePricePerHour: number; priceRules: PriceRuleDto[] })[];
  openingHours: OpeningHourDto[];
};

export interface LocationDto {
  city: string;
  districts: string[];
}

export interface VenueCardDto {
  id: string;
  slug: string;
  name: string;
  district: string;
  city: string;
  imageUrl: string | null;
  sports: Sport[];
  minPricePerHour: number;
  avgRating: number;
  reviewCount: number;
  latitude: number | null;
  longitude: number | null;
}
