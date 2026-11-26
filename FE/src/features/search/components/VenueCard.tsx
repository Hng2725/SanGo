import { useState } from 'react';
import { Link } from 'react-router';
import { EnvironmentOutlined, StarOutlined } from '@ant-design/icons';
import { SPORT_LABELS, type VenueCardDto } from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';
import { SportIcon } from '@/components/icons/SportIcon';
import styles from './VenueCard.module.css';

export interface VenueCardProps {
  venue: VenueCardDto;
  date?: string;
}

export function VenueCard({ venue, date }: VenueCardProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const linkTo = `/venues/${venue.slug}${date ? `?date=${encodeURIComponent(date)}` : ''}`;
  const hasImage = venue.imageUrl && venue.imageUrl !== failedImageUrl;

  return (
    <Link to={linkTo} viewTransition className={styles.card}>
      <div className={styles.media}>
        {hasImage ? (
          <img
            src={venue.imageUrl ?? undefined}
            alt={venue.name}
            loading="lazy"
            width={400}
            height={250}
            onError={() => setFailedImageUrl(venue.imageUrl)}
          />
        ) : (
          <div className={styles.placeholder} role="img" aria-label="Chưa có ảnh sân">
            {venue.sports[0] ? (
              <SportIcon sport={venue.sports[0]} size={48} decorative />
            ) : (
              <EnvironmentOutlined aria-hidden="true" />
            )}
          </div>
        )}
        <div className={styles.sports}>
          {venue.sports.map((sport) => (
            <span key={sport}>
              <SportIcon sport={sport} size={14} decorative />
              {SPORT_LABELS[sport]}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 title={venue.name}>{venue.name}</h3>
          {venue.avgRating > 0 && (
            <span className={styles.rating}>
              <StarOutlined aria-hidden="true" />
              {new Intl.NumberFormat('vi-VN', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }).format(venue.avgRating)}
            </span>
          )}
        </div>
        <p className={styles.location}>
          <EnvironmentOutlined aria-hidden="true" />
          {venue.district}, {venue.city}
        </p>
        <p className={styles.reviews}>
          {venue.reviewCount > 0 ? `${venue.reviewCount} đánh giá` : 'Chưa có đánh giá'}
        </p>
        <div className={styles.footer}>
          <div className={styles.price}>
            {venue.minPricePerHour !== null ? (
              <>
                <span>Từ </span>
                <strong>{formatCurrency(venue.minPricePerHour)}</strong>
                <span> /giờ</span>
              </>
            ) : (
              <span>Liên hệ để biết giá</span>
            )}
          </div>
          <span className={styles.detail}>Xem sân</span>
        </div>
      </div>
    </Link>
  );
}

export default VenueCard;
