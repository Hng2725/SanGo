import { useMemo, useState } from 'react';
import { Alert, Button, Select, Space, Tabs } from 'antd';
import { SPORT_LABELS, type AvailabilitySlot } from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { getErrorMessage } from '@/common/api/errors';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FullPageSpinner } from '@/components/feedback/FullPageSpinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { AvailabilityGrid, OwnerSlotCell, useCourtWeekAvailability } from '@/features/availability';
import { BookingDetailDrawer } from '@/features/owner-bookings';
import {
  useGetOwnerVenueQuery,
  useListOwnerVenuesQuery,
} from '@/features/owner-venues/api/ownerVenueApi';

export function OwnerSchedulePage() {
  useDocumentTitle('Lịch sân');
  const venuesQuery = useListOwnerVenuesQuery();
  const venues = venuesQuery.data;
  const [chosenVenueId, setChosenVenueId] = useState('');
  const venueId = venues?.some((venue) => venue.id === chosenVenueId)
    ? chosenVenueId
    : (venues?.[0]?.id ?? '');
  const [chosenCourtId, setChosenCourtId] = useState('');
  const venueQuery = useGetOwnerVenueQuery(venueId, { skip: !venueId });
  const activeCourts = useMemo(
    () => venueQuery.currentData?.courts.filter((court) => court.isActive) ?? [],
    [venueQuery.currentData],
  );
  const courtId = activeCourts.some((court) => court.id === chosenCourtId)
    ? chosenCourtId
    : (activeCourts[0]?.id ?? '');
  const week = useCourtWeekAvailability({ courtId });
  const [bookingId, setBookingId] = useState<string | null>(null);
  const handleSlotClick = (slot: AvailabilitySlot) => {
    if (slot.status === 'BOOKED' && slot.booking) setBookingId(slot.booking.id);
  };

  if (venuesQuery.isLoading) return <FullPageSpinner />;
  return (
    <>
      <PageHeader
        title="Lịch sân"
        description="Theo dõi lịch đặt và bảo trì; bấm vào đơn để xem và xử lý."
      />
      <Space orientation="vertical" size={24} style={{ width: '100%', minWidth: 0 }}>
        {venuesQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title={getErrorMessage(venuesQuery.error)}
            action={<Button onClick={() => void venuesQuery.refetch()}>Thử lại</Button>}
          />
        ) : !venues?.length ? (
          <EmptyState description="Bạn chưa có cụm sân nào. Hãy tạo cụm sân và sân con để xem lịch." />
        ) : (
          <>
            <Select
              aria-label="Chọn cụm sân"
              style={{ width: '100%', maxWidth: 320 }}
              value={venueId}
              options={venues.map((venue) => ({ value: venue.id, label: venue.name }))}
              onChange={(value) => {
                setChosenVenueId(value);
                setChosenCourtId('');
                setBookingId(null);
              }}
            />
            <Section title="Lịch đặt sân theo tuần">
              {venueQuery.isError ? (
                <Alert
                  type="error"
                  title={getErrorMessage(venueQuery.error)}
                  action={<Button onClick={() => void venueQuery.refetch()}>Thử lại</Button>}
                />
              ) : venueQuery.isFetching && !venueQuery.currentData ? (
                <FullPageSpinner />
              ) : !activeCourts.length ? (
                <EmptyState description="Cụm sân này chưa có sân con nào đang hoạt động." />
              ) : (
                <>
                  <Tabs
                    activeKey={courtId}
                    onChange={setChosenCourtId}
                    items={activeCourts.map((court) => ({
                      key: court.id,
                      label: `${court.name} · ${SPORT_LABELS[court.sport]}`,
                    }))}
                  />
                  {week.isError && (
                    <Alert
                      type="error"
                      showIcon
                      title={getErrorMessage(week.error)}
                      action={<Button onClick={() => void week.refetch()}>Thử lại</Button>}
                    />
                  )}
                  <AvailabilityGrid data={week.data} mode="owner" isFetching={week.isFetching}>
                    <AvailabilityGrid.Toolbar>
                      <AvailabilityGrid.WeekNav
                        weekStart={week.weekStart}
                        onChange={week.setWeekStart}
                      />
                      <AvailabilityGrid.Legend />
                    </AvailabilityGrid.Toolbar>
                    <AvailabilityGrid.Table
                      renderCell={(slot) => <OwnerSlotCell slot={slot} onClick={handleSlotClick} />}
                    />
                  </AvailabilityGrid>
                </>
              )}
            </Section>
          </>
        )}
      </Space>
      <BookingDetailDrawer bookingId={bookingId} onClose={() => setBookingId(null)} />
    </>
  );
}

export default OwnerSchedulePage;
