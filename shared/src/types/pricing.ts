import type { DayType } from '../constants/booking-status';

export interface PriceRuleDto {
  id: string;
  dayType: DayType;
  startMinute: number;
  endMinute: number;
  pricePerHour: number;
  label: string | null;
}

export interface PriceBreakdownItem {
  startAt: string;
  endAt: string;
  price: number;
  label: string | null;
}

export interface PriceQuote {
  total: number;
  breakdown: PriceBreakdownItem[];
}

export interface CourtPricingDto {
  courtId: string;
  basePricePerHour: number;
  rules: PriceRuleDto[];
}
