import { useState } from 'react';
import { Alert, App, Avatar, Button, Input, Skeleton, Table, Tooltip, Typography } from 'antd';
import {
  CalendarOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  UserAddOutlined,
  StarFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from 'react-router';
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  SPORT_LABELS,
  type AdminOverviewDto,
  type BookingStatus,
  type UserDto,
} from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { formatCurrency } from '@/common/utils/format';
import { ConfirmAction } from '@/components/feedback/ConfirmAction';
import { CourtLines } from '@/components/branding/CourtLines';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { SportIcon } from '@/components/icons/SportIcon';
import { useApproveOwnerMutation, useUsersQuery } from '@/features/admin-users/api/adminUsersApi';
import { useOverviewQuery } from '../api/adminDashboardApi';
import { BookingChart } from '../components/BookingChart';

dayjs.extend(relativeTime);
type PendingAction = { user: UserDto; decision: 'APPROVED' | 'REJECTED' };
const statusTone: Record<BookingStatus, string> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'done',
  CANCELLED: 'muted',
  REJECTED: 'error',
};
function shortMoney(value: number) {
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ ₫`;
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr ₫`;
  return formatCurrency(value);
}

export default function AdminDashboardPage() {
  useDocumentTitle('Tổng quan quản trị');
  const { message } = App.useApp();
  const { data, error, isLoading, refetch, fulfilledTimeStamp } = useOverviewQuery(undefined, {
    pollingInterval: 60000,
  });
  const { data: pendingUsers } = useUsersQuery({
    page: 1,
    pageSize: 2,
    sort: 'newest',
    role: 'OWNER',
    ownerStatus: 'PENDING',
  });
  const [approveOwner, approvalState] = useApproveOwnerMutation();
  const [action, setAction] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const submitAction = async () => {
    if (!action) return;
    if (action.decision === 'REJECTED' && note.trim().length < 3) {
      setActionError('Vui lòng nêu lý do từ chối, ít nhất 3 ký tự.');
      return;
    }
    try {
      await approveOwner({
        id: action.user.id,
        body: {
          decision: action.decision,
          ...(action.decision === 'REJECTED' ? { note: note.trim() } : {}),
        },
      }).unwrap();
      message.success(action.decision === 'APPROVED' ? 'Đã duyệt chủ sân' : 'Đã từ chối chủ sân');
      setAction(null);
      setNote('');
      setActionError('');
    } catch (failure) {
      setActionError(getErrorMessage(failure));
    }
  };
  const openAction = (user: UserDto, decision: PendingAction['decision']) => {
    setAction({ user, decision });
    setNote('');
    setActionError('');
  };

  if (isLoading)
    return (
      <>
        <PageHeader title="Tổng quan" description="Hoạt động đặt sân trên toàn hệ thống." />
        <Skeleton active paragraph={{ rows: 12 }} />
      </>
    );
  if (error || !data)
    return (
      <>
        <PageHeader title="Tổng quan" />
        <Alert
          type="error"
          showIcon
          message={getErrorMessage(error)}
          action={<Button onClick={() => refetch()}>Thử lại</Button>}
        />
      </>
    );

  const totalBookings = data.last7Days.reduce((sum, day) => sum + day.bookings, 0);
  const totalStatuses = BOOKING_STATUSES.reduce(
    (sum, status) => sum + data.bookingsByStatus[status],
    0,
  );
  const totalSport = data.bySport.reduce((sum, item) => sum + item.bookings, 0);
  const date = new Date(`${data.today.date}T00:00:00Z`);
  const todayText = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Hoạt động đặt sân trên toàn hệ thống."
        extra={
          <div className="dashboard-refresh">
            <Typography.Text type="secondary">
              Cập nhật lúc{' '}
              {fulfilledTimeStamp
                ? new Date(fulfilledTimeStamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '–'}
            </Typography.Text>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Làm mới
            </Button>
          </div>
        }
      />
      <section className="scoreboard" aria-label="Số liệu hôm nay">
        <CourtLines className="scoreboard-court" />
        <div className="scoreboard-heading">
          <span>
            <CalendarOutlined /> Hôm nay, {todayText}
          </span>
          <span className="live-status">
            <i aria-hidden="true" />
            Đang cập nhật
          </span>
        </div>
        <div className="scoreboard-grid">
          <div>
            <small>Lượt đặt mới</small>
            <strong>{data.today.newBookings}</strong>
            <span className={data.today.newBookingsDelta < 0 ? 'scoreboard-down' : 'scoreboard-up'}>
              {data.today.newBookingsDelta < 0 ? <CaretDownOutlined /> : <CaretUpOutlined />}
              {Math.abs(data.today.newBookingsDelta)} so với hôm qua
            </span>
          </div>
          <div>
            <small>Tỉ lệ lấp sân</small>
            <strong>
              {data.today.occupancyRate === null
                ? '–'
                : `${Math.round(data.today.occupancyRate * 100)}%`}
            </strong>
            {data.today.occupancyRate !== null && (
              <div className="scoreboard-meter">
                <span style={{ width: `${Math.round(data.today.occupancyRate * 100)}%` }} />
              </div>
            )}
          </div>
          <div>
            <small>Doanh thu hôm nay</small>
            <strong>{shortMoney(data.today.revenue)}</strong>
            <span className={data.today.revenueDeltaPct < 0 ? 'scoreboard-down' : 'scoreboard-up'}>
              {data.today.revenueDeltaPct < 0 ? <CaretDownOutlined /> : <CaretUpOutlined />}
              {Math.abs(data.today.revenueDeltaPct)}% so với hôm qua
            </span>
          </div>
          <div>
            <small>Đơn chờ chủ sân xác nhận</small>
            <strong>{data.today.pendingConfirm}</strong>
            <span className="scoreboard-down">
              <ExclamationCircleOutlined />
              {data.today.startingSoon} đơn sắp tới giờ chơi
            </span>
          </div>
        </div>
      </section>
      <div className="dashboard-grid">
        <Section
          title="Lượt đặt 7 ngày qua"
          extra={
            <span className="section-meta">Tổng {totalBookings.toLocaleString('vi-VN')} lượt</span>
          }
          className="chart-section"
        >
          <BookingChart days={data.last7Days} />
        </Section>
        <Section title="Việc cần xử lý" className="attention-section">
          {data.pendingOwners === 0 && data.openComplaints === 0 ? (
            <div className="attention-clear">
              <CheckCircleOutlined />
              Không có việc nào cần xử lý.
            </div>
          ) : (
            <>
              <div className="attention-group-heading">
                <span className="attention-icon attention-owner">
                  <UserAddOutlined />
                </span>
                <strong>Chủ sân chờ duyệt</strong>
                <b>{data.pendingOwners}</b>
              </div>
              <ul className="pending-owner-list">
                {pendingUsers?.items.map((user) => (
                  <li key={user.id}>
                    <Avatar className="role-avatar role-avatar-owner" size={34}>
                      {user.fullName.trim().slice(0, 1)}
                    </Avatar>
                    <span className="pending-owner-name">
                      <strong>{user.fullName}</strong>
                      <small>Đăng ký {dayjs(user.createdAt).fromNow()}</small>
                    </span>
                    <span className="pending-owner-actions">
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => openAction(user, 'APPROVED')}
                      >
                        Duyệt
                      </Button>
                      <Button size="small" onClick={() => openAction(user, 'REJECTED')}>
                        Từ chối
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
              {data.pendingOwners > 0 && (
                <Link className="attention-more" to="/admin/users?tab=pending" viewTransition>
                  Xem cả {data.pendingOwners} chủ sân chờ duyệt
                </Link>
              )}
              <div className="attention-divider" />
              <div className="attention-group-heading">
                <span className="attention-icon attention-complaint">
                  <ExclamationCircleOutlined />
                </span>
                <strong>Khiếu nại đang mở</strong>
                <b>{data.openComplaints}</b>
              </div>
              {data.openComplaints > 0 && (
                <Link to="/admin/complaints" className="attention-complaints-link">
                  Xử lý khiếu nại
                </Link>
              )}
            </>
          )}
        </Section>
      </div>
      <div className="dashboard-grid dashboard-grid-even">
        <Section
          title="Lượt đặt theo môn"
          extra={<span className="section-meta">Tháng {Number(data.today.date.slice(5, 7))}</span>}
        >
          {data.bySport.length ? (
            <div className="sport-list">
              {data.bySport.map((item) => (
                <div className="sport-list-row" key={item.sport}>
                  <span className="sport-list-icon">
                    <SportIcon sport={item.sport} size={17} decorative />
                  </span>
                  <strong>{SPORT_LABELS[item.sport]}</strong>
                  <span className="sport-list-value">
                    {item.bookings} lượt (
                    {totalSport ? Math.round((item.bookings / totalSport) * 100) : 0}%)
                  </span>
                  <div className="sport-list-track">
                    <span
                      style={{ width: `${totalSport ? (item.bookings / totalSport) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="section-empty">Chưa có lượt đặt trong tháng.</p>
          )}
        </Section>
        <Section
          title="Đơn đặt theo trạng thái"
          extra={<span className="section-meta">{totalStatuses.toLocaleString('vi-VN')} đơn</span>}
        >
          {totalStatuses > 0 ? (
            <>
              <div className="status-stack" role="img" aria-label="Tỉ lệ đơn theo trạng thái">
                {BOOKING_STATUSES.map((status) => (
                  <span
                    key={status}
                    className={`status-segment-${statusTone[status]}`}
                    style={{ width: `${(data.bookingsByStatus[status] / totalStatuses) * 100}%` }}
                  />
                ))}
              </div>
              <ul className="status-legend">
                {BOOKING_STATUSES.map((status) => (
                  <li key={status}>
                    <span className={`status-legend-dot status-segment-${statusTone[status]}`} />
                    <span>{BOOKING_STATUS_LABELS[status]}</span>
                    <strong>{data.bookingsByStatus[status].toLocaleString('vi-VN')}</strong>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="section-empty">Chưa có đơn đặt sân.</p>
          )}
        </Section>
      </div>
      <Section
        title="Cụm sân nhiều lượt đặt nhất"
        extra={<span className="section-meta">Tháng {Number(data.today.date.slice(5, 7))}</span>}
        className="top-venues-section"
      >
        <Table<AdminOverviewDto['topVenues'][number]>
          rowKey="id"
          size="middle"
          pagination={false}
          dataSource={data.topVenues}
          scroll={{ x: 1000 }}
          tableLayout="fixed"
          columns={[
            {
              title: <span className="venue-name-heading">Cụm sân</span>,
              width: 320,
              render: (_, venue) => (
                <Link className="venue-table-name" to={`/venues/${venue.slug}`} target="_blank">
                  <span className="venue-thumbnail">
                    {venue.imageUrl ? (
                      <img src={venue.imageUrl} alt="" loading="lazy" width={64} height={44} />
                    ) : (
                      venue.sports[0] && <SportIcon sport={venue.sports[0]} size={22} decorative />
                    )}
                  </span>
                  <span>
                    <strong>{venue.name}</strong>
                    <small>
                      {venue.district}, {venue.city}
                    </small>
                  </span>
                </Link>
              ),
            },
            {
              title: 'Môn',
              width: 100,
              render: (_, venue) => (
                <span className="venue-sports">
                  {venue.sports.map((sport) => (
                    <Tooltip title={SPORT_LABELS[sport]} key={sport}>
                      <span>
                        <SportIcon sport={sport} size={16} decorative />
                      </span>
                    </Tooltip>
                  ))}
                </span>
              ),
            },
            { title: 'Chủ sân', dataIndex: 'ownerName', width: 180 },
            {
              title: 'Lượt đặt',
              dataIndex: 'bookings',
              align: 'right',
              width: 100,
              className: 'venue-number',
            },
            {
              title: 'Doanh thu',
              className: 'venue-number',
              width: 180,
              dataIndex: 'revenue',
              align: 'right',
              render: (value: number) => formatCurrency(value),
            },
            {
              title: 'Đánh giá',
              className: 'venue-number',
              width: 120,
              dataIndex: 'avgRating',
              align: 'right',
              render: (value: number) => (
                <span className="venue-rating">
                  <StarFilled /> {value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                </span>
              ),
            },
          ]}
        />
      </Section>
      <ConfirmAction
        open={!!action}
        title={`${action?.decision === 'APPROVED' ? 'Duyệt' : 'Từ chối'} chủ sân ${action?.user.fullName ?? ''}?`}
        confirmText={action?.decision === 'APPROVED' ? 'Duyệt chủ sân' : 'Từ chối'}
        danger={action?.decision === 'REJECTED'}
        loading={approvalState.isLoading}
        onCancel={() => setAction(null)}
        onConfirm={submitAction}
      >
        <p>{action?.user.email}</p>
        {action?.decision === 'REJECTED' && (
          <Input.TextArea
            aria-label="Lý do từ chối"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={300}
            showCount
            placeholder="Lý do từ chối"
          />
        )}
        {actionError && <Alert type="error" message={actionError} />}
      </ConfirmAction>
    </>
  );
}
