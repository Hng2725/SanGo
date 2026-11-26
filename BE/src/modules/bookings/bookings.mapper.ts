import type { Prisma } from '@prisma/client';
import type { BookingDto, PriceBreakdownItem } from '@sango/shared';

/** Prisma `include` chuẩn để trả BookingDto – Dương dùng lại. */
export const bookingDtoInclude = {
  court: {
    select: {
      id: true,
      name: true,
      sport: true,
      venue: {
        select: { id: true, name: true, slug: true, address: true },
      },
    },
  },
  customer: {
    select: { id: true, fullName: true, phone: true },
  },
} satisfies Prisma.BookingInclude;

type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingDtoInclude }>;

export function toBookingDto(booking: BookingWithRelations): BookingDto {
  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    court: {
      id: booking.court.id,
      name: booking.court.name,
      sport: booking.court.sport,
    },
    venue: booking.court.venue,
    customer: {
      id: booking.customer.id,
      fullName: booking.customer.fullName,
      phone: booking.customer.phone,
    },
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    totalPrice: booking.totalPrice,
    priceBreakdown: booking.priceBreakdown as unknown as PriceBreakdownItem[],
    contactPhone: booking.contactPhone,
    note: booking.note,
    cancelReason: booking.cancelReason,
    rejectReason: booking.rejectReason,
    recurringSeriesId: booking.recurringSeriesId,
    createdAt: booking.createdAt.toISOString(),
  };
}
