import { Avatar, Button, Dropdown, Table, type MenuProps, type TableProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { formatMinute, toVnParts, type BookingListItemDto } from '@sango/shared';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { formatCurrency, formatDate } from '@/common/utils/format';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BookingStatusBadge } from '@/features/my-bookings';
import './OwnerBookingsList.css';

interface OwnerBookingsListProps {
  items: BookingListItemDto[];
  hasNextPage: boolean;
  onLoadMore(): void;
  onSelect(id: string): void;
  onConfirm(id: string): void;
  onComplete(id: string): void;
  onReject(id: string): void;
  onConfirmSeries(id: string): void;
  highlightId?: string;
  loading?: boolean;
}

function bookingTime(booking: BookingListItemDto): string {
  const start = toVnParts(new Date(booking.startAt));
  const end = toVnParts(new Date(booking.endAt));
  return `${formatDate(booking.startAt)} ${formatMinute(start.minuteOfDay)} – ${formatMinute(end.minuteOfDay + (start.dateStr === end.dateStr ? 0 : 1440))}`;
}

export function OwnerBookingsList({
  items,
  onSelect,
  onConfirm,
  onComplete,
  onReject,
  onConfirmSeries,
  highlightId,
  loading,
}: OwnerBookingsListProps) {
  const mobile = useMediaQuery('(max-width: 991px)');
  const actionsFor = (booking: BookingListItemDto): MenuProps['items'] => [
    { key: 'details', label: 'Chi tiết', onClick: () => onSelect(booking.id) },
    ...(booking.allowedActions.includes('CONFIRM')
      ? [{ key: 'confirm', label: 'Xác nhận', onClick: () => onConfirm(booking.id) }]
      : []),
    ...(booking.recurringSeriesId && booking.allowedActions.includes('CONFIRM')
      ? [
          {
            key: 'series',
            label: 'Xác nhận cả chuỗi',
            onClick: () => {
              if (booking.recurringSeriesId) onConfirmSeries(booking.recurringSeriesId);
            },
          },
        ]
      : []),
    ...(booking.allowedActions.includes('REJECT')
      ? [{ key: 'reject', label: 'Từ chối', danger: true, onClick: () => onReject(booking.id) }]
      : []),
    ...(booking.allowedActions.includes('COMPLETE')
      ? [{ key: 'complete', label: 'Hoàn thành', onClick: () => onComplete(booking.id) }]
      : []),
  ];
  const code = (booking: BookingListItemDto) => (
    <button className="owner-booking-code" type="button" onClick={() => onSelect(booking.id)}>
      {booking.code}
    </button>
  );
  const status = (booking: BookingListItemDto) => (
    <div className="owner-booking-status">
      <BookingStatusBadge status={booking.status} />
      {booking.recurringSeriesId && <span className="booking-recurring-badge">Cố định</span>}
    </div>
  );
  const customer = (booking: BookingListItemDto) => (
    <div className="user-cell owner-booking-customer">
      <Avatar size={34} className="role-avatar role-avatar-customer">
        {booking.customer.fullName.trim().slice(0, 1)}
      </Avatar>
      <div>
        <strong>{booking.customer.fullName}</strong>
        <small>{booking.customer.phone ?? booking.contactPhone}</small>
      </div>
    </div>
  );
  const court = (booking: BookingListItemDto) => (
    <div className="owner-booking-court">
      <strong>{booking.court.name}</strong>
      <small>{booking.venue.name}</small>
      <small className="num">{bookingTime(booking)}</small>
    </div>
  );
  const columns: TableProps<BookingListItemDto>['columns'] = [
    { title: 'Mã đơn', key: 'code', width: 158, render: (_, booking) => code(booking) },
    { title: 'Khách hàng', key: 'customer', width: 195, render: (_, booking) => customer(booking) },
    { title: 'Sân và thời gian', key: 'court', width: 250, render: (_, booking) => court(booking) },
    {
      title: 'Giá trị',
      key: 'price',
      width: 120,
      align: 'right',
      render: (_, booking) => (
        <span className="num owner-booking-price">{formatCurrency(booking.totalPrice)}</span>
      ),
    },
    { title: 'Trạng thái', key: 'status', width: 150, render: (_, booking) => status(booking) },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 220,
      align: 'right',
      render: (_, booking) => (
        <div className="owner-booking-actions">
          <Button size="small" onClick={() => onSelect(booking.id)}>
            Chi tiết
          </Button>
          {booking.allowedActions.includes('CONFIRM') && (
            <Button size="small" type="primary" onClick={() => onConfirm(booking.id)}>
              Xác nhận
            </Button>
          )}
          {booking.allowedActions.includes('REJECT') && (
            <Button size="small" danger onClick={() => onReject(booking.id)}>
              Từ chối
            </Button>
          )}
          {booking.allowedActions.includes('COMPLETE') && (
            <Button size="small" onClick={() => onComplete(booking.id)}>
              Hoàn thành
            </Button>
          )}
          {booking.recurringSeriesId && booking.allowedActions.includes('CONFIRM') && (
            <Button
              size="small"
              onClick={() => {
                if (booking.recurringSeriesId) onConfirmSeries(booking.recurringSeriesId);
              }}
            >
              Xác nhận cả chuỗi
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!items.length) return <EmptyState description="Chưa có đơn đặt sân phù hợp." />;
  if (mobile)
    return (
      <ul className="owner-bookings-mobile" aria-label="Danh sách đơn đặt sân" aria-busy={loading}>
        {items.map((booking) => (
          <li
            className={highlightId === booking.id ? 'is-highlighted' : ''}
            key={booking.id}
            data-testid={`owner-booking-${booking.id}`}
          >
            <div className="owner-booking-mobile-heading">
              {code(booking)}
              <Dropdown trigger={['click']} menu={{ items: actionsFor(booking) }}>
                <Button
                  type="text"
                  icon={<MoreOutlined />}
                  aria-label={`Thao tác đơn ${booking.code}`}
                />
              </Dropdown>
            </div>
            {status(booking)}
            <div className="owner-booking-mobile-body">
              {customer(booking)}
              {court(booking)}
            </div>
            <div className="owner-booking-mobile-total">
              <span>Giá trị</span>
              <span className="num">{formatCurrency(booking.totalPrice)}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  return (
    <Table<BookingListItemDto>
      className="users-table owner-bookings-table"
      rowKey="id"
      size="middle"
      columns={columns}
      dataSource={items}
      pagination={false}
      loading={loading}
      scroll={{ x: 1093 }}
      rowClassName={(booking) =>
        highlightId === booking.id
          ? 'is-highlighted'
          : booking.status === 'PENDING'
            ? 'pending-user-row'
            : ''
      }
      onRow={(booking) => ({
        'aria-label': `Đơn ${booking.code}`,
        'data-testid': `owner-booking-${booking.id}`,
      })}
    />
  );
}
