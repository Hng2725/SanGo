import type { Prisma } from '@prisma/client';
import type { SearchVenuesQuery } from '@sango/shared';
import { vnDateMinuteToUtc } from '@sango/shared';

/**
 * Hàm thuần (không phụ thuộc IO) xây dựng Prisma.VenueWhereInput từ query params.
 * @param query - Đã được validate bởi searchVenuesQuerySchema
 * @param now  - Thời điểm hiện tại (dùng để kiểm tra hold chưa hết hạn)
 */
export function buildSearchWhere(
  query: SearchVenuesQuery,
  now: Date,
): Prisma.VenueWhereInput {
  const where: Prisma.VenueWhereInput = {
    status: 'ACTIVE',
  };

  // Tìm kiếm theo tên hoặc địa chỉ
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { address: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  // Lọc theo city/district
  if (query.city) {
    where.city = { equals: query.city, mode: 'insensitive' };
  }
  if (query.district) {
    where.district = { equals: query.district, mode: 'insensitive' };
  }

  // Điều kiện courts cơ bản
  const courtCondition: Prisma.CourtWhereInput = { isActive: true };
  if (query.sport) {
    courtCondition.sport = query.sport;
  }

  // Nếu có date/from/to → thêm điều kiện khả dụng
  if (query.date && query.from && query.to) {
    const [fh, fm] = query.from.split(':').map(Number);
    const [th, tm] = query.to.split(':').map(Number);
    const fromMinute = fh * 60 + fm;
    const toMinute = th * 60 + tm;

    const fromUtc = vnDateMinuteToUtc(query.date, fromMinute);
    const toUtc = vnDateMinuteToUtc(query.date, toMinute);

    // Tính dayOfWeek theo giờ VN: dùng fromUtc rồi shift về VN
    const vnOffsetMs = 7 * 60 * 60 * 1000;
    const dayOfWeek = new Date(fromUtc.getTime() + vnOffsetMs).getUTCDay();

    // Lọc không có slotLock chồng [fromUtc, toUtc)
    const noSlotLock: Prisma.SlotLockWhereInput = {
      startAt: { gte: fromUtc, lt: toUtc },
      OR: [
        { bookingId: { not: null } },
        { expiresAt: { gt: now } },
      ],
    };

    // Lọc không có maintenanceBlock chồng
    const noMaintenance: Prisma.MaintenanceBlockWhereInput = {
      startAt: { lt: toUtc },
      endAt: { gt: fromUtc },
    };

    courtCondition.slotLocks = { none: noSlotLock };
    courtCondition.maintenanceBlocks = { none: noMaintenance };

    // Venue phải có openingHour khớp dayOfWeek và bao phủ [fromMinute, toMinute]
    where.openingHours = {
      some: {
        dayOfWeek,
        isClosed: false,
        openMinute: { lte: fromMinute },
        closeMinute: { gte: toMinute },
      },
    };
  }

  where.courts = { some: courtCondition };

  return where;
}
