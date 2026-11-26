import { Alert, Button, Skeleton } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { VenueCardDto } from '@sango/shared';
import { EmptyState } from '@/components/feedback/EmptyState';
import { VenuesMap } from '@/features/map';
import { VenueCard } from './VenueCard';
import styles from './SearchResults.module.css';

interface SearchResultsProps {
  venues: VenueCardDto[];
  date?: string;
  loading: boolean;
  error: boolean;
  view?: 'list' | 'map';
  onRetry: () => void;
  onReset: () => void;
}

export function SearchResults({
  venues,
  date,
  loading,
  error,
  view = 'list',
  onRetry,
  onReset,
}: SearchResultsProps) {
  if (loading)
    return (
      <div className={styles.grid} role="status" aria-label="Đang tìm sân">
        {Array.from({ length: 6 }, (_, index) => (
          <div className={styles.skeleton} key={index}>
            <Skeleton.Node active className={styles.skeletonImage} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ))}
      </div>
    );

  if (error)
    return (
      <Alert
        type="error"
        showIcon
        title="Chưa tải được danh sách sân"
        description="Kiểm tra kết nối và thử lại."
        action={
          <Button icon={<ReloadOutlined aria-hidden="true" />} onClick={onRetry}>
            Thử lại
          </Button>
        }
      />
    );

  if (!venues.length)
    return (
      <div className={styles.empty}>
        <EmptyState
          description="Không tìm thấy cụm sân nào khớp với bộ lọc hiện tại."
          action={
            <Button type="primary" onClick={onReset}>
              Xóa bộ lọc
            </Button>
          }
        />
      </div>
    );

  if (
    view === 'map' &&
    !venues.some((venue) => venue.latitude !== null && venue.longitude !== null)
  )
    return (
      <div className={styles.empty}>
        <EmptyState description="Các sân này chưa có vị trí trên bản đồ. Bạn có thể xem thông tin ở chế độ Danh sách." />
      </div>
    );

  if (view === 'map')
    return (
      <div className={styles.map}>
        <p>Vị trí các cụm sân trong trang kết quả này.</p>
        <VenuesMap venues={venues} />
      </div>
    );

  return (
    <div className={styles.grid}>
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} date={date} />
      ))}
    </div>
  );
}
