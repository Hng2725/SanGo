import { useEffect, useState } from 'react';
import { addDaysToDateStr, startOfWeekDateStr, toVnParts } from '@sango/shared';
import { availabilityApi, useGetCourtWeekQuery } from '../api/availabilityApi';

export interface UseCourtWeekAvailabilityOptions {
  courtId: string;
  initialDateStr?: string;
}

export function useCourtWeekAvailability({
  courtId,
  initialDateStr,
}: UseCourtWeekAvailabilityOptions) {
  const [weekStart, setWeekStart] = useState<string>(() => {
    const baseDate = initialDateStr ?? toVnParts(new Date()).dateStr;
    try {
      return startOfWeekDateStr(baseDate);
    } catch {
      return startOfWeekDateStr(toVnParts(new Date()).dateStr);
    }
  });

  const queryResult = useGetCourtWeekQuery(
    { courtId, weekStart },
    { skip: !courtId, pollingInterval: 30000 },
  );

  const prefetchCourtWeek = availabilityApi.usePrefetch('getCourtWeek');

  // Prefetch tuần kế tiếp để khi người dùng bấm "Tuần sau" hiển thị tức thì
  useEffect(() => {
    if (!courtId) return;
    const nextWeekStart = addDaysToDateStr(weekStart, 7);
    prefetchCourtWeek({ courtId, weekStart: nextWeekStart });
  }, [courtId, weekStart, prefetchCourtWeek]);

  return {
    weekStart,
    setWeekStart,
    ...queryResult,
    // RTK Query's data can belong to the previously selected court/week.
    data: queryResult.currentData,
  };
}
