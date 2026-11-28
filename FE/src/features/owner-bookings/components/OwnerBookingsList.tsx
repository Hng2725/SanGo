import { Button, Empty, Space } from 'antd';
import type { BookingListItemDto } from '@sango/shared';
import { formatCurrency, formatTimeRange } from '@/common/utils/format';
import { BookingStatusBadge } from '@/features/my-bookings';
import './OwnerBookingsList.css';

interface OwnerBookingsListProps { items: BookingListItemDto[]; hasNextPage: boolean; onLoadMore(): void; onSelect(id: string): void; onConfirm(id: string): void; onComplete(id: string): void; onReject(id: string): void; onConfirmSeries(id: string): void; highlightId?: string; }

export function OwnerBookingsList({ items, onSelect, onConfirm, onComplete, onReject, onConfirmSeries, highlightId }: OwnerBookingsListProps) {
  if (!items.length) return <Empty description="Chưa có đơn đặt sân." />;
  return <div className="owner-bookings-table" role="table" aria-label="Danh sách đơn đặt sân">
    <div className="owner-bookings-table-head" role="row"><span>Mã đơn</span><span>Khách hàng</span><span>Sân và thời gian</span><span>Giá trị</span><span>Trạng thái</span><span>Thao tác</span></div>
    {items.map((booking) => <div className={`owner-bookings-table-row${highlightId === booking.id ? ' is-highlighted' : ''}`} role="row" key={booking.id} data-testid={`owner-booking-${booking.id}`}>
      <button className="owner-booking-code" type="button" onClick={() => onSelect(booking.id)}>{booking.code}</button>
      <div><strong>{booking.customer.fullName}</strong><small>{booking.customer.phone ?? booking.contactPhone}</small></div>
      <div><strong>{booking.court.name}</strong><small>{formatTimeRange(booking.startAt, booking.endAt)}</small></div>
      <strong>{formatCurrency(booking.totalPrice)}</strong>
      <div className="owner-booking-status"><BookingStatusBadge status={booking.status} />{booking.recurringSeriesId && <span className="booking-recurring-badge">Cố định</span>}</div>
      <Space wrap size={6}><Button size="small" onClick={() => onSelect(booking.id)}>Chi tiết</Button>{booking.allowedActions.includes('CONFIRM') && <Button size="small" type="primary" onClick={() => onConfirm(booking.id)}>Xác nhận</Button>}{booking.recurringSeriesId && booking.allowedActions.includes('CONFIRM') && <Button size="small" onClick={() => onConfirmSeries(booking.recurringSeriesId ?? '')}>Cả chuỗi</Button>}{booking.allowedActions.includes('REJECT') && <Button size="small" danger onClick={() => onReject(booking.id)}>Từ chối</Button>}{booking.allowedActions.includes('COMPLETE') && <Button size="small" onClick={() => onComplete(booking.id)}>Hoàn thành</Button>}</Space>
    </div>)}
  </div>;
}
