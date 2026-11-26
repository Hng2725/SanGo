import React, { useCallback, useEffect, useState } from 'react';
import { Card, Select, Space, Tabs, Tag, Typography } from 'antd';
import {
  SPORT_LABELS,
  type AvailabilitySlot,
} from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FullPageSpinner } from '@/components/feedback/FullPageSpinner';
import {
  AvailabilityGrid,
  OwnerSlotCell,
  useCourtWeekAvailability,
} from '@/features/availability';
import {
  useGetOwnerVenueQuery,
  useListOwnerVenuesQuery,
} from '@/features/owner-venues/api/ownerVenueApi';

export const OwnerSchedulePage: React.FC = () => {
  useDocumentTitle('Lịch sân');

  const { data: venues, isLoading: isLoadingVenues } = useListOwnerVenuesQuery();

  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');

  useEffect(() => {
    if (venues && venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  const { data: venueDetail, isFetching: isFetchingVenueDetail } =
    useGetOwnerVenueQuery(selectedVenueId, {
      skip: !selectedVenueId,
    });

  const activeCourts =
    venueDetail?.courts.filter((c) => c.isActive) ?? [];

  useEffect(() => {
    if (activeCourts.length > 0) {
      if (!activeCourts.some((c) => c.id === selectedCourtId)) {
        setSelectedCourtId(activeCourts[0].id);
      }
    } else {
      setSelectedCourtId('');
    }
  }, [activeCourts, selectedCourtId]);

  const {
    weekStart,
    setWeekStart,
    data: weekData,
    isFetching: isFetchingWeek,
  } = useCourtWeekAvailability({
    courtId: selectedCourtId,
  });

  // Bấm ô có đơn -> mở trang quản lý đơn đặt kèm highlight=bookingId
  const handleSlotClick = useCallback((slot: AvailabilitySlot) => {
    if (slot.status === 'BOOKED' && slot.booking?.id) {
      window.open(
        `/owner/bookings?highlight=${encodeURIComponent(slot.booking.id)}`,
        '_self',
      );
    }
  }, []);

  if (isLoadingVenues) {
    return <FullPageSpinner />;
  }

  if (!venues || venues.length === 0) {
    return (
      <Card>
        <EmptyState description="Bạn chưa có cụm sân nào. Hãy tạo cụm sân và sân con để xem lịch." />
      </Card>
    );
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Lịch đặt sân theo tuần
            </Typography.Title>
            <Typography.Text type="secondary">
              Theo dõi tình trạng đặt sân, khách hàng và lịch bảo trì của từng sân con
            </Typography.Text>
          </div>

          <Space align="center">
            <Typography.Text strong>Cụm sân:</Typography.Text>
            <Select
              aria-label="Chọn cụm sân"
              style={{ minWidth: 240 }}
              value={selectedVenueId || undefined}
              onChange={(val) => setSelectedVenueId(val)}
              options={venues.map((v) => ({
                value: v.id,
                label: v.name,
              }))}
            />
          </Space>
        </div>
      </Card>

      <Card loading={isFetchingVenueDetail && !venueDetail}>
        {activeCourts.length === 0 ? (
          <EmptyState description="Cụm sân này chưa có sân con nào đang hoạt động." />
        ) : (
          <>
            <Tabs
              activeKey={selectedCourtId}
              onChange={setSelectedCourtId}
              items={activeCourts.map((court) => ({
                key: court.id,
                label: (
                  <Space size={6}>
                    <span>{court.name}</span>
                    <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                      {SPORT_LABELS[court.sport] ?? court.sport}
                    </Tag>
                  </Space>
                ),
              }))}
            />

            <AvailabilityGrid
              data={weekData}
              mode="owner"
              isFetching={isFetchingWeek}
            >
              <AvailabilityGrid.Toolbar>
                <AvailabilityGrid.WeekNav
                  weekStart={weekStart}
                  onChange={setWeekStart}
                />
                <AvailabilityGrid.Legend />
              </AvailabilityGrid.Toolbar>

              <AvailabilityGrid.Table
                renderCell={(slot) => (
                  <OwnerSlotCell
                    slot={slot}
                    selected={false}
                    onClick={handleSlotClick}
                  />
                )}
              />
            </AvailabilityGrid>
          </>
        )}
      </Card>
    </Space>
  );
};

export default OwnerSchedulePage;
