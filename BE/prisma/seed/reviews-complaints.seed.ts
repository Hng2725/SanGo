import type { ComplaintStatus, Prisma, PrismaClient } from '@prisma/client';

const SAMPLE_COMMENTS = [
  'Mặt sân đẹp, đèn sáng rõ, nhân viên hỗ trợ nhiệt tình.',
  'Sân sạch sẽ, thoáng mát, giá cả hợp lý vào giờ thường.',
  'Đặt lịch nhanh gọn, đúng giờ, sẽ quay lại đặt tiếp.',
  'Chất lượng sân ổn nhưng chỗ gửi xe hơi chật vào giờ cao điểm.',
  'Sân có mái che tốt, trời mưa vẫn chơi thoải mái.',
  'Mặt sân hơi trơn ở góc phải, mong chủ sân kiểm tra lại.',
];

const SAMPLE_REPLIES = [
  'Cảm ơn bạn đã tin tưởng và đặt sân tại cụm sân của chúng tôi!',
  'Rất vui được phục vụ bạn, hẹn gặp lại vào những buổi chơi tiếp theo.',
  'Cảm ơn góp ý của bạn, chúng tôi đã ghi nhận và sẽ khắc phục ngay.',
];

export async function seedReviewsAndComplaints(
  prisma: PrismaClient,
  now = new Date(),
): Promise<void> {
  const [completedBookings, admin, venues] = await Promise.all([
    prisma.booking.findMany({
      where: { status: 'COMPLETED', review: null },
      include: { court: { select: { venueId: true } } },
      orderBy: { startAt: 'asc' },
    }),
    prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }),
    prisma.venue.findMany({ where: { status: 'ACTIVE' }, select: { id: true } }),
  ]);

  const reviewRows: Prisma.ReviewCreateManyInput[] = [];
  for (let i = 0; i < completedBookings.length; i += 1) {
    // Đánh giá ~40% đơn COMPLETED
    if (i % 5 >= 2) continue;
    const b = completedBookings[i];
    const mod = i % 10;
    const rating = mod === 0 ? 2 : mod === 1 ? 3 : mod < 5 ? 4 : 5;

    reviewRows.push({
      bookingId: b.id,
      venueId: b.court.venueId,
      userId: b.customerId,
      rating,
      comment: SAMPLE_COMMENTS[i % SAMPLE_COMMENTS.length],
      ownerReply: i % 3 === 0 ? SAMPLE_REPLIES[i % SAMPLE_REPLIES.length] : null,
      createdAt: new Date(b.endAt.getTime() + 3600_000),
    });
  }

  if (reviewRows.length > 0) {
    await prisma.review.createMany({ data: reviewRows, skipDuplicates: true });
  }

  // Cập nhật avgRating & reviewCount cho tất cả venue
  const grouped = await prisma.review.groupBy({
    by: ['venueId'],
    _avg: { rating: true },
    _count: { rating: true },
  });
  const aggMap = new Map(
    grouped.map((g) => [
      g.venueId,
      {
        avgRating: Number((g._avg.rating ?? 0).toFixed(2)),
        reviewCount: g._count.rating,
      },
    ]),
  );

  for (const v of venues) {
    const stat = aggMap.get(v.id) ?? { avgRating: 0, reviewCount: 0 };
    await prisma.venue.update({
      where: { id: v.id },
      data: stat,
    });
  }

  // Tạo 12 khiếu nại đủ trạng thái
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER', status: 'ACTIVE' },
    take: 5,
    select: { id: true },
  });

  if (customers.length === 0 || venues.length === 0) return;

  const statuses: ComplaintStatus[] = [
    'OPEN',
    'OPEN',
    'OPEN',
    'IN_PROGRESS',
    'IN_PROGRESS',
    'IN_PROGRESS',
    'RESOLVED',
    'RESOLVED',
    'RESOLVED',
    'REJECTED',
    'REJECTED',
    'REJECTED',
  ];

  const complaintRows: Prisma.ComplaintCreateManyInput[] = statuses.map((status, idx) => {
    const venue = venues[idx % venues.length];
    const customer = customers[idx % customers.length];
    const booking = completedBookings[idx];
    const isResolved = status === 'RESOLVED' || status === 'REJECTED';

    return {
      authorId: customer.id,
      venueId: venue.id,
      bookingId: booking && booking.customerId === customer.id ? booking.id : null,
      title: `Phản ánh dịch vụ sân #${idx + 1}`,
      content: `Nội dung phản ánh chi tiết về chất lượng sân, ánh sáng và thái độ phục vụ ở cụm sân (mẫu #${idx + 1}).`,
      status,
      adminResponse:
        status === 'IN_PROGRESS'
          ? 'Đã tiếp nhận và đang liên hệ chủ sân để xác minh.'
          : isResolved
            ? status === 'RESOLVED'
              ? 'Đã làm việc với chủ sân và khắc phục sự cố.'
              : 'Thông tin phản ánh chưa đủ căn cứ để xử lý.'
            : null,
      handledById: status !== 'OPEN' && admin ? admin.id : null,
      resolvedAt: isResolved ? now : null,
    };
  });

  await prisma.complaint.createMany({ data: complaintRows });
}
