import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Card, message, Space, Tabs, Tag, Typography } from 'antd';
import {
  MAX_SLOTS_PER_BOOKING,
  SLOT_MINUTES,
  SPORT_LABELS,
  formatMinute,
  toVnParts,
  type AvailabilitySlot,
  type CourtSummaryDto,
} from '@sango/shared';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { formatCurrency, formatDate } from '@/common/utils/format';
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from '@/features/auth/model/authSlice';
import {
  draftStarted,
  holdAttached,
} from '@/features/booking/model/bookingDraftSlice';
import { useCreateHoldMutation } from '@/features/booking/api/holdApi';
import { useCourtWeekAvailability } from '../hooks/useCourtWeekAvailability';
import { useSlotSelection } from '../hooks/useSlotSelection';
import { AvailabilityGrid, SlotCell } from './AvailabilityGrid';
import { availabilityApi } from '../api/availabilityApi';

export interface BookingDraftPayload {
  venue: { id: string; slug: string; name: string };
  court: CourtSummaryDto;
  slots: {
    startAt: string;
    endAt: string;
    price: number;
    label: string | null;
  }[];
}

export interface CourtWeekScheduleProps {
  venue: { id: string; slug: string; name: string };
  courts: CourtSummaryDto[];
  onBook?: (draftPayload: BookingDraftPayload) => void;
}

