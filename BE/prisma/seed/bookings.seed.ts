import type { BookingStatus, Prisma, PrismaClient } from '@prisma/client';
import { addDaysToDateStr, enumerateSlotStarts, toVnParts } from '@sango/shared';
import { generateDaySlots } from '../../src/modules/availability/slot-generator';
import { calculatePrice } from '../../src/modules/pricing/pricing.calculator';

function makeSeedCode(index: number, dateStr: string): string {
  const compact = dateStr.replace(/-/g, '').slice(2);
  const suffix = (1000 + index).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `SG${compact}${suffix}`;
}

export async function seedBookings(prisma: PrismaClient, now = new Date()): Promise<void> {
  const [customers, courts, existingLocks, adminUser] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CUSTOMER', status: 'ACTIVE' },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, phone: true },
    }),
    prisma.court.findMany({
      where: { isActive: true, venue: { status: 'ACTIVE' } },
      include: {
        venue: {
          include: {
            openingHours: true,
            owner: { select: { email: true } },
          },
        },
        priceRules: true,
      },
      orderBy: { id: 'asc' },
    }),
    prisma.slotLock.findMany({
      select: { courtId: true, startAt: true },
    }),
    prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }),
  ]);

  if (customers.length === 0 || courts.length === 0) {
    return;
  }

  const occupied = new Set<string>(
    existingLocks.map((lock) => `${lock.courtId}|${lock.startAt.toISOString()}`),
  );

  // Ưu tiên sân của owner@sango.vn và khách customer@sango.vn
  const primaryOwnerCourts = courts.filter((c) => c.venue.owner.email === 'owner@sango.vn');
  const otherCourts = courts.filter((c) => c.venue.owner.email !== 'owner@sango.vn');
  const orderedCourts = [...primaryOwnerCourts, ...otherCourts];

  const primaryCustomer = customers.find((c) => c.email === 'customer@sango.vn') ?? customers[0];
  const { dateStr: todayStr } = toVnParts(now);

  let codeSeq = 1;
  const bookingRows: Prisma.BookingCreateManyInput[] = [];
  const lockRows: { courtId: string; startAt: Date; bookingCode: string }[] = [];

  // 1. Tạo 2 chuỗi lịch cố định mẫu cho customer@sango.vn
  const seriesCourt = primaryOwnerCourts[0] ?? orderedCourts[0];
  const series2Court = primaryOwnerCourts[1] ?? orderedCourts[0];

  const seriesConfigs = [
    {
      id: 'seed-series-1',
      court: seriesCourt,
      firstDate: addDaysToDateStr(todayStr, 2),
      weeks: 4,
      slotIdxOffset: 8,
    },
    {
      id: 'seed-series-2',
      court: series2Court,
      firstDate: addDaysToDateStr(todayStr, -21),
      weeks: 4,
      slotIdxOffset: 10,
    },
  ];

  for (const cfg of seriesConfigs) {
    const firstSlots = generateDaySlots(cfg.court.venue.openingHours, cfg.firstDate);
    if (firstSlots.length > cfg.slotIdxOffset + 1) {
      const refSlot = firstSlots[cfg.slotIdxOffset];
      const { dayOfWeek } = toVnParts(refSlot.startAt);
      await prisma.recurringSeries.create({
        data: {
          id: cfg.id,
          customerId: primaryCustomer.id,
          courtId: cfg.court.id,
          dayOfWeek,
          startMinute: refSlot.minuteOfDay,
          slotCount: 1,
          firstDate: cfg.firstDate,
          weeks: cfg.weeks,
          status: 'ACTIVE',
        },
      });

      for (let w = 0; w < cfg.weeks; w += 1) {
        const dStr = addDaysToDateStr(cfg.firstDate, w * 7);
        const daySlots = generateDaySlots(cfg.court.venue.openingHours, dStr);
        const target = daySlots.find((s) => s.minuteOfDay === refSlot.minuteOfDay);
        if (!target) continue;
        const key = `${cfg.court.id}|${target.startAt.toISOString()}`;
        if (occupied.has(key)) continue;
        occupied.add(key);

        const pricingInput = {
          basePricePerHour: cfg.court.basePricePerHour,
          rules: cfg.court.priceRules.map((r) => ({
            dayType: r.dayType,
            startMinute: r.startMinute,
            endMinute: r.endMinute,
            pricePerHour: r.pricePerHour,
            label: r.label,
          })),
        };
        const quote = calculatePrice(pricingInput, target.startAt, target.endAt);
        const isPast = target.endAt.getTime() <= now.getTime();
        const status: BookingStatus = isPast ? 'COMPLETED' : w % 2 === 0 ? 'CONFIRMED' : 'PENDING';
        const code = makeSeedCode(codeSeq++, dStr);
        const createdAt = new Date(target.startAt.getTime() - 48 * 3600_000);

        bookingRows.push({
          code,
          customerId: primaryCustomer.id,
          courtId: cfg.court.id,
          startAt: target.startAt,
          endAt: target.endAt,
          totalPrice: quote.total,
          priceBreakdown: quote.breakdown as unknown as Prisma.InputJsonValue,
          status,
          contactPhone: primaryCustomer.phone ?? '0901234567',
          note: 'Lịch cố định hàng tuần',
          confirmedAt: status === 'CONFIRMED' || status === 'COMPLETED' ? createdAt : null,
          completedAt: status === 'COMPLETED' ? target.endAt : null,
          recurringSeriesId: cfg.id,
          createdAt,
        });
        lockRows.push({ courtId: cfg.court.id, startAt: target.startAt, bookingCode: code });
      }
    }
  }

  // 2. Tạo >= 320 đơn trải 60 ngày trước -> 14 ngày sau
  const targetTotal = 340;
  let attempts = 0;
  while (bookingRows.length < targetTotal && attempts < 5000) {
    attempts += 1;
    const dayOffset = -60 + ((attempts * 7) % 75); // -60 .. +14
    const dateStr = addDaysToDateStr(todayStr, dayOffset);

    // 70% chọn sân của owner@sango.vn
    const usePrimaryOwner = attempts % 10 < 7 && primaryOwnerCourts.length > 0;
    const pool = usePrimaryOwner ? primaryOwnerCourts : orderedCourts;
    const court = pool[attempts % pool.length];

    const slots = generateDaySlots(court.venue.openingHours, dateStr);
    if (slots.length < 2) continue;

    const slotCount = attempts % 4 === 0 ? 2 : 1;
    const startIdx = (attempts * 3) % (slots.length - slotCount + 1);
    const firstSlot = slots[startIdx];
    const lastSlot = slots[startIdx + slotCount - 1];

    const slotStarts = enumerateSlotStarts(firstSlot.startAt, lastSlot.endAt);
    if (slotStarts.some((s) => occupied.has(`${court.id}|${s.toISOString()}`))) {
      continue;
    }

    const pricingInput = {
      basePricePerHour: court.basePricePerHour,
      rules: court.priceRules.map((r) => ({
        dayType: r.dayType,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
        pricePerHour: r.pricePerHour,
        label: r.label,
      })),
    };
    const quote = calculatePrice(pricingInput, firstSlot.startAt, lastSlot.endAt);

    // 35% chọn customer@sango.vn
    const customer = attempts % 3 === 0 ? primaryCustomer : customers[attempts % customers.length];

    const isPast = lastSlot.endAt.getTime() <= now.getTime();
    let status: BookingStatus;
    if (isPast) {
      const mod = attempts % 10;
      status = mod < 8 ? 'COMPLETED' : mod === 8 ? 'CANCELLED' : 'REJECTED';
    } else {
      status = attempts % 2 === 0 ? 'PENDING' : 'CONFIRMED';
    }

    const shouldLock = status === 'PENDING' || status === 'CONFIRMED' || status === 'COMPLETED';
    if (shouldLock) {
      for (const s of slotStarts) {
        occupied.add(`${court.id}|${s.toISOString()}`);
      }
    }

    const code = makeSeedCode(codeSeq++, dateStr);
    const createdAt = new Date(firstSlot.startAt.getTime() - 24 * 3600_000);

    bookingRows.push({
      code,
      customerId: customer.id,
      courtId: court.id,
      startAt: firstSlot.startAt,
      endAt: lastSlot.endAt,
      totalPrice: quote.total,
      priceBreakdown: quote.breakdown as unknown as Prisma.InputJsonValue,
      status,
      contactPhone: customer.phone ?? '0901234567',
      note: attempts % 5 === 0 ? 'Chuẩn bị giúp bóng/lưới' : null,
      cancelReason: status === 'CANCELLED' ? 'Thay đổi lịch cá nhân' : null,
      rejectReason: status === 'REJECTED' ? 'Sân bảo trì đột xuất' : null,
      confirmedAt:
        status === 'CONFIRMED' || status === 'COMPLETED'
          ? new Date(createdAt.getTime() + 1800_000)
          : null,
      completedAt: status === 'COMPLETED' ? lastSlot.endAt : null,
      cancelledAt:
        status === 'CANCELLED' ? new Date(firstSlot.startAt.getTime() - 4 * 3600_000) : null,
      rejectedAt: status === 'REJECTED' ? new Date(createdAt.getTime() + 3600_000) : null,
      createdAt,
    });

    if (shouldLock) {
      for (const s of slotStarts) {
        lockRows.push({ courtId: court.id, startAt: s, bookingCode: code });
      }
    }
  }

  await prisma.booking.createMany({ data: bookingRows });

  const inserted = await prisma.booking.findMany({
    where: { code: { in: bookingRows.map((b) => b.code) } },
    select: { id: true, code: true },
  });
  const codeToId = new Map(inserted.map((b) => [b.code, b.id]));

  const slotLockData: Prisma.SlotLockCreateManyInput[] = [];
  for (const l of lockRows) {
    const bookingId = codeToId.get(l.bookingCode);
    if (bookingId) {
      slotLockData.push({
        courtId: l.courtId,
        startAt: l.startAt,
        bookingId,
        holdId: null,
        expiresAt: null,
      });
    }
  }

  if (slotLockData.length > 0) {
    await prisma.slotLock.createMany({
      data: slotLockData,
      skipDuplicates: true,
    });
  }

  void adminUser;
}
