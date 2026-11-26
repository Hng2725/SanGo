import React from 'react';
import { Grid, Spin, Tag, Typography } from 'antd';
import {
  formatMinute,
  SLOT_MINUTES,
  type AvailabilitySlot,
} from '@sango/shared';
import {
  useAvailabilityGridContext,
  type GridDayColumn,
} from './AvailabilityGridContext';

export interface RenderCellContext {
  day: GridDayColumn;
  isSelected: boolean;
}

export interface AvailabilityGridTableProps {
  renderCell: (slot: AvailabilitySlot, ctx: RenderCellContext) => React.ReactNode;
}

function makeClosedSlot(dateStr: string, minuteOfDay: number): AvailabilitySlot {
  return {
    startAt: `${dateStr}T${formatMinute(minuteOfDay)}:00`,
    endAt: `${dateStr}T${formatMinute(minuteOfDay + SLOT_MINUTES)}:00`,
    minuteOfDay,
    status: 'CLOSED',
    price: null,
    label: null,
  };
}

export const Table: React.FC<AvailabilityGridTableProps> = ({ renderCell }) => {
  const {
    days,
    rows,
    slotMap,
    isFetching,
    isSelected,
    activeMobileDate,
    setActiveMobileDate,
  } = useAvailabilityGridContext();

  const screens = Grid.useBreakpoint();
  // Mobile khi đã xác định màn hình < md (xs hoặc sm = true và md = false)
  const isMobile =
    (screens.xs || screens.sm) && screens.md === false;

  const visibleDays = isMobile
    ? days.filter((d) => d.date === activeMobileDate)
    : days;

  const displayedDays = visibleDays.length > 0 ? visibleDays : days.slice(0, 1);

  if (rows.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#8c8c8c' }}>
        Không có khung giờ hoạt động trong tuần này.
      </div>
    );
  }

  return (
    <Spin spinning={isFetching}>
      {/* Dải chip chọn ngày cho màn hình Mobile (< md) */}
      {isMobile && (
        <div
          role="tablist"
          aria-label="Chọn ngày trong tuần"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 8,
          }}
        >
          {days.map((day) => {
            const active = day.date === activeMobileDate;
            return (
              <Tag.CheckableTag
                key={day.date}
                checked={active}
                onChange={() => setActiveMobileDate(day.date)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: day.isToday ? '1px solid #1677ff' : '1px solid #d9d9d9',
                  fontWeight: active || day.isToday ? 600 : 400,
                }}
              >
                {day.dayLabel} ({day.shortDateLabel})
              </Tag.CheckableTag>
            );
          })}
        </div>
      )}

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            minWidth: isMobile ? 280 : 760,
            borderCollapse: 'separate',
            borderSpacing: 6,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: 96,
                  textAlign: 'center',
                  padding: '8px 6px',
                  background: '#fafafa',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#595959',
                }}
              >
                Khung giờ
              </th>
              {displayedDays.map((day) => (
                <th
                  key={day.date}
                  style={{
                    textAlign: 'center',
                    padding: '8px 6px',
                    borderRadius: 6,
                    background: day.isToday ? '#e6f4ff' : '#fafafa',
                    border: day.isToday ? '1px solid #91caff' : '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: day.isToday ? '#0958d9' : '#262626',
                    }}
                  >
                    {day.dayLabel}
                  </div>
                  <Typography.Text
                    type={day.isToday ? undefined : 'secondary'}
                    style={{
                      fontSize: 12,
                      color: day.isToday ? '#1677ff' : undefined,
                    }}
                  >
                    {day.shortDateLabel}
                  </Typography.Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((minute) => {
              const rangeLabel = `${formatMinute(minute)} – ${formatMinute(minute + SLOT_MINUTES)}`;
              return (
                <tr key={minute}>
                  <td
                    style={{
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: 12,
                      color: '#595959',
                      background: '#fafafa',
                      borderRadius: 6,
                      padding: '4px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {rangeLabel}
                  </td>
                  {displayedDays.map((day) => {
                    const key = `${day.date}|${minute}`;
                    const slot =
                      day.isClosed
                        ? makeClosedSlot(day.date, minute)
                        : (slotMap.get(key) ?? makeClosedSlot(day.date, minute));
                    const selected = isSelected(slot, day);
                    return (
                      <td key={key} style={{ verticalAlign: 'middle', padding: 0 }}>
                        {renderCell(slot, { day, isSelected: selected })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Spin>
  );
};
