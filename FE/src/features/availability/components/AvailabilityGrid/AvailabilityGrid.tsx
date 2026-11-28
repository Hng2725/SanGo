import React, { useMemo, useState } from 'react';
import {
  toVnParts,
  type AvailabilitySlot,
  type CourtWeekAvailabilityDto,
} from '@sango/shared';
import {
  AvailabilityGridContext,
  type AvailabilityGridMode,
  type GridDayColumn,
} from './AvailabilityGridContext';
import { Table } from './Table';
import { WeekNav } from './WeekNav';
import { Legend } from './Legend';

const VN_DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function parseDayColumn(dateStr: string, isClosed: boolean, todayStr: string): GridDayColumn {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return {
    date: dateStr,
    isClosed,
    dayLabel: VN_DAY_LABELS[utcDay] ?? '',
    shortDateLabel: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
    isToday: dateStr === todayStr,
  };
}

export interface AvailabilityGridProps {
  data?: CourtWeekAvailabilityDto;
  mode?: AvailabilityGridMode;
  isFetching?: boolean;
  isSelected?: (slot: AvailabilitySlot) => boolean;
  children: React.ReactNode;
}

const Toolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    }}
  >
    {children}
  </div>
);

const AvailabilityGridRoot: React.FC<AvailabilityGridProps> = ({
  data,
  mode = 'customer',
  isFetching = false,
  isSelected,
  children,
}) => {
  const todayStr = toVnParts(new Date()).dateStr;

  // Tính danh sách 7 cột ngày bằng useMemo để tránh tạo mảng mới khi chọn ô
  const days = useMemo<GridDayColumn[]>(() => {
    if (!data?.days) return [];
    return data.days.map((d) => parseDayColumn(d.date, d.isClosed, todayStr));
  }, [data, todayStr]);

  // Tính danh sách hàng (minuteOfDay tăng dần) và Map<"date|minute", AvailabilitySlot> bằng useMemo để tra cứu O(1) khi render bảng 7x16
  const { rows, slotMap } = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    const minuteSet = new Set<number>();

    if (data?.days) {
      for (const day of data.days) {
        for (const slot of day.slots) {
          minuteSet.add(slot.minuteOfDay);
          map.set(`${day.date}|${slot.minuteOfDay}`, slot);
        }
      }
    }

    const sortedRows = Array.from(minuteSet).sort((a, b) => a - b);
    return { rows: sortedRows, slotMap: map };
  }, [data]);

  const [chosenMobileDate, setActiveMobileDate] = useState<string>(() => {
    return days.find((d) => d.isToday)?.date ?? days[0]?.date ?? todayStr;
  });

  const activeMobileDate = days.some((day) => day.date === chosenMobileDate)
    ? chosenMobileDate
    : days.find((day) => day.isToday)?.date ?? days[0]?.date ?? todayStr;

  const contextValue = useMemo(
    () => ({
      days,
      rows,
      slotMap,
      mode,
      isFetching,
      isSelected: (slot: AvailabilitySlot) => (isSelected ? isSelected(slot) : false),
      activeMobileDate,
      setActiveMobileDate,
    }),
    [days, rows, slotMap, mode, isFetching, isSelected, activeMobileDate],
  );

  return (
    <AvailabilityGridContext.Provider value={contextValue}>
      <div>{children}</div>
    </AvailabilityGridContext.Provider>
  );
};

export const AvailabilityGrid = Object.assign(AvailabilityGridRoot, {
  Toolbar,
  WeekNav,
  Legend,
  Table,
});
