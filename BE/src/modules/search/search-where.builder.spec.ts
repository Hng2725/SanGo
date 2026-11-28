import { describe, it, expect } from '@jest/globals';
import { buildSearchWhere } from './search-where.builder';
import type { SearchVenuesQuery } from '@sango/shared';

const BASE_QUERY: SearchVenuesQuery = {
  page: 1,
  pageSize: 20,
  sort: 'rating',
};

const NOW = new Date('2026-11-26T04:00:00.000Z'); // 11:00 VN

describe('buildSearchWhere', () => {
  it('TC1: không có bộ lọc → chỉ lọc status ACTIVE và courts.some isActive', () => {
    const result = buildSearchWhere(BASE_QUERY, NOW);

    expect(result.status).toBe('ACTIVE');
    expect(result.courts).toEqual({ some: { isActive: true } });
    expect(result.OR).toBeUndefined();
    expect(result.city).toBeUndefined();
    expect(result.district).toBeUndefined();
    expect(result.openingHours).toBeUndefined();
  });

  it('TC2: có q, city, district, sport → thêm điều kiện text search + location + sport', () => {
    const query: SearchVenuesQuery = {
      ...BASE_QUERY,
      q: 'sân cầu',
      city: 'Hà Nội',
      district: 'Cầu Giấy',
      sport: 'BADMINTON',
    };
    const result = buildSearchWhere(query, NOW);

    expect(result.status).toBe('ACTIVE');
    expect(result.OR).toEqual([
      { name: { contains: 'sân cầu', mode: 'insensitive' } },
      { address: { contains: 'sân cầu', mode: 'insensitive' } },
    ]);
    expect(result.city).toEqual({ equals: 'Hà Nội', mode: 'insensitive' });
    expect(result.district).toEqual({ equals: 'Cầu Giấy', mode: 'insensitive' });
    expect(result.courts).toEqual({
      some: { isActive: true, sport: 'BADMINTON' },
    });
  });

  it('TC3: có date/from/to → thêm điều kiện slotLocks.none, maintenanceBlocks.none, openingHours', () => {
    const query: SearchVenuesQuery = {
      ...BASE_QUERY,
      date: '2026-11-27',
      from: '08:00',
      to: '10:00',
    };
    const result = buildSearchWhere(query, NOW);

    expect(result.status).toBe('ACTIVE');

    // openingHours phải có dayOfWeek=5 (thứ 6, 2026-11-27), openMinute<=480, closeMinute>=600
    expect(result.openingHours).toEqual({
      some: {
        isClosed: false,
        OR: [
          { dayOfWeek: 5, openMinute: { lte: 480 }, closeMinute: { gte: 600 } },
          { dayOfWeek: 4, openMinute: { lte: 1920 }, closeMinute: { gte: 2040 } },
        ],
      },
    });

    // courts phải có slotLocks: none và maintenanceBlocks: none
    const courtsCondition = result.courts?.some;
    expect(courtsCondition).toMatchObject({ isActive: true });

    // slotLocks.none phải lọc: startAt trong [fromUtc, toUtc) và (bookingId not null OR expiresAt > now)
    const slotLock = courtsCondition?.slotLocks?.none;
    // 08:00 VN = 01:00 UTC ngày 2026-11-27
    expect(slotLock).toMatchObject({
      startAt: {
        gte: new Date('2026-11-27T01:00:00.000Z'),
        lt: new Date('2026-11-27T03:00:00.000Z'),
      },
      OR: [{ bookingId: { not: null } }, { expiresAt: { gt: NOW } }],
    });

    // maintenanceBlocks.none phải lọc chồng lấp [fromUtc, toUtc)
    expect(courtsCondition?.maintenanceBlocks?.none).toMatchObject({
      startAt: { lt: new Date('2026-11-27T03:00:00.000Z') },
      endAt: { gt: new Date('2026-11-27T01:00:00.000Z') },
    });
  });

  it('TC4: sort=newest → không ảnh hưởng where (kiểm tra where thuần)', () => {
    const query: SearchVenuesQuery = { ...BASE_QUERY, sort: 'newest' };
    const result = buildSearchWhere(query, NOW);
    expect(result.status).toBe('ACTIVE');
  });

  it('TC5: có date/from/to + sport → courts có cả sport và slotLocks.none', () => {
    const query: SearchVenuesQuery = {
      ...BASE_QUERY,
      date: '2026-11-28',
      from: '14:00',
      to: '16:00',
      sport: 'FOOTBALL',
    };
    const result = buildSearchWhere(query, NOW);

    const courtsCondition = result.courts?.some;
    expect(courtsCondition?.sport).toBe('FOOTBALL');
    expect(courtsCondition?.slotLocks).toBeDefined();
    expect(courtsCondition?.maintenanceBlocks).toBeDefined();
  });

  it('finds the previous operating day when searching after midnight on Monday', () => {
    const result = buildSearchWhere(
      { ...BASE_QUERY, date: '2026-11-30', from: '00:00', to: '02:00' },
      NOW,
    );
    expect(result.openingHours?.some?.OR).toEqual([
      { dayOfWeek: 1, openMinute: { lte: 0 }, closeMinute: { gte: 120 } },
      { dayOfWeek: 0, openMinute: { lte: 1440 }, closeMinute: { gte: 1560 } },
    ]);
  });
});