export const CourtWeekSchedule: React.FC<CourtWeekScheduleProps> = ({
  venue,
  courts,
  onBook,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialDateParam = searchParams.get('date') ?? undefined;

  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [selectedCourtId, setSelectedCourtId] = useState<string>(
    () => courts[0]?.id ?? '',
  );

  useEffect(() => {
    if (courts.length > 0 && !courts.some((c) => c.id === selectedCourtId)) {
      setSelectedCourtId(courts[0].id);
    }
  }, [courts, selectedCourtId]);

  const currentCourt = useMemo(
    () => courts.find((c) => c.id === selectedCourtId) ?? courts[0],
    [courts, selectedCourtId],
  );

  const {
    weekStart,
    setWeekStart,
    data: weekData,
    isFetching,
  } = useCourtWeekAvailability({
    courtId: currentCourt?.id ?? '',
    initialDateStr: initialDateParam,
  });

  // Bảng ánh xạ startAt -> ngày hoạt động để kiểm tra 2 khung có thuộc cùng ngày hoạt động hay không
  const slotDayMap = useMemo(() => {
    const map = new Map<string, string>();
    if (weekData?.days) {
      for (const day of weekData.days) {
        for (const slot of day.slots) {
          map.set(slot.startAt, day.date);
        }
      }
    }
    return map;
  }, [weekData]);

  const {
    selected,
    isSelected,
    toggle,
    clear,
    error: selectionError,
  } = useSlotSelection<AvailabilitySlot>({
    getKey: (s) => s.startAt,
    isSelectable: (s) => s.status === 'AVAILABLE' || s.status === 'HELD_BY_ME',
    isAdjacent: (a, b) => {
      if (a.endAt !== b.startAt) return false;
      const dayA = slotDayMap.get(a.startAt);
      const dayB = slotDayMap.get(b.startAt);
      if (dayA && dayB) return dayA === dayB;
      return true;
    },
    max: MAX_SLOTS_PER_BOOKING,
  });

  // Xóa lựa chọn khi đổi sân con hoặc đổi tuần
  const handleCourtChange = useCallback(
    (courtId: string) => {
      setSelectedCourtId(courtId);
      clear();
    },
    [clear],
  );

  const handleWeekChange = useCallback(
    (newWeekStart: string) => {
      setWeekStart(newWeekStart);
      clear();
    },
    [setWeekStart, clear],
  );

  // Tính tổng tiền tạm tính = Σ price
  const totalPrice = useMemo(
    () => selected.reduce((sum, s) => sum + (s.price ?? 0), 0),
    [selected],
  );

  const summaryTimeText = useMemo(() => {
    if (selected.length === 0) return '';
    const first = selected[0];
    const last = selected[selected.length - 1];
    const operatingDate =
      slotDayMap.get(first.startAt) ?? toVnParts(new Date(first.startAt)).dateStr;
    const startLabel = formatMinute(first.minuteOfDay);
    const endLabel = formatMinute(last.minuteOfDay + SLOT_MINUTES);
    return `${formatDate(operatingDate)} • ${startLabel} – ${endLabel} (${selected.length} giờ)`;
  }, [selected, slotDayMap]);

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isCustomer = isAuthenticated && user?.role === 'CUSTOMER';

  const [createHold, { isLoading: isCreatingHold }] = useCreateHoldMutation();

  const handleBookClick = async () => {
    if (selected.length === 0 || !currentCourt) return;

    if (!isAuthenticated) {
      const redirectUrl = encodeURIComponent(
        `${location.pathname}${location.search}`,
      );
      navigate(`/login?redirect=${redirectUrl}`);
      return;
    }

    const draftPayload: BookingDraftPayload = {
      venue: { id: venue.id, slug: venue.slug, name: venue.name },
      court: currentCourt,
      slots: selected.map((s) => ({
        startAt: s.startAt,
        endAt: s.endAt,
        price: s.price ?? 0,
        label: s.label,
      })),
    };

    if (onBook) {
      onBook(draftPayload);
      return;
    }

    // dispatch draftStarted trước
    dispatch(draftStarted(draftPayload));

    // Tạo hold
    const first = selected[0];
    const last = selected[selected.length - 1];
    try {
      const hold = await createHold({
        courtId: currentCourt.id,
        startAt: first.startAt,
        endAt: last.endAt,
      }).unwrap();

      dispatch(holdAttached({ holdId: hold.id, holdExpiresAt: hold.expiresAt }));
    } catch (err: unknown) {
      const apiErr = err as { status?: number };
      if (apiErr?.status === 409) {
        void message.warning('Khung giờ vừa bị giữ. Vui lòng chọn khung khác.');
        dispatch(availabilityApi.util.invalidateTags(['Availability']));
        return;
      }
      // Nếu hold thất bại vì lý do khác, vẫn cho tiếp tục checkout không có hold
    }

    navigate('/booking/checkout');
  };

  const handleRecurringClick = () => {
    if (selected.length === 0 || !currentCourt) return;
    const first = selected[0];
    const operatingDate =
      slotDayMap.get(first.startAt) ?? toVnParts(new Date(first.startAt)).dateStr;
    const params = new URLSearchParams({
      courtId: currentCourt.id,
      date: operatingDate,
      startMinute: String(first.minuteOfDay),
      slotCount: String(selected.length),
    });
    navigate(`/me/recurring/new?${params.toString()}`);
  };

  if (courts.length === 0) {
    return (
      <Card>
        <Typography.Text type="secondary">
          Cụm sân này hiện chưa có sân con đang hoạt động.
        </Typography.Text>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <Tabs
        activeKey={currentCourt?.id}
        onChange={handleCourtChange}
        items={courts.map((c) => ({
          key: c.id,
          label: (
            <Space size={6}>
              <span>{c.name}</span>
              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                {SPORT_LABELS[c.sport] ?? c.sport}
              </Tag>
            </Space>
          ),
        }))}
      />

      {selectionError && (
        <Alert
          type="warning"
          showIcon
          message={selectionError}
          style={{ marginBottom: 12 }}
        />
      )}

      <AvailabilityGrid
        data={weekData}
        mode="customer"
        isFetching={isFetching}
        isSelected={isSelected}
      >
        <AvailabilityGrid.Toolbar>
          <AvailabilityGrid.WeekNav
            weekStart={weekStart}
            onChange={handleWeekChange}
          />
          <AvailabilityGrid.Legend />
        </AvailabilityGrid.Toolbar>

        <AvailabilityGrid.Table
          renderCell={(slot, { isSelected: cellSelected }) => (
            <SlotCell
              slot={slot}
              selected={cellSelected}
              onClick={toggle}
            />
          )}
        />
      </AvailabilityGrid>

      {/* Thanh tóm tắt khung đã chọn & nút hành động */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div>
          {selected.length > 0 ? (
            <Space orientation="vertical" size={2}>
              <Typography.Text strong data-testid="selected-summary-range">
                Đã chọn: {summaryTimeText}
              </Typography.Text>
              <Typography.Text
                strong
                style={{ fontSize: 16, color: '#0958d9' }}
                data-testid="selected-summary-total"
              >
                Tổng tạm tính: {formatCurrency(totalPrice)}
              </Typography.Text>
            </Space>
          ) : (
            <Typography.Text type="secondary">
              Chọn các khung giờ trống liên tiếp trên lưới để đặt sân (tối đa{' '}
              {MAX_SLOTS_PER_BOOKING} giờ).
            </Typography.Text>
          )}
        </div>

        <Space wrap>
          {selected.length > 0 && (
            <Button onClick={clear}>Bỏ chọn</Button>
          )}

          {isCustomer && selected.length > 0 && (
            <Button onClick={handleRecurringClick}>
              Đặt cố định hàng tuần
            </Button>
          )}

          {!isOwnerOrAdmin && (
            <Button
              type="primary"
              size="large"
              disabled={selected.length === 0}
              loading={isCreatingHold}
              onClick={handleBookClick}
            >
              Đặt sân
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};
