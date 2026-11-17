import type { PrismaClient, Prisma, BookingStatus, Sport } from '@prisma/client';
import { addDaysToDateStr, enumerateSlotStarts, toVnParts, vnDateMinuteToUtc } from '@sango/shared';

const venues: { slug: string; name: string; district: string; sports: Sport[]; price: number }[] = [
  {
    slug: 'demo-san-bong-hoa-lu',
    name: 'Sân bóng Hoa Lư',
    district: 'Quận 1',
    sports: ['FOOTBALL'],
    price: 300000,
  },
  {
    slug: 'demo-cau-long-phu-tho',
    name: 'Cầu lông Phú Thọ',
    district: 'Quận 11',
    sports: ['BADMINTON'],
    price: 100000,
  },
  {
    slug: 'demo-pickleball-thao-dien',
    name: 'Pickleball Thảo Điền',
    district: 'Thành phố Thủ Đức',
    sports: ['PICKLEBALL', 'TENNIS'],
    price: 180000,
  },
  {
    slug: 'demo-tennis-ky-hoa',
    name: 'Tennis Kỳ Hòa',
    district: 'Quận 10',
    sports: ['TENNIS'],
    price: 220000,
  },
  {
    slug: 'demo-the-thao-tan-binh',
    name: 'Thể thao Tân Bình',
    district: 'Quận Tân Bình',
    sports: ['FOOTBALL', 'BADMINTON'],
    price: 160000,
  },
];

