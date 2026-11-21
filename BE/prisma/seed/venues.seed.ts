import type { PrismaClient, Sport } from '@prisma/client';

interface SeedVenueData {
  slug: string;
  name: string;
  address: string;
  district: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  cancelBeforeHours: number;
  description: string;
  isOwner2?: boolean;
  courts: { name: string; sport: Sport; basePrice: number }[];
  openingHoursConfig?: {
    weekendOvernight?: boolean;
    mondayClosed?: boolean;
  };
}

const VENUES_DATA: SeedVenueData[] = [
  {
    slug: 'san-bong-da-hoa-lu',
    name: 'CLB Bóng đá Hoa Lư',
    address: '02 Đinh Tiên Hoàng, Đa Kao',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    latitude: 10.7878,
    longitude: 106.6997,
    phone: '0901234001',
    cancelBeforeHours: 2,
    description:
      'Cụm sân cỏ nhân tạo tiêu chuẩn FIFA tại trung tâm Quận 1, hệ thống đèn chiếu sáng hiện đại.',
    courts: [
      { name: 'Sân 5A (Cỏ nhân tạo)', sport: 'FOOTBALL', basePrice: 250_000 },
      { name: 'Sân 5B (Cỏ nhân tạo)', sport: 'FOOTBALL', basePrice: 250_000 },
      { name: 'Sân 7A (Sân lớn)', sport: 'FOOTBALL', basePrice: 450_000 },
      { name: 'Sân 7B (Sân lớn)', sport: 'FOOTBALL', basePrice: 450_000 },
    ],
  },
  {
    slug: 'cau-long-ky-hoa',
    name: 'Trung tâm Cầu lông Kỳ Hòa',
    address: '238 Đường 3/2, Phường 12',
    district: 'Quận 10',
    city: 'TP. Hồ Chí Minh',
    latitude: 10.7735,
    longitude: 106.671,
    phone: '0901234002',
    cancelBeforeHours: 4,
    description:
      'Sân thảm cầu lông chuyên nghiệp, trần cao thoáng đãng, phục vụ người chơi phong trào và bán chuyên.',
    openingHoursConfig: { mondayClosed: true },
    courts: [
      { name: 'Sân số 1 (Thảm Yonex)', sport: 'BADMINTON', basePrice: 100_000 },
      { name: 'Sân số 2 (Thảm Yonex)', sport: 'BADMINTON', basePrice: 100_000 },
      { name: 'Sân số 3 (Thảm Yonex)', sport: 'BADMINTON', basePrice: 100_000 },
      { name: 'Sân số 4 (Thảm VIP)', sport: 'BADMINTON', basePrice: 120_000 },
    ],
  },
  {
    slug: 'pickleball-thao-dien-hub',
    name: 'Thảo Điền Pickleball Club',
    address: '18 Quốc Hương, Thảo Điền',
    district: 'Thành phố Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    latitude: 10.8048,
    longitude: 106.7381,
    phone: '0901234003',
    cancelBeforeHours: 2,
    description:
      'Câu lạc bộ Pickleball phong cách hiện đại ven sông, mở cửa phục vụ ca đêm cuối tuần cho các giải đấu giao lưu.',
    openingHoursConfig: { weekendOvernight: true },
    courts: [
      { name: 'Pickleball Court 1', sport: 'PICKLEBALL', basePrice: 160_000 },
      { name: 'Pickleball Court 2', sport: 'PICKLEBALL', basePrice: 160_000 },
      { name: 'Pickleball Court 3', sport: 'PICKLEBALL', basePrice: 160_000 },
      { name: 'Pickleball Pro Stadium', sport: 'PICKLEBALL', basePrice: 200_000 },
    ],
  },
  {
    slug: 'the-thao-viet-nam-q7',
    name: 'Khu Liên Hợp Thể Thao Nam Sài Gòn',
    address: '102 Nguyễn Thị Thập, Tân Phú',
    district: 'Quận 7',
    city: 'TP. Hồ Chí Minh',
    latitude: 10.7324,
    longitude: 106.718,
    phone: '0901234004',
    cancelBeforeHours: 3,
    description: 'Tổ hợp thể thao đa năng với sân bóng đá và sân tennis tiêu chuẩn thi đấu.',
    courts: [
      { name: 'Sân bóng mini Q7', sport: 'FOOTBALL', basePrice: 280_000 },
      { name: 'Sân Tennis A (Mặt cứng)', sport: 'TENNIS', basePrice: 220_000 },
      { name: 'Sân Tennis B (Mặt cứng)', sport: 'TENNIS', basePrice: 220_000 },
    ],
  },
  {
    slug: 'cau-long-thanh-da',
    name: 'Sân Cầu Lông & Bóng Chuyền Thanh Đa',
    address: '68 Bình Quới, Cư xá Thanh Đa',
    district: 'Quận Bình Thạnh',
    city: 'TP. Hồ Chí Minh',
    latitude: 10.8228,
    longitude: 106.7212,
    phone: '0901234005',
    cancelBeforeHours: 2,
    description:
      'Sân chơi thoáng mát, giá cả hợp lý cho học sinh, sinh viên và người dân khu vực Bình Thạnh.',
    courts: [
      { name: 'Cầu lông Thanh Đa 1', sport: 'BADMINTON', basePrice: 90_000 },
      { name: 'Cầu lông Thanh Đa 2', sport: 'BADMINTON', basePrice: 90_000 },
      { name: 'Sân Bóng chuyền trong nhà', sport: 'VOLLEYBALL', basePrice: 180_000 },
    ],
  },
  {
    slug: 'tennis-tan-binh-sport',
    name: 'CLB Tennis & Bóng Rổ Tân Bình',
    address: '448 Hoàng Văn Thụ, Phường 4',
    district: 'Quận Tân Bình',
    city: 'TP. Hồ Chí Minh',
    latitude: 10.8015,
    longitude: 106.6534,
    phone: '0901234006',
    cancelBeforeHours: 2,
    description:
      'Cụm sân gần sân bay Tân Sơn Nhất, có bãi đậu xe rộng rãi và căng tin phục vụ giải khát.',
    courts: [
      { name: 'Sân Tennis Center Court', sport: 'TENNIS', basePrice: 240_000 },
      { name: 'Sân Tennis Court 2', sport: 'TENNIS', basePrice: 200_000 },
      { name: 'Sân Bóng rổ Tiêu chuẩn', sport: 'BASKETBALL', basePrice: 220_000 },
    ],
  },
  {
    slug: 'san-the-thao-cau-giay',
    name: 'Cụm Sân Thể Thao Cầu Giấy',
    address: '35 Trần Quý Kiên, Dịch Vọng',
    district: 'Quận Cầu Giấy',
    city: 'Hà Nội',
    latitude: 21.0333,
    longitude: 105.7925,
    phone: '0901234007',
    cancelBeforeHours: 2,
    isOwner2: true,
    description:
      'Cụm sân thể thao tổng hợp trung tâm Cầu Giấy, thu hút đông đảo người chơi bóng đá và cầu lông.',
    courts: [
      { name: 'Sân cỏ CG 1', sport: 'FOOTBALL', basePrice: 300_000 },
      { name: 'Sân cỏ CG 2', sport: 'FOOTBALL', basePrice: 300_000 },
      { name: 'Cầu lông Cầu Giấy 1', sport: 'BADMINTON', basePrice: 110_000 },
      { name: 'Cầu lông Cầu Giấy 2', sport: 'BADMINTON', basePrice: 110_000 },
    ],
  },
  {
    slug: 'to-hop-the-thao-dong-da',
    name: 'Tổ Hợp Thể Thao Đống Đa Sports',
    address: '88 Thái Hà, Trung Liệt',
    district: 'Quận Đống Đa',
    city: 'Hà Nội',
    latitude: 21.018,
    longitude: 105.829,
    phone: '0901234008',
    cancelBeforeHours: 3,
    isOwner2: true,
    description:
      'Địa điểm giao lưu Pickleball và Bóng rổ hàng đầu khu vực Đống Đa, trang thiết bị đồng bộ.',
    courts: [
      { name: 'Đống Đa Pickleball 1', sport: 'PICKLEBALL', basePrice: 170_000 },
      { name: 'Đống Đa Pickleball 2', sport: 'PICKLEBALL', basePrice: 170_000 },
      { name: 'Sân Bóng rổ Đống Đa', sport: 'BASKETBALL', basePrice: 250_000 },
    ],
  },
];

