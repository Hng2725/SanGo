import { Alert, App, Button, Card, Descriptions, Input, Modal, Skeleton, Space, Timeline } from 'antd';
import { BOOKING_STATUS_LABELS } from '@sango/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { formatCurrency, formatDateTime } from '@/common/utils/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { useCancelBookingMutation, useGetBookingQuery } from '../api/myBookingsApi';
import { RatingStars, ReviewForm } from '@/features/reviews';
import { ComplaintForm } from '@/features/complaints';

export default function BookingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [reason, setReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const booking = useGetBookingQuery(id, { skip: !id });
  const [cancel, cancelState] = useCancelBookingMutation();
  useDocumentTitle(booking.data ? `Đơn ${booking.data.code}` : 'Chi tiết đơn');

  if (booking.isLoading) return <Skeleton active />;
  if (booking.isError || !booking.data) return <Alert type="error" message={getErrorMessage(booking.error)} />;
  const detail = booking.data;
  const canCancel = detail.allowedActions.includes('CANCEL');

  const submitCancel = async () => {
    try {
      setCancelError(null);
      await cancel({ id, input: { reason: reason.trim() || undefined } }).unwrap();
      setCancelOpen(false);
      message.success('Đã hủy đơn');
      navigate(`/me/bookings/${id}`);
    } catch (error) {
      // The mutation error is rendered inside the dialog.
      setCancelError(getErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title={`Đơn ${detail.code}`} extra={<BookingStatusBadge status={detail.status} />} />
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card title="Thông tin sân">
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Cụm sân"><Link to={`/venues/${detail.venue.slug}`}>{detail.venue.name}</Link></Descriptions.Item>
            <Descriptions.Item label="Sân">{detail.court.name}</Descriptions.Item>
            <Descriptions.Item label="Thời gian">{formatDateTime(detail.startAt)} – {formatDateTime(detail.endAt)}</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">{formatCurrency(detail.totalPrice)}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại liên hệ">{detail.contactPhone}</Descriptions.Item>
            {detail.note && <Descriptions.Item label="Ghi chú">{detail.note}</Descriptions.Item>}
            {detail.cancelReason && <Descriptions.Item label="Lý do hủy">{detail.cancelReason}</Descriptions.Item>}
            {detail.rejectReason && <Descriptions.Item label="Lý do từ chối">{detail.rejectReason}</Descriptions.Item>}
          </Descriptions>
        </Card>
        <Card title="Chi tiết giá">
          {detail.priceBreakdown.map((item) => <div key={item.startAt}>{formatDateTime(item.startAt)} – {formatDateTime(item.endAt)}{item.label ? ` · ${item.label}` : ''}: {formatCurrency(item.price)}</div>)}
        </Card>
        <Card title="Trạng thái">
          <Timeline items={detail.timeline.map((item) => ({ children: `${BOOKING_STATUS_LABELS[item.status]} · ${formatDateTime(item.at)}` }))} />
        </Card>
        {detail.review && <Card title="Đánh giá của bạn"><RatingStars value={detail.review.rating} readOnly /><p>{detail.review.comment}</p>{detail.review.ownerReply && <Alert type="info" message="Phản hồi chủ sân" description={detail.review.ownerReply} />}</Card>}
        <Space wrap>
          {canCancel && <Button danger onClick={() => setCancelOpen(true)}>Hủy đơn</Button>}
          {detail.allowedActions.includes('REVIEW') && <Button onClick={() => setReviewOpen(true)}>Đánh giá</Button>}
          {detail.allowedActions.includes('COMPLAIN') && <Button onClick={() => setComplaintOpen(true)}>Khiếu nại</Button>}
          {detail.recurringSeriesId && <Link to="/me/recurring"><Button>Đơn trong chuỗi lịch cố định</Button></Link>}
          <Link to="/me/bookings"><Button>Quay lại danh sách</Button></Link>
        </Space>
        {detail.cancelDeadline && <Alert type="info" message={`Hủy miễn phí trước ${formatDateTime(detail.cancelDeadline)}`} />}
      </Space>
      <Modal title="Hủy đơn" open={cancelOpen} confirmLoading={cancelState.isLoading} okText="Xác nhận hủy" cancelText="Đóng" onCancel={() => setCancelOpen(false)} onOk={() => void submitCancel()}>
        {(cancelError || cancelState.isError) && <Alert type="error" message={cancelError ?? getErrorMessage(cancelState.error)} />}
        <Input.TextArea maxLength={300} showCount value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do hủy (không bắt buộc)" />
      </Modal>
      <Modal title="Đánh giá sân" open={reviewOpen} footer={null} onCancel={() => setReviewOpen(false)} destroyOnHidden><ReviewForm bookingId={detail.id} onSuccess={() => setReviewOpen(false)} /></Modal>
      <Modal title="Gửi khiếu nại" open={complaintOpen} footer={null} onCancel={() => setComplaintOpen(false)} destroyOnHidden><ComplaintForm venueId={detail.venue.id} bookingId={detail.id} onSuccess={() => setComplaintOpen(false)} /></Modal>
    </>
  );
}