/** Updates only records reserved for the local dashboard demo. Safe to run again. */
export async function seedAdminDemo(prisma: PrismaClient, now = new Date()) {
  return prisma.$transaction(
    async (tx) => {
      const generatedCustomers = await tx.user.findMany({
        where: { role: 'CUSTOMER', email: { endsWith: '@sango.vn' } },
        select: { id: true, email: true, fullName: true },
      });
      const excessIds = generatedCustomers
        .filter((user) => {
          const number = /^customer(\d{3})@sango\.vn$/.exec(user.email)?.[1];
          return number && Number(number) > 8 && user.fullName === `Khách hàng ${number}`;
        })
        .map((user) => user.id);
      // Preserve customers that have acquired real activity since the original seed.
      const removed = await tx.user.deleteMany({
        where: {
          id: { in: excessIds },
          bookings: { none: {} },
          reviews: { none: {} },
          complaints: { none: {} },
          holds: { none: {} },
          recurringSeries: { none: {} },
          venues: { none: {} },
          handledComplaints: { none: {} },
          maintenanceBlocks: { none: {} },
        },
      });
      const customers = await tx.user.findMany({
        where: { role: 'CUSTOMER', status: 'ACTIVE' },
        orderBy: { email: 'asc' },
        take: 10,
      });
      const owners = await tx.user.findMany({
        where: { role: 'OWNER', ownerStatus: 'APPROVED', status: 'ACTIVE' },
        orderBy: { email: 'asc' },
        take: 2,
      });
      if (!customers.length || !owners.length)
        throw new Error('Cần tài khoản khách và chủ sân demo trước khi tạo dữ liệu.');

      const courts: { id: string; venueId: string; price: number }[] = [];
      for (const [index, venue] of venues.entries()) {
        const data = {
          ownerId: owners[index % owners.length].id,
          name: venue.name,
          slug: venue.slug,
          address: `${20 + index * 12} Đường số ${index + 1}`,
          district: venue.district,
          city: 'TP. Hồ Chí Minh',
          description: 'Dữ liệu mẫu để xem giao diện quản trị SanGo.',
          imageUrls: [],
          phone: '0901234567',
        };
        const saved = await tx.venue.upsert({
          where: { slug: venue.slug },
          update: data,
          create: data,
        });
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          const hours = { isClosed: false, openMinute: 360, closeMinute: 1440 };
          await tx.openingHour.upsert({
            where: { venueId_dayOfWeek: { venueId: saved.id, dayOfWeek } },
            update: hours,
            create: { venueId: saved.id, dayOfWeek, ...hours },
          });
        }
        for (let courtIndex = 0; courtIndex < 4; courtIndex++) {
          const court = {
            name: `Sân ${courtIndex + 1}`,
            sport: venue.sports[courtIndex % venue.sports.length],
            basePricePerHour: venue.price,
          };
          const savedCourt = await tx.court.upsert({
            where: { venueId_name: { venueId: saved.id, name: court.name } },
            update: court,
            create: { ...court, venueId: saved.id },
          });
          courts.push({ id: savedCourt.id, venueId: saved.id, price: venue.price });
        }
      }

      const { dateStr: today, minuteOfDay } = toVnParts(now);
      const dayCounts = [18, 24, 28, 36, 31, 26, 38];
      const completed: { id: string; venueId: string; customerId: string; endAt: Date }[] = [];
      let bookingCount = 0;
      for (const [day, count] of dayCounts.entries()) {
        const date = addDaysToDateStr(today, day - 6);
        for (let index = 0; index < count; index++) {
          const court = courts[index % courts.length];
          const customer = customers[(index + day) % customers.length];
          const soon = day === 6 && index >= count - 3;
          const minute = soon
            ? Math.max(840, Math.ceil((minuteOfDay + 1) / 60) * 60)
            : 480 + Math.floor(index / courts.length) * 120;
          const startAt = vnDateMinuteToUtc(
            soon && minute > 1320 ? addDaysToDateStr(date, 1) : date,
            soon && minute > 1320 ? 480 : minute,
          );
          const endAt = new Date(startAt.getTime() + 2 * 3600000);
          const status: BookingStatus = soon
            ? 'PENDING'
            : index % 11 === 0
              ? 'CANCELLED'
              : index % 13 === 0
                ? 'REJECTED'
                : endAt <= now
                  ? 'COMPLETED'
                  : 'CONFIRMED';
          const data = {
            code: `DEMO-ADMIN-${day}-${index}`,
            customerId: customer.id,
            courtId: court.id,
            startAt,
            endAt,
            totalPrice: court.price * 2,
            status,
            contactPhone: '0901234567',
            note: 'Đơn mẫu để xem giao diện Tổng quan.',
            priceBreakdown: enumerateSlotStarts(startAt, endAt).map((slot) => ({
              startAt: slot.toISOString(),
              endAt: new Date(slot.getTime() + 3600000).toISOString(),
              price: court.price,
              label: 'Giá cơ bản',
            })) satisfies Prisma.InputJsonValue,
            createdAt:
              day === 6
                ? new Date(Math.min(now.getTime(), vnDateMinuteToUtc(date, 420 + index).getTime()))
                : vnDateMinuteToUtc(date, 420 + index),
            confirmedAt: status === 'CONFIRMED' || status === 'COMPLETED' ? startAt : null,
            completedAt: status === 'COMPLETED' ? endAt : null,
            cancelledAt: status === 'CANCELLED' ? startAt : null,
            rejectedAt: status === 'REJECTED' ? startAt : null,
            cancelReason: status === 'CANCELLED' ? 'Khách đổi lịch chơi (mẫu).' : null,
            rejectReason: status === 'REJECTED' ? 'Sân bảo trì (mẫu).' : null,
          };
          const saved = await tx.booking.upsert({
            where: { code: data.code },
            update: data,
            create: data,
          });
          await tx.slotLock.deleteMany({ where: { bookingId: saved.id } });
          if (status === 'CONFIRMED' || status === 'PENDING') {
            await tx.slotLock.createMany({
              data: enumerateSlotStarts(startAt, endAt).map((slot) => ({
                courtId: court.id,
                startAt: slot,
                bookingId: saved.id,
              })),
            });
          }
          if (status === 'COMPLETED')
            completed.push({
              id: saved.id,
              venueId: court.venueId,
              customerId: customer.id,
              endAt,
            });
          bookingCount++;
        }
      }

      const comments = [
        'Sân sạch, ánh sáng tốt.',
        'Chủ sân hỗ trợ nhiệt tình.',
        'Mặt sân đẹp, sẽ quay lại.',
      ];
      for (const [index, venue] of venues.entries()) {
        const saved = await tx.venue.findUniqueOrThrow({ where: { slug: venue.slug } });
        for (const [reviewIndex, booking] of completed
          .filter((item) => item.venueId === saved.id)
          .slice(0, 5)
          .entries()) {
          const data = {
            venueId: saved.id,
            userId: booking.customerId,
            rating: reviewIndex === index % 3 ? 4 : 5,
            comment: comments[reviewIndex % comments.length],
            createdAt: booking.endAt,
          };
          await tx.review.upsert({
            where: { bookingId: booking.id },
            update: data,
            create: { bookingId: booking.id, ...data },
          });
        }
        const ratings = await tx.review.aggregate({
          where: { venueId: saved.id },
          _avg: { rating: true },
          _count: true,
        });
        await tx.venue.update({
          where: { id: saved.id },
          data: { avgRating: ratings._avg.rating ?? 0, reviewCount: ratings._count },
        });
        if (index < 3) {
          const complaint = {
            authorId: customers[index % customers.length].id,
            venueId: saved.id,
            title: ['Cần kiểm tra hệ thống đèn', 'Lịch sân chưa khớp', 'Đề nghị hỗ trợ đổi giờ'][
              index
            ],
            content: 'Nội dung khiếu nại mẫu để xem giao diện quản trị.',
            status: 'OPEN' as const,
          };
          await tx.complaint.upsert({
            where: { id: `demo-admin-complaint-${index}` },
            update: complaint,
            create: { id: `demo-admin-complaint-${index}`, ...complaint },
          });
        }
      }
      return {
        removedCustomers: removed.count,
        customers: await tx.user.count({ where: { role: 'CUSTOMER' } }),
        venues: venues.length,
        bookings: bookingCount,
      };
    },
    { timeout: 60000 },
  );
}