export async function seedVenues(prisma: PrismaClient): Promise<void> {
  const owner1 = await prisma.user.findUnique({ where: { email: 'owner@sango.vn' } });
  const owner2 = await prisma.user.findUnique({ where: { email: 'owner2@sango.vn' } });

  if (!owner1 || !owner2) {
    throw new Error('Cần chạy seedUsers trước khi seedVenues');
  }

  for (const vData of VENUES_DATA) {
    const ownerId = vData.isOwner2 ? owner2.id : owner1.id;
    const imageUrls = [
      `https://picsum.photos/seed/${vData.slug}/800/500`,
      `https://picsum.photos/seed/${vData.slug}-alt/800/500`,
    ];

    const venue = await prisma.venue.upsert({
      where: { slug: vData.slug },
      update: {
        name: vData.name,
        address: vData.address,
        district: vData.district,
        city: vData.city,
        latitude: vData.latitude,
        longitude: vData.longitude,
        phone: vData.phone,
        cancelBeforeHours: vData.cancelBeforeHours,
        description: vData.description,
        imageUrls,
        status: 'ACTIVE',
      },
      create: {
        ownerId,
        slug: vData.slug,
        name: vData.name,
        address: vData.address,
        district: vData.district,
        city: vData.city,
        latitude: vData.latitude,
        longitude: vData.longitude,
        phone: vData.phone,
        cancelBeforeHours: vData.cancelBeforeHours,
        description: vData.description,
        imageUrls,
        status: 'ACTIVE',
      },
    });

    // Seed OpeningHours (7 ngày)
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      let isClosed = false;
      let openMinute = 360; // 06:00
      let closeMinute = 1320; // 22:00

      if (vData.openingHoursConfig?.mondayClosed && dayOfWeek === 1) {
        // Nghỉ Thứ 2
        isClosed = true;
      } else if (vData.openingHoursConfig?.weekendOvernight) {
        // Cuối tuần (T6, T7 mở qua đêm đến 02:00 hôm sau)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          openMinute = 1080; // 18:00
          closeMinute = 1560; // 02:00 hôm sau (+1)
        } else {
          openMinute = 480; // 08:00
          closeMinute = 1320; // 22:00
        }
      }

      await prisma.openingHour.upsert({
        where: {
          venueId_dayOfWeek: {
            venueId: venue.id,
            dayOfWeek,
          },
        },
        update: { isClosed, openMinute, closeMinute },
        create: {
          venueId: venue.id,
          dayOfWeek,
          isClosed,
          openMinute,
          closeMinute,
        },
      });
    }

    // Seed Courts & PriceRules
    for (const cData of vData.courts) {
      const court = await prisma.court.upsert({
        where: {
          venueId_name: {
            venueId: venue.id,
            name: cData.name,
          },
        },
        update: {
          sport: cData.sport,
          basePricePerHour: cData.basePrice,
          isActive: true,
        },
        create: {
          venueId: venue.id,
          name: cData.name,
          sport: cData.sport,
          basePricePerHour: cData.basePrice,
          isActive: true,
        },
      });

      // Tạo bảng giá giờ vàng ngày thường và cuối tuần
      await prisma.priceRule.deleteMany({ where: { courtId: court.id } });
      await prisma.priceRule.createMany({
        data: [
          {
            courtId: court.id,
            dayType: 'WEEKDAY',
            startMinute: 1020, // 17:00
            endMinute: 1260, // 21:00
            pricePerHour: cData.basePrice + 50_000,
            label: 'Giờ vàng ngày thường',
          },
          {
            courtId: court.id,
            dayType: 'WEEKEND',
            startMinute: 480, // 08:00
            endMinute: 1260, // 21:00
            pricePerHour: cData.basePrice + 70_000,
            label: 'Cao điểm cuối tuần',
          },
        ],
      });
    }
  }
}
