import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatDateTime, formatTimeRange } from './format';
describe('VN display formatting', () => {
  it('formats currency and UTC dates in Vietnam time', () => {
    expect(formatCurrency(150000)).toContain('150.000');
    expect(formatDate('2026-11-20T17:00:00Z')).toBe('21/11/2026');
    expect(formatDateTime('2026-11-20T17:00:00Z')).toBe('21/11/2026 00:00');
    expect(formatTimeRange('2026-11-20T17:00:00Z', '2026-11-20T18:00:00Z')).toContain('01:00');
  });
});
