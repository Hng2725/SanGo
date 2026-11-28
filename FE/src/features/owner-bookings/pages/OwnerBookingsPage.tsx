import { Alert, App, Card, DatePicker, Empty, Input, Modal, Pagination, Segmented, Select, Skeleton, Space, Tag } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { BOOKING_STATUSES, type BookingStatus, type OwnerBookingsQuery } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { useDebounce } from '@/common/hooks/useDebounce';
import { useListOwnerVenuesQuery } from '@/features/owner-venues/api/ownerVenueApi';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { OwnerBookingsList } from '../components/OwnerBookingsList';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';
import { useCompleteBookingMutation, useConfirmBookingMutation, useConfirmSeriesMutation, useGetOwnerBookingsPageQuery, useRejectBookingMutation } from '../api/ownerBookingsApi';
import '../components/OwnerBookingsList.css';

const statusOptions = [
  { value: 'ALL', label: 'Tất cả' }, { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' }, { value: 'COMPLETED', label: 'Đã hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' },
];

export default function OwnerBookingsPage() {
  useDocumentTitle('Đơn đặt sân');
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const venues = useListOwnerVenuesQuery();
  const q = useDebounce(params.get('q') ?? '', 400);
  const status = params.get('status') as BookingStatus | null;
  const query: OwnerBookingsQuery = { page: Number(params.get('page') ?? '1'), pageSize: 20, q: q || undefined, status: status ?? undefined, venueId: params.get('venueId') ?? undefined, courtId: params.get('courtId') ?? undefined, from: params.get('from') ?? undefined, to: params.get('to') ?? undefined };
  const bookings = useGetOwnerBookingsPageQuery(query);
  const [confirm] = useConfirmBookingMutation();
  const [complete] = useCompleteBookingMutation();
  const [reject, rejectState] = useRejectBookingMutation();
  const [confirmSeries] = useConfirmSeriesMutation();
  const update = (key: string, value: string | undefined) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.set('page', '1'); setParams(next); };
  const updateDates = (from?: string, to?: string) => { const next = new URLSearchParams(params); from ? next.set('from', from) : next.delete('from'); to ? next.set('to', to) : next.delete('to'); next.set('page', '1'); setParams(next); };
  const run = async (action: () => Promise<unknown>, success: string) => { try { await action(); message.success(success); } catch (error) { message.error(getErrorMessage(error)); } };

  return <div className="owner-bookings-page">
    <PageHeader title="Đơn đặt sân" description="Theo dõi và xử lý các đơn thuộc sân của bạn." />
    <Card className="owner-bookings-filter-card" bordered={false}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Segmented block options={statusOptions} value={status ?? 'ALL'} onChange={(value) => update('status', value === 'ALL' ? undefined : String(value))} />
        <Space wrap className="owner-bookings-filters">
          <Select className="owner-filter-venue" allowClear placeholder="Cụm sân" value={params.get('venueId') ?? undefined} options={venues.data?.map((venue) => ({ value: venue.id, label: venue.name }))} onChange={(value) => update('venueId', value)} />
          <Input placeholder="Mã sân" value={params.get('courtId') ?? ''} onChange={(event) => update('courtId', event.target.value || undefined)} />
          <Input className="owner-filter-search" allowClear placeholder="Tìm mã đơn, tên hoặc số điện thoại" value={params.get('q') ?? ''} onChange={(event) => update('q', event.target.value || undefined)} />
          <Select allowClear placeholder="Trạng thái" value={status ?? undefined} options={BOOKING_STATUSES.map((item) => ({ value: item, label: item }))} onChange={(value) => update('status', value)} />
          <DatePicker.RangePicker onChange={(_, dateStrings) => updateDates(dateStrings[0] || undefined, dateStrings[1] || undefined)} />
          <Tag color="orange">Chờ xác nhận: {status === 'PENDING' ? bookings.data?.total ?? 0 : '—'}</Tag>
        </Space>
      </Space>
    </Card>
    <Card className="owner-bookings-list-card" bordered={false}>
      {bookings.isLoading && <Skeleton active />}
      {bookings.isError && <Alert type="error" message={getErrorMessage(bookings.error)} />}
      {bookings.data && <><OwnerBookingsList items={bookings.data.items} highlightId={params.get('highlight') ?? undefined} hasNextPage={false} onLoadMore={() => undefined} onSelect={setSelectedId} onConfirm={(id) => void run(() => confirm(id).unwrap(), 'Đã xác nhận đơn')} onComplete={(id) => void run(() => complete(id).unwrap(), 'Đã hoàn thành đơn')} onReject={setRejectId} onConfirmSeries={(id) => void run(() => confirmSeries(id).unwrap(), 'Đã xác nhận cả chuỗi')} /><div className="owner-bookings-pagination"><Pagination current={bookings.data.page} pageSize={query.pageSize} total={bookings.data.total} showSizeChanger={false} showTotal={(total) => `${total} đơn`} onChange={(page) => update('page', String(page))} /></div></>}
      {!bookings.isLoading && bookings.data && bookings.data.items.length === 0 && <Empty description="Chưa có đơn đặt sân phù hợp." />}
    </Card>
    <BookingDetailDrawer bookingId={selectedId} onClose={() => setSelectedId(null)} />
    <Modal title="Từ chối đơn" open={Boolean(rejectId)} confirmLoading={rejectState.isLoading} okText="Từ chối" cancelText="Đóng" onCancel={() => setRejectId(null)} onOk={() => { if (rejectId && rejectReason.trim().length >= 3) void run(() => reject({ id: rejectId, input: { reason: rejectReason.trim() } }).unwrap(), 'Đã từ chối đơn').then(() => setRejectId(null)); }}><Input.TextArea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={300} showCount placeholder="Lý do từ chối, tối thiểu 3 ký tự" /></Modal>
  </div>;
}
