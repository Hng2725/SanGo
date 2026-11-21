import type { DayType } from '../constants/booking-status';

export interface MatchingRuleInput {
  dayType: DayType;
  startMinute: number;
  endMinute: number;
  pricePerHour: number;
  label?: string | null;
}

export function findMatchingPriceRule<T extends MatchingRuleInput>(
  rules: ReadonlyArray<T>,
  dayType: DayType,
  minuteOfDay: number,
): T | undefined {
  return rules.find(
    (rule) =>
      rule.dayType === dayType &&
      rule.startMinute <= minuteOfDay &&
      minuteOfDay < rule.endMinute,
  );
}
