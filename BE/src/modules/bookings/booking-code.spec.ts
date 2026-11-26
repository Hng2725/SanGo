import { generateBookingCode } from './booking-code';

describe('generateBookingCode', () => {
  it('should generate code starting with SG + yyMMdd (VN time)', () => {
    // 2026-11-26 10:00 UTC = 2026-11-26 17:00 VN → yy=26, MM=11, dd=26
    const now = new Date('2026-11-26T10:00:00.000Z');
    const code = generateBookingCode(now, () => 0.5);
    expect(code).toMatch(/^SG261126[A-Z0-9]{4}$/);
    expect(code).toHaveLength(12); // SG(2) + yyMMdd(6) + base36(4) = 12
  });

  it('should handle VN date crossing midnight', () => {
    // 2026-11-26 18:00 UTC = 2026-11-27 01:00 VN → dd=27
    const now = new Date('2026-11-26T18:00:00.000Z');
    const code = generateBookingCode(now, () => 0.1);
    expect(code).toMatch(/^SG261127[A-Z0-9]{4}$/);
  });

  it('should produce uppercase base36 suffix', () => {
    const now = new Date('2026-01-15T00:00:00.000Z');
    const code = generateBookingCode(now, () => 0.999);
    // Suffix is last 4 chars
    const suffix = code.slice(8);
    expect(suffix).toHaveLength(4);
    expect(suffix).toMatch(/^[A-Z0-9]{4}$/);
  });

  it('should handle rand = 0', () => {
    const now = new Date('2026-06-01T05:00:00.000Z');
    const code = generateBookingCode(now, () => 0);
    const suffix = code.slice(8);
    expect(suffix).toBe('0000');
  });

  it('should produce different codes for different rand values', () => {
    const now = new Date('2026-06-01T05:00:00.000Z');
    const code1 = generateBookingCode(now, () => 0.1);
    const code2 = generateBookingCode(now, () => 0.9);
    expect(code1).not.toEqual(code2);
  });
});
