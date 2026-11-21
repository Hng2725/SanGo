import { findMatchingPriceRule, type PriceRuleInput } from '@sango/shared';

export interface PriceTableRow {
  minute: number;
  weekday: number;
  weekend: number;
  weekdayLabel: string | null;
  weekendLabel: string | null;
}

export function buildPriceTable(config: {
  basePricePerHour: number;
  rules: PriceRuleInput[];
}): PriceTableRow[] {
  const rows: PriceTableRow[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const minute = hour * 60;
    const weekdayMatch = findMatchingPriceRule(config.rules, 'WEEKDAY', minute);
    const weekendMatch = findMatchingPriceRule(config.rules, 'WEEKEND', minute);

    rows.push({
      minute,
      weekday: weekdayMatch ? weekdayMatch.pricePerHour : config.basePricePerHour,
      weekend: weekendMatch ? weekendMatch.pricePerHour : config.basePricePerHour,
      weekdayLabel: weekdayMatch?.label ?? null,
      weekendLabel: weekendMatch?.label ?? null,
    });
  }

  return rows;
}
