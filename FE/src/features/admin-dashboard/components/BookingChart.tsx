import dayjs from 'dayjs';
import type { AdminOverviewDto } from '@sango/shared';
import { Fragment, useEffect, useId, useRef, useState, type MouseEvent } from 'react';

interface BookingChartProps {
  days: AdminOverviewDto['last7Days'];
}
const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function BookingChart({ days }: BookingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ date: string; x: number; y: number } | null>(null);
  const tooltipId = useId();
  const followPointer = (event: MouseEvent<HTMLDivElement>, date: string) => {
    const chart = chartRef.current?.getBoundingClientRect();
    if (chart) setPointer({ date, x: event.clientX - chart.left, y: event.clientY - chart.top });
  };

  useEffect(() => {
    const hide = () => setPointer(null);
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !chartRef.current?.contains(event.target)) hide();
    };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('blur', hide);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('blur', hide);
      document.removeEventListener('pointerdown', outside);
    };
  }, []);

  const max = Math.max(1, ...days.map((day) => day.bookings));
  return (
    <div
      ref={chartRef}
      className="booking-chart"
      role="group"
      aria-label="Lượt đặt trong 7 ngày qua"
      onMouseLeave={() => setPointer(null)}
    >
      {days.map((day, index) => {
        const previous = days[index - 1];
        const delta = previous ? day.bookings - previous.bookings : 0;
        const percentage = previous?.bookings
          ? ` (${Math.round(Math.abs(delta / previous.bookings) * 100)}%)`
          : '';
        const comparison = !previous
          ? 'Chưa có dữ liệu ngày trước'
          : delta === 0
            ? 'Không đổi so với ngày trước'
            : `${delta > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(delta)} lượt${percentage} so với ngày trước`;
        const date = dayjs(day.date).format('DD/MM/YYYY');
        const today = index === days.length - 1;
        const label = today ? 'Hôm nay' : weekDays[new Date(`${day.date}T00:00:00Z`).getUTCDay()];
        return (
          <Fragment key={day.date}>
            <div className={`booking-chart-item ${today ? 'booking-chart-today' : ''}`}>
              <div
                className="booking-chart-bar"
                style={{ height: `${Math.max(4, (day.bookings / max) * 100)}%` }}
                role="img"
                aria-label={`${date}: ${day.bookings} lượt đặt`}
                aria-describedby={pointer?.date === day.date ? tooltipId : undefined}
                tabIndex={0}
                onMouseEnter={(event) => followPointer(event, day.date)}
                onMouseMove={(event) => followPointer(event, day.date)}
                onMouseLeave={() => setPointer(null)}
                onFocus={(event) => {
                  const chart = chartRef.current?.getBoundingClientRect();
                  const bar = event.currentTarget.getBoundingClientRect();
                  if (chart)
                    setPointer({
                      date: day.date,
                      x: bar.right - chart.left,
                      y: bar.top - chart.top,
                    });
                }}
                onBlur={() => setPointer(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setPointer(null);
                }}
                onPointerDown={(event) => {
                  if (event.pointerType === 'touch') followPointer(event, day.date);
                }}
              >
                <b>{day.bookings}</b>
              </div>
              <small>{label}</small>
            </div>
            {pointer?.date === day.date && (
              <div
                id={tooltipId}
                role="tooltip"
                className="booking-chart-cursor-tooltip"
                style={{
                  left: `clamp(8px, ${pointer.x + 12}px, calc(100% - 208px))`,
                  top: `clamp(8px, ${pointer.y + 12}px, calc(100% - 100px))`,
                }}
              >
                <div className="booking-chart-detail">
                  <span>
                    {label}, {date}
                  </span>
                  <strong>{day.bookings.toLocaleString('vi-VN')} lượt đặt</strong>
                  <small>{comparison}</small>
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
