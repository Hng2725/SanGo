import { Button, Card, Pagination, Segmented, Select, Skeleton, Space } from 'antd';
import { Link, useSearchParams } from 'react-router';
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, isBookingStatus, type BookingStatus, type MyBookingsQuery } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { formatCurrency, formatTimeRange } from '@/common/utils/format';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { useGetMyBookingsQuery } from '../api/myBookingsApi';

type BookingTab = 'upcoming' | 'past' | 'cancelled';

function parseTab(value: string | null): BookingTab {
  return value === 'past' || value === 'cancelled' ? value : 'upcoming';
}

export default function MyBookingsPage() {
  useDocumentTitle('Lịch sử đặt sân');
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get('tab'));
  const rawStatus = params.get('status');
  const status = isBookingStatus(rawStatus) ? rawStatus : null;
  const page = Number(params.get('page') ?? '1');
  const query: MyBookingsQuery = {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: 10,
    upcoming: tab === 'upcoming' ? true : tab === 'past' ? false : undefined,
    status: tab === 'cancelled' ? status ?? 'CANCELLED' : status ?? undefined,
  };
  const bookings = useGetMyBookingsQuery(query);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    });
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Lịch sử đặt sân" description="Theo dõi các đơn đặt sân của bạn." />
      <Section>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Segmented
            value={tab}
            options={[
              { label: 'Sắp tới', value: 'upcoming' },
              { label: 'Đã qua', value: 'past' },
              { label: 'Đã hủy – từ chối', value: 'cancelled' },
            ]}
            onChange={(value) => updateParams({ tab: String(value), status: undefined, page: '1' })}
          />
          <Select<BookingStatus>
            allowClear
            placeholder="Lọc theo trạng thái"
            value={status ?? undefined}
            style={{ maxWidth: 240, width: '100%' }}
            options={BOOKING_STATUSES.map((value) => ({ value, label: BOOKING_STATUS_LABELS[value] }))}
            onChange={(value) => updateParams({ status: value, page: '1' })}
          />
        </Space>
      </Section>
      {bookings.isLoading ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Skeleton active />
          <Skeleton active />
        </Space>
      ) : bookings.isError ? (
        <EmptyState description={getErrorMessage(bookings.error)} action={<Button onClick={() => bookings.refetch()}>Thử lại</Button>} />
      ) : !bookings.data?.items.length ? (
        <EmptyState description="Chưa có đơn đặt sân phù hợp." action={<Link to="/venues"><Button type="primary">Tìm sân</Button></Link>} />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {bookings.data.items.map((booking) => (
            <Card key={booking.id} title={booking.code} extra={<BookingStatusBadge status={booking.status} />}>
              <Space direction="vertical" size={4}>
                <strong>{booking.venue.name} · {booking.court.name}</strong>
                <span>{formatTimeRange(booking.startAt, booking.endAt)}</span>
                <span>{formatCurrency(booking.totalPrice)}</span>
                <Link to={`/me/bookings/${booking.id}`}>Xem chi tiết</Link>
              </Space>
            </Card>
          ))}
          <Pagination current={bookings.data.page} pageSize={bookings.data.pageSize} total={bookings.data.total} onChange={(value) => updateParams({ page: String(value) })} />
        </Space>
      )}
    </>
  );
}
