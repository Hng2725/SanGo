import {
  enumerateSlotStarts,
  isSlotAligned,
  isWeekendDay,
  toVnParts,
  type DayType,
  type PriceBreakdownItem,
  type PriceQuote,
  type PriceRuleDto,
} from '@sango/shared';

export interface PricingInput {
  basePricePerHour: number;
  rules: ReadonlyArray<
    Pick<PriceRuleDto, 'dayType' | 'startMinute' | 'endMinute' | 'pricePerHour' | 'label'>
  >;
}

export class InvalidPriceRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPriceRangeError';
  }
}

/** Giá của 1 khung 60' bắt đầu tại slotStart (dayType & phút theo giờ VN của chính khung đó). */
export function priceForSlot(
  pricing: PricingInput,
  slotStart: Date,
): { price: number; label: string | null } {
  const { dayOfWeek, minuteOfDay } = toVnParts(slotStart);
  const dayType: DayType = isWeekendDay(dayOfWeek) ? 'WEEKEND' : 'WEEKDAY';

  const matched = pricing.rules.find(
    (rule) =>
      rule.dayType === dayType && rule.startMinute <= minuteOfDay && minuteOfDay < rule.endMinute,
  );

  if (matched) {
    return {
      price: matched.pricePerHour,
      label: matched.label ?? null,
    };
  }

  return {
    price: pricing.basePricePerHour,
    label: null,
  };
}

/** Tổng giá đơn [startAt, endAt). Ném InvalidPriceRangeError nếu end <= start hoặc không chia hết 60'. */
export function calculatePrice(pricing: PricingInput, startAt: Date, endAt: Date): PriceQuote {
  if (endAt.getTime() <= startAt.getTime()) {
    throw new InvalidPriceRangeError('Thời gian kết thúc phải sau thời gian bắt đầu');
  }

  if (!isSlotAligned(startAt) || !isSlotAligned(endAt)) {
    throw new InvalidPriceRangeError('Thời gian bắt đầu và kết thúc phải là bội số của 60 phút');
  }

  const slotStarts = enumerateSlotStarts(startAt, endAt);
  const breakdown: PriceBreakdownItem[] = [];
  let total = 0;

  for (const slot of slotStarts) {
    const slotEnd = new Date(slot.getTime() + 60 * 60 * 1000);
    const { price, label } = priceForSlot(pricing, slot);
    total += price;
    breakdown.push({
      startAt: slot.toISOString(),
      endAt: slotEnd.toISOString(),
      price,
      label,
    });
  }

  return {
    total,
    breakdown,
  };
}
