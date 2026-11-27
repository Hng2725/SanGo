import { Alert, Descriptions, Drawer, Skeleton } from 'antd';
import { getErrorMessage } from '@/common/api/errors';
import { formatCurrency, formatTimeRange } from '@/common/utils/format';
import { BookingStatusBadge } from '@/features/my-bookings';
import { useGetOwnerBookingQuery } from '../api/ownerBookingsApi';

interface BookingDetailDrawerProps {
  bookingId: string | null;
  onClose(): void;
}

export function BookingDetailDrawer({ bookingId, onClose }: BookingDetailDrawerProps) {
  const result = useGetOwnerBookingQuery(bookingId ?? '', { skip: !bookingId });
  return (
    <Drawer title="Chi tiết đơn" open={Boolean(bookingId)} onClose={onClose}>
      {result.isLoading && <Skeleton active />}
      {result.isError && <Alert type="error" message={getErrorMessage(result.error)} />}
      {result.data && <Descriptions column={1}>
        <Descriptions.Item label="Mã đơn">{result.data.code}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái"><BookingStatusBadge status={result.data.status} /></Descriptions.Item>
        <Descriptions.Item label="Khách">{result.data.customer.fullName}</Descriptions.Item>
        <Descriptions.Item label="Sân">{result.data.court.name}</Descriptions.Item>
        <Descriptions.Item label="Thời gian">{formatTimeRange(result.data.startAt, result.data.endAt)}</Descriptions.Item>
        <Descriptions.Item label="Tổng tiền">{formatCurrency(result.data.totalPrice)}</Descriptions.Item>
      </Descriptions>}
    </Drawer>
  );
}
