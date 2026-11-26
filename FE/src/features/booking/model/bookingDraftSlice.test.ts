import { describe, expect, it } from 'vitest';
import bookingDraftReducer, {
  draftCleared,
  draftStarted,
  holdAttached,
  selectDraftRange,
  selectDraftTotal,
  type BookingDraftState,
} from './bookingDraftSlice';

const mockVenue = { id: 'v1', slug: 'san-abc', name: 'Sân ABC' };
const mockCourt = {
  id: 'c1',
  name: 'Sân 1',
  sport: 'BADMINTON' as const,
  status: 'ACTIVE' as const,
};
const mockSlots = [
  { startAt: '2026-12-01T01:00:00.000Z', endAt: '2026-12-01T02:00:00.000Z', price: 100000, label: '08:00' },
  { startAt: '2026-12-01T02:00:00.000Z', endAt: '2026-12-01T03:00:00.000Z', price: 120000, label: '09:00' },
];

const emptyState: BookingDraftState = {
  venue: null,
  court: null,
  slots: [],
  holdId: null,
  holdExpiresAt: null,
};

describe('bookingDraftSlice reducer', () => {
  it('should return initial state', () => {
    const state = bookingDraftReducer(undefined, { type: '@@INIT' });
    expect(state.venue).toBeNull();
    expect(state.court).toBeNull();
    expect(state.slots).toHaveLength(0);
  });

  it('draftStarted sets venue, court, slots and clears holdId', () => {
    const state = bookingDraftReducer(
      emptyState,
      draftStarted({ venue: mockVenue, court: mockCourt, slots: mockSlots }),
    );
    expect(state.venue).toEqual(mockVenue);
    expect(state.court).toEqual(mockCourt);
    expect(state.slots).toHaveLength(2);
    expect(state.holdId).toBeNull();
    expect(state.holdExpiresAt).toBeNull();
  });

  it('holdAttached sets holdId and holdExpiresAt', () => {
    const base: BookingDraftState = {
      ...emptyState,
      venue: mockVenue,
      court: mockCourt,
      slots: mockSlots,
    };
    const state = bookingDraftReducer(
      base,
      holdAttached({ holdId: 'hold-1', holdExpiresAt: '2026-12-01T01:05:00.000Z' }),
    );
    expect(state.holdId).toBe('hold-1');
    expect(state.holdExpiresAt).toBe('2026-12-01T01:05:00.000Z');
  });

  it('draftCleared resets all fields', () => {
    const base: BookingDraftState = {
      venue: mockVenue,
      court: mockCourt,
      slots: mockSlots,
      holdId: 'hold-1',
      holdExpiresAt: '2026-12-01T01:05:00.000Z',
    };
    const state = bookingDraftReducer(base, draftCleared());
    expect(state.venue).toBeNull();
    expect(state.court).toBeNull();
    expect(state.slots).toHaveLength(0);
    expect(state.holdId).toBeNull();
    expect(state.holdExpiresAt).toBeNull();
  });
});

describe('selectDraftTotal', () => {
  it('returns sum of slot prices', () => {
    const rootState = {
      bookingDraft: {
        ...emptyState,
        slots: mockSlots,
      },
    } as never;
    expect(selectDraftTotal(rootState)).toBe(220000);
  });

  it('returns 0 when no slots', () => {
    const rootState = { bookingDraft: emptyState } as never;
    expect(selectDraftTotal(rootState)).toBe(0);
  });
});

describe('selectDraftRange', () => {
  it('returns startAt of first and endAt of last slot', () => {
    const rootState = {
      bookingDraft: { ...emptyState, slots: mockSlots },
    } as never;
    const range = selectDraftRange(rootState);
    expect(range?.startAt).toBe('2026-12-01T01:00:00.000Z');
    expect(range?.endAt).toBe('2026-12-01T03:00:00.000Z');
  });

  it('returns null when no slots', () => {
    const rootState = { bookingDraft: emptyState } as never;
    expect(selectDraftRange(rootState)).toBeNull();
  });
});
