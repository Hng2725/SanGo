import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert, Button, Skeleton } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { SPORTS, toVnParts, type SearchVenuesQuery } from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useGetLocationsQuery } from '@/features/owner-venues';
import { QuickSearchForm, SportShortcuts, VenueCard, useGetVenuesQuery } from '@/features/search';
import styles from './HomePage.module.css';

export default function HomePage() {
  useDocumentTitle('Trang chủ');
  const navigate = useNavigate();
  const [date, setDate] = useState(() => toVnParts(new Date()).dateStr);
  const locations = useGetLocationsQuery();
  const featured = useGetVenuesQuery({ sort: 'rating', pageSize: 6 });

  const search = (filters: Partial<SearchVenuesQuery>) => {
    const params = new URLSearchParams();
    if (filters.sport) params.set('sport', filters.sport);
    if (filters.city) params.set('city', filters.city);
    if (filters.date) params.set('date', filters.date);
    navigate(`/venues${params.size ? `?${params}` : ''}`, { viewTransition: true });
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.intro}>
          <div className={styles.copy}>
            <h1 id="home-title">
              Tìm sân trống, <br />
              đặt giờ chơi.
            </h1>
            <p>
              Chọn môn thể thao, khu vực và ngày chơi. Xem lịch trống rồi chọn khung giờ phù hợp với
              bạn.
            </p>
          </div>
          <div className={styles.summary} aria-label="Khám phá sân trên SanGo">
            <div>
              <strong>{featured.isError ? '—' : (featured.data?.total ?? '—')}</strong>
              <span>Cụm sân</span>
            </div>
            <div>
              <strong>{SPORTS.length}</strong>
              <span>Môn thể thao</span>
            </div>
          </div>
        </div>
        <QuickSearchForm
          date={date}
          onDateChange={setDate}
          locations={locations.data ?? []}
          locationsLoading={locations.isLoading}
          onSearch={search}
        />
        {locations.isError && (
          <Alert
            type="warning"
            showIcon
            title="Chưa tải được khu vực. Bạn vẫn có thể tìm theo môn và ngày."
            action={
              <Button size="small" onClick={() => void locations.refetch()}>
                Tải lại khu vực
              </Button>
            }
          />
        )}
        <div className={styles.benefits}>
          <span>
            <CalendarOutlined aria-hidden="true" />
            Lịch trống theo giờ
          </span>
          <span>
            <WalletOutlined aria-hidden="true" />
            Giá thuê rõ ràng
          </span>
          <span>
            <CheckCircleOutlined aria-hidden="true" />
            Chọn nhiều khung liên tiếp
          </span>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="home-sports-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="home-sports-title">Tìm theo môn thể thao</h2>
            <p>Chọn môn bạn muốn chơi để khám phá các sân phù hợp.</p>
          </div>
        </div>
        <SportShortcuts />
      </section>

      <section className={styles.section} aria-labelledby="home-featured-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="home-featured-title">Sân nổi bật</h2>
            <p>Khám phá những cụm sân được đánh giá cao trên SanGo.</p>
          </div>
          <Link to="/venues?sort=rating" viewTransition>
            Xem tất cả
          </Link>
        </div>
        {featured.isLoading ? (
          <div className={styles.venueGrid} role="status" aria-label="Đang tải sân nổi bật">
            {Array.from({ length: 6 }, (_, index) => (
              <div className={styles.skeletonCard} key={index}>
                <Skeleton.Node className={styles.skeletonImage} active />
                <Skeleton active title paragraph={{ rows: 2 }} />
              </div>
            ))}
          </div>
        ) : featured.isError ? (
          <Alert
            type="error"
            showIcon
            title="Chưa tải được sân nổi bật"
            description="Kiểm tra kết nối và thử lại."
            action={
              <Button
                icon={<ReloadOutlined aria-hidden="true" />}
                onClick={() => void featured.refetch()}
                loading={featured.isFetching}
              >
                Thử lại
              </Button>
            }
          />
        ) : !featured.data?.items.length ? (
          <div className={styles.empty}>
            <EmptyState
              description="Chưa có cụm sân nổi bật nào."
              action={
                <Link to="/venues" viewTransition>
                  Tìm các sân khác
                </Link>
              }
            />
          </div>
        ) : (
          <div className={styles.venueGrid}>
            {featured.data.items.map((venue) => (
              <VenueCard key={venue.id} venue={venue} date={date} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
