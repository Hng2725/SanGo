import { Alert, App, Button, Descriptions, Drawer, Input, Modal, Skeleton, Space } from 'antd';
import { useState } from 'react';
import { rejectBookingSchema } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { formatCurrency, formatTimeRange } from '@/common/utils/format';
import { BookingStatusBadge } from '@/features/my-bookings';
import { useCompleteBookingMutation, useConfirmBookingMutation, useConfirmSeriesMutation, useGetOwnerBookingQuery, useRejectBookingMutation } from '../api/ownerBookingsApi';

interface BookingDetailDrawerProps {
  bookingId: string | null;
  onClose(): void;
}

export function BookingDetailDrawer({ bookingId, onClose }: BookingDetailDrawerProps) {
  return (
    <Drawer title="Chi tiết đơn" open={Boolean(bookingId)} onClose={onClose}>
      {bookingId && <BookingDetails key={bookingId} bookingId={bookingId} />}
    </Drawer>
  );
}

function BookingDetails({ bookingId }: { bookingId: string }) {
  const { message } = App.useApp();
  const result = useGetOwnerBookingQuery(bookingId);
  const [confirm, confirmState] = useConfirmBookingMutation();
  const [reject, rejectState] = useRejectBookingMutation();
  const [complete, completeState] = useCompleteBookingMutation();
  const [confirmSeries, seriesState] = useConfirmSeriesMutation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const detail = result.currentData;
  const busy = confirmState.isLoading || rejectState.isLoading || completeState.isLoading || seriesState.isLoading;
  const act = async (action: () => Promise<unknown>, success: string) => {
    setError(null);
    try {
      await action();
      message.success(success);
      setRejectOpen(false);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  };
  const submitReject = () => {
    const parsed = rejectBookingSchema.safeParse({ reason });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Vui lòng nhập lý do từ chối'); return; }
    void act(() => reject({ id: bookingId, input: parsed.data }).unwrap(), 'Đã từ chối đơn');
  };
  return (
    <>
      {result.isLoading && <Skeleton active />}
      {result.isError && <Alert type="error" title={getErrorMessage(result.error)} />}
      {error && !rejectOpen && <Alert type="error" title={error} />}
      {detail && <>
        <Descriptions column={1}>
          <Descriptions.Item label="Mã đơn">{detail.code}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái"><BookingStatusBadge status={detail.status} /></Descriptions.Item>
          <Descriptions.Item label="Khách">{detail.customer.fullName}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{detail.contactPhone}</Descriptions.Item>
          <Descriptions.Item label="Cụm sân">{detail.venue.name}</Descriptions.Item>
          <Descriptions.Item label="Sân">{detail.court.name}</Descriptions.Item>
          <Descriptions.Item label="Thời gian">{formatTimeRange(detail.startAt, detail.endAt)}</Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">{formatCurrency(detail.totalPrice)}</Descriptions.Item>
          {detail.note && <Descriptions.Item label="Ghi chú">{detail.note}</Descriptions.Item>}
          {detail.cancelReason && <Descriptions.Item label="Lý do hủy">{detail.cancelReason}</Descriptions.Item>}
          {detail.rejectReason && <Descriptions.Item label="Lý do từ chối">{detail.rejectReason}</Descriptions.Item>}
        </Descriptions>
        <Space wrap>
          {detail.allowedActions.includes('CONFIRM') && <Button type="primary" loading={confirmState.isLoading} disabled={busy} onClick={() => void act(() => confirm(bookingId).unwrap(), 'Đã xác nhận đơn')}>Xác nhận</Button>}
          {detail.allowedActions.includes('REJECT') && <Button danger disabled={busy} onClick={() => { setReason(''); setError(null); setRejectOpen(true); }}>Từ chối</Button>}
          {detail.allowedActions.includes('COMPLETE') && <Button loading={completeState.isLoading} disabled={busy} onClick={() => void act(() => complete(bookingId).unwrap(), 'Đã hoàn thành đơn')}>Hoàn thành</Button>}
          {detail.recurringSeriesId && detail.allowedActions.includes('CONFIRM') && <Button loading={seriesState.isLoading} disabled={busy} onClick={() => { const seriesId = detail.recurringSeriesId; if (seriesId) void act(() => confirmSeries(seriesId).unwrap(), 'Đã xác nhận các đơn còn chờ trong chuỗi'); }}>Xác nhận cả chuỗi</Button>}
        </Space>
      </>}
      <Modal title="Từ chối đơn" open={rejectOpen} okText="Xác nhận từ chối" cancelText="Đóng" confirmLoading={rejectState.isLoading} onCancel={() => setRejectOpen(false)} onOk={submitReject}>
        {error && <Alert type="error" title={error} />}
        <Input.TextArea aria-label="Lý do từ chối" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} showCount />
      </Modal>
    </>
  );
}
