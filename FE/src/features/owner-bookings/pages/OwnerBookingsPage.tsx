import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tabs,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  isBookingStatus,
  rejectBookingSchema,
  type OwnerBookingsQuery,
} from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { useDebounce } from '@/common/hooks/useDebounce';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { useGetOwnerVenueQuery, useListOwnerVenuesQuery } from '@/features/owner-venues';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { OwnerBookingsList } from '../components/OwnerBookingsList';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';
import {
  useCompleteBookingMutation,
  useConfirmBookingMutation,
  useConfirmSeriesMutation,
  useGetOwnerBookingsPageQuery,
  useRejectBookingMutation,
} from '../api/ownerBookingsApi';
import '../components/OwnerBookingsList.css';

export default function OwnerBookingsPage() {
  useDocumentTitle('Đơn đặt sân');
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const mobile = useMediaQuery('(max-width: 991px)');
  const venues = useListOwnerVenuesQuery();
  const venueId = params.get('venueId') ?? undefined;
  const venue = useGetOwnerVenueQuery(venueId ?? '', { skip: !venueId });
  const q = useDebounce(params.get('q') ?? '', 400);
  const statusParam = params.get('status');
  const status = isBookingStatus(statusParam) ? statusParam : undefined;
  const requestedPage = Number(params.get('page') ?? '1');
  const query: OwnerBookingsQuery = {
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize: 20,
    q: q || undefined,
    status,
    venueId,
    courtId: params.get('courtId') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  };
  const bookings = useGetOwnerBookingsPageQuery(query);
  const [confirm] = useConfirmBookingMutation();
  const [complete] = useCompleteBookingMutation();
  const [reject, rejectState] = useRejectBookingMutation();
  const [confirmSeries] = useConfirmSeriesMutation();
  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in patch)) next.set('page', '1');
    setParams(next);
  };
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      void message.success(success);
    } catch (error) {
      void message.error(getErrorMessage(error));
    }
  };
  const openReject = (id: string) => {
    setRejectId(id);
    setRejectReason('');
    setRejectError('');
  };
  const submitReject = async () => {
    if (!rejectId) return;
    const parsed = rejectBookingSchema.safeParse({ reason: rejectReason });
    if (!parsed.success) {
      setRejectError(parsed.error.issues[0].message);
      return;
    }
    setRejectError('');
    try {
      await reject({ id: rejectId, input: parsed.data }).unwrap();
      void message.success('Đã từ chối đơn');
      setRejectId(null);
    } catch (error) {
      setRejectError(getErrorMessage(error));
    }
  };
  const data = bookings.data;
  const from = params.get('from');
  const to = params.get('to');

  return (
    <div className="owner-bookings-page">
      <PageHeader
        title="Đơn đặt sân"
        description="Theo dõi và xử lý các đơn thuộc sân của bạn."
        extra={
          <Button
            icon={<ReloadOutlined />}
            loading={bookings.isFetching}
            onClick={() => void bookings.refetch()}
          >
            Làm mới
          </Button>
        }
      />
      <Tabs
        className="users-tabs"
        activeKey={status ?? 'ALL'}
        onChange={(value) => update({ status: value === 'ALL' ? undefined : value })}
        items={[
          { key: 'ALL', label: 'Tất cả' },
          ...BOOKING_STATUSES.map((value) => ({ key: value, label: BOOKING_STATUS_LABELS[value] })),
        ]}
      />
      <div className="owner-bookings-toolbar" role="search" aria-label="Lọc đơn đặt sân">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          aria-label="Tìm đơn đặt sân"
          placeholder="Tìm mã đơn, tên hoặc số điện thoại"
          maxLength={100}
          value={params.get('q') ?? ''}
          onChange={(event) => update({ q: event.target.value || undefined })}
        />
        <Select
          allowClear
          aria-label="Cụm sân"
          placeholder="Tất cả cụm sân"
          loading={venues.isLoading}
          value={venueId}
          options={venues.data?.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => update({ venueId: value, courtId: undefined })}
        />
        <Select
          allowClear
          aria-label="Sân con"
          placeholder={venueId ? 'Tất cả sân con' : 'Chọn cụm sân trước'}
          disabled={!venueId || venue.isFetching || !venue.currentData}
          loading={venue.isFetching}
          value={params.get('courtId') ?? undefined}
          options={venue.currentData?.courts.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => update({ courtId: value })}
        />
        <DatePicker.RangePicker
          value={[
            from && dayjs(from).isValid() ? dayjs(from) : null,
            to && dayjs(to).isValid() ? dayjs(to) : null,
          ]}
          placeholder={['Từ ngày', 'Đến ngày']}
          onChange={(_, dateStrings) =>
            update({ from: dateStrings[0] || undefined, to: dateStrings[1] || undefined })
          }
        />
      </div>
      {bookings.isLoading && !data ? (
        <Skeleton active />
      ) : bookings.isError ? (
        <Alert
          type="error"
          showIcon
          title={getErrorMessage(bookings.error)}
          action={<Button onClick={() => void bookings.refetch()}>Thử lại</Button>}
        />
      ) : (
        data && (
          <>
            {data.items.length ? (
              <OwnerBookingsList
                items={data.items}
                loading={bookings.isFetching}
                highlightId={params.get('highlight') ?? undefined}
                hasNextPage={false}
                onLoadMore={() => undefined}
                onSelect={setSelectedId}
                onConfirm={(id) => void run(() => confirm(id).unwrap(), 'Đã xác nhận đơn')}
                onComplete={(id) => void run(() => complete(id).unwrap(), 'Đã hoàn thành đơn')}
                onReject={openReject}
                onConfirmSeries={(id) =>
                  void run(() => confirmSeries(id).unwrap(), 'Đã xác nhận cả chuỗi')
                }
              />
            ) : (
              <EmptyState description="Chưa có đơn đặt sân phù hợp." />
            )}
            {data.total > 0 && (
              <div className="owner-bookings-pagination">
                <span>
                  Hiển thị {(data.page - 1) * query.pageSize + 1}–
                  {Math.min(data.page * query.pageSize, data.total)} trong {data.total} đơn
                </span>
                <Pagination
                  current={data.page}
                  pageSize={query.pageSize}
                  total={data.total}
                  simple={mobile}
                  showSizeChanger={false}
                  onChange={(page) => update({ page: String(page) })}
                />
              </div>
            )}
          </>
        )
      )}
      <BookingDetailDrawer bookingId={selectedId} onClose={() => setSelectedId(null)} />
      <Modal
        title="Từ chối đơn"
        open={Boolean(rejectId)}
        confirmLoading={rejectState.isLoading}
        okText="Từ chối"
        cancelText="Đóng"
        onCancel={() => setRejectId(null)}
        onOk={() => void submitReject()}
        destroyOnHidden
      >
        {rejectError && <Alert type="error" showIcon title={rejectError} />}
        <Input.TextArea
          aria-label="Lý do từ chối"
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          maxLength={300}
          showCount
          placeholder="Lý do từ chối, tối thiểu 3 ký tự"
        />
      </Modal>
    </div>
  );
}
