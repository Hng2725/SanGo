import { Alert, Avatar, Button, Empty, Skeleton, Typography } from 'antd';
import {
  CalendarOutlined,
  CommentOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { addDaysToDateStr, toVnParts, vnDateMinuteToUtc } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { formatCompactCurrency, formatDateTime } from '@/common/utils/format';
import { CourtLines } from '@/components/branding/CourtLines';
import { BookingChart } from '@/components/charts/BookingChart';
import { StatusDot } from '@/components/feedback/StatusDot';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { useListOwnerVenuesQuery } from '@/features/owner-venues';
import { useGetOwnerBookingsPageQuery } from '@/features/owner-bookings/api/ownerBookingsApi';
import { useGetOwnerSummaryQuery, useGetRevenueQuery } from '../api/statsApi';
import './OwnerDashboardPage.css';

export default function OwnerDashboardPage() {
  useDocumentTitle('Tổng quan chủ sân');
  const [rangeKey, setRangeKey] = useState<7 | 14>(7);
  const today = toVnParts(new Date()).dateStr;
  const range = useMemo(
    () => ({ from: addDaysToDateStr(today, 1 - rangeKey), to: today }),
    [today, rangeKey],
  );
  const venues = useListOwnerVenuesQuery();
  const summary = useGetOwnerSummaryQuery(undefined, { pollingInterval: 60000 });
  const revenue = useGetRevenueQuery({ ...range, groupBy: 'day' }, { pollingInterval: 60000 });
  const pending = useGetOwnerBookingsPageQuery(
    { page: 1, pageSize: 3, status: 'PENDING' },
    { pollingInterval: 60000 },
  );
  const points = revenue.currentData?.points ?? [];
  const days = points.map((point) => ({ date: point.period, bookings: point.bookingCount }));
  const total = points.reduce((sum, point) => sum + point.bookingCount, 0);
  const isRefreshing =
    summary.isFetching || revenue.isFetching || pending.isFetching || venues.isFetching;
  const refresh = () => {
    void summary.refetch();
    void revenue.refetch();
    void pending.refetch();
    void venues.refetch();
  };
  const todayText = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(vnDateMinuteToUtc(today, 0));
  const updatedText = summary.fulfilledTimeStamp
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
      }).format(summary.fulfilledTimeStamp)
    : '–';
  const data = summary.data;

  return (
    <div className="owner-overview">
      <PageHeader
        title="Tổng quan"
        description="Hoạt động đặt sân tại các cụm sân của bạn."
        extra={
          <div className="dashboard-refresh">
            <Typography.Text type="secondary">Cập nhật lúc {updatedText}</Typography.Text>
            <Button icon={<ReloadOutlined />} loading={isRefreshing} onClick={refresh}>
              Làm mới
            </Button>
          </div>
        }
      />
      {summary.isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : summary.isError || !data ? (
        <Alert
          type="error"
          showIcon
          title={getErrorMessage(summary.error)}
          action={<Button onClick={() => void summary.refetch()}>Thử lại</Button>}
        />
      ) : (
        <>
          <section className="scoreboard" aria-label="Tổng quan hôm nay">
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
                <small>Lượt đặt hôm nay</small>
                <strong>{data.todayBookings}</strong>
                <span>Theo ngày chơi</span>
              </div>
              <div>
                <small>Tỉ lệ lấp sân</small>
                <strong>–</strong>
                <span>Chưa có số liệu</span>
              </div>
              <div>
                <small>Doanh thu hôm nay</small>
                <strong>
                  {revenue.isError || !revenue.currentData
                    ? '–'
                    : formatCompactCurrency(points.at(-1)?.revenue ?? 0)}
                </strong>
                <span>Từ các đơn đã hoàn thành</span>
              </div>
              <div>
                <small>Đơn chờ chủ sân xác nhận</small>
                <strong>{data.pendingCount}</strong>
                <span className="scoreboard-down">
                  <ExclamationCircleOutlined /> Cần xử lý sớm
                </span>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <Section
              title={`Lượt đặt ${rangeKey} ngày qua`}
              className="chart-section"
              extra={
                <div className="owner-chart-controls">
                  <div role="group" aria-label="Khoảng thời gian">
                    {[7, 14].map((value) => (
                      <Button
                        key={value}
                        size="small"
                        type={rangeKey === value ? 'primary' : 'default'}
                        aria-pressed={rangeKey === value}
                        onClick={() => setRangeKey(value === 14 ? 14 : 7)}
                      >
                        {value} ngày
                      </Button>
                    ))}
                  </div>
                  <span className="section-meta">
                    {revenue.isError ? 'Chưa có số liệu' : `Tổng ${total} lượt`}
                  </span>
                </div>
              }
            >
              {revenue.isFetching && !revenue.currentData ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : revenue.isError ? (
                <Alert
                  type="error"
                  showIcon
                  title={getErrorMessage(revenue.error)}
                  action={<Button onClick={() => void revenue.refetch()}>Thử lại</Button>}
                />
              ) : (
                <>
                  <p className="owner-chart-caption">Số lượt đặt đã hoàn thành theo ngày chơi.</p>
                  <BookingChart
                    days={days}
                    label={`Lượt đặt đã hoàn thành trong ${rangeKey} ngày qua`}
                  />
                </>
              )}
            </Section>

            <Section title="Việc cần xử lý" className="attention-section">
              <div className="attention-group-heading">
                <span className="attention-icon attention-owner">
                  <ScheduleOutlined />
                </span>
                <strong>Đơn chờ xác nhận</strong>
                <b>{data.pendingCount}</b>
              </div>
              {pending.isLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : pending.isError ? (
                <Alert
                  type="error"
                  showIcon
                  title={getErrorMessage(pending.error)}
                  action={<Button onClick={() => void pending.refetch()}>Thử lại</Button>}
                />
              ) : (
                <ul className="pending-owner-list">
                  {pending.data?.items.slice(0, 2).map((item) => (
                    <li key={item.id}>
                      <Avatar className="role-avatar role-avatar-customer" size={34}>
                        {item.customer.fullName.trim().slice(0, 1)}
                      </Avatar>
                      <span className="pending-owner-name">
                        <strong>{item.customer.fullName}</strong>
                        <small>
                          {item.venue.name} / {item.court.name}
                        </small>
                        <small>{formatDateTime(item.startAt)}</small>
                      </span>
                      <Link to={`/owner/bookings?highlight=${item.id}`} viewTransition>
                        Xem
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/owner/bookings?status=PENDING" className="attention-more" viewTransition>
                Xem các đơn chờ xác nhận
              </Link>
              <div className="attention-divider" />
              <div className="attention-group-heading">
                <span className="attention-icon attention-owner">
                  <CommentOutlined />
                </span>
                <strong>Đánh giá của khách</strong>
              </div>
              <Link to="/owner/reviews" className="attention-more" viewTransition>
                Xem và phản hồi đánh giá
              </Link>
            </Section>
          </div>

          <Section
            title="Sân của tôi"
            extra={
              <span className="section-meta">
                {venues.isError ? 'Chưa có số liệu' : `${venues.data?.length ?? 0} cụm sân`}
              </span>
            }
          >
            {venues.isLoading ? (
              <Skeleton active />
            ) : venues.isError ? (
              <Alert
                type="error"
                showIcon
                title={getErrorMessage(venues.error)}
                action={<Button onClick={() => void venues.refetch()}>Thử lại</Button>}
              />
            ) : venues.data?.length ? (
              <ul className="owner-venue-list">
                {venues.data.map((venue) => (
                  <li className="owner-venue-row" key={venue.id}>
                    <div className="owner-venue-name">
                      <strong>{venue.name}</strong>
                      <small>
                        {venue.district}, {venue.city}
                      </small>
                    </div>
                    <StatusDot
                      label={venue.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ẩn'}
                      tone={venue.status === 'ACTIVE' ? 'success' : 'muted'}
                    />
                    <span className="owner-venue-rating">
                      <StarOutlined />{' '}
                      {venue.reviewCount ? venue.avgRating.toFixed(1) : 'Chưa có đánh giá'}
                    </span>
                    <Link to={`/owner/venues/${venue.id}`} viewTransition>
                      Quản lý
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty description="Bạn chưa có cụm sân nào">
                <Link to="/owner/venues/new">Thêm cụm sân</Link>
              </Empty>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
