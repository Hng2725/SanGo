import { createContext, useContext } from 'react';
import type { AvailabilitySlot } from '@sango/shared';

export type AvailabilityGridMode = 'customer' | 'owner';

export interface GridDayColumn {
  date: string;
  isClosed: boolean;
  dayLabel: string;
  shortDateLabel: string;
  isToday: boolean;
}

export interface AvailabilityGridContextValue {
  days: GridDayColumn[];
  rows: number[];
  slotMap: Map<string, AvailabilitySlot>;
  mode: AvailabilityGridMode;
  isFetching: boolean;
  isSelected: (slot: AvailabilitySlot, day: GridDayColumn) => boolean;
  activeMobileDate: string;
  setActiveMobileDate: (date: string) => void;
}

export const AvailabilityGridContext = createContext<AvailabilityGridContextValue | null>(null);

export function useAvailabilityGridContext(): AvailabilityGridContextValue {
  const ctx = useContext(AvailabilityGridContext);
  if (!ctx) {
    throw new Error('AvailabilityGrid sub-components must be used within <AvailabilityGrid>');
  }
  return ctx;
}
