import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CourtSummaryDto } from '@sango/shared';
import type { RootState } from '@/app/store';

export interface DraftSlot {
  startAt: string;
  endAt: string;
  price: number;
  label: string | null;
}

export interface BookingDraftState {
  venue: { id: string; slug: string; name: string } | null;
  court: CourtSummaryDto | null;
  slots: DraftSlot[];
  holdId: string | null;
  holdExpiresAt: string | null;
}

const SESSION_KEY = 'sango.bookingDraft';

function loadFromSession(): Partial<BookingDraftState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<BookingDraftState>;
  } catch {
    return {};
  }
}

const persisted = loadFromSession();

const initialState: BookingDraftState = {
  venue: persisted.venue ?? null,
  court: persisted.court ?? null,
  slots: persisted.slots ?? [],
  holdId: persisted.holdId ?? null,
  holdExpiresAt: persisted.holdExpiresAt ?? null,
};

const slice = createSlice({
  name: 'bookingDraft',
  initialState,
  reducers: {
    draftStarted(
      state,
      action: PayloadAction<{
        venue: { id: string; slug: string; name: string };
        court: CourtSummaryDto;
        slots: DraftSlot[];
      }>,
    ) {
      state.venue = action.payload.venue;
      state.court = action.payload.court;
      state.slots = action.payload.slots;
      state.holdId = null;
      state.holdExpiresAt = null;
    },
    holdAttached(
      state,
      action: PayloadAction<{ holdId: string; holdExpiresAt: string }>,
    ) {
      state.holdId = action.payload.holdId;
      state.holdExpiresAt = action.payload.holdExpiresAt;
    },
    draftCleared(state) {
      state.venue = null;
      state.court = null;
      state.slots = [];
      state.holdId = null;
      state.holdExpiresAt = null;
    },
  },
});

export const { draftStarted, holdAttached, draftCleared } = slice.actions;

// Selectors
export const selectDraft = (state: RootState) => state.bookingDraft;
export const selectDraftVenue = (state: RootState) => state.bookingDraft.venue;
export const selectDraftCourt = (state: RootState) => state.bookingDraft.court;
export const selectDraftSlots = (state: RootState) => state.bookingDraft.slots;
export const selectDraftHoldId = (state: RootState) => state.bookingDraft.holdId;
export const selectDraftHoldExpiresAt = (state: RootState) =>
  state.bookingDraft.holdExpiresAt;

export const selectDraftTotal = createSelector(
  selectDraftSlots,
  (slots) => slots.reduce((sum, s) => sum + s.price, 0),
);

export const selectDraftRange = createSelector(selectDraftSlots, (slots) => {
  if (slots.length === 0) return null;
  return {
    startAt: slots[0].startAt,
    endAt: slots[slots.length - 1].endAt,
  };
});

export default slice.reducer;
