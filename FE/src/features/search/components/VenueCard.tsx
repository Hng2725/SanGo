import React from 'react';
import { Link } from 'react-router';
import { Card, Space, Tag, Typography } from 'antd';
import { EnvironmentOutlined, StarFilled } from '@ant-design/icons';
import { SPORT_LABELS, type VenueCardDto } from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';

export interface VenueCardProps {
  venue: VenueCardDto;
  date?: string;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, date }) => {
  const linkTo = date
    ? `/venues/${venue.slug}?date=${encodeURIComponent(date)}`
    : `/venues/${venue.slug}`;

  const imageUrl = venue.imageUrl || 'https://placehold.co/400x250?text=SanGo';

  return (
    <Link to={linkTo} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <Card
        hoverable
        style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 16 } }}
        cover={
          <div style={{ width: '100%', height: 180, overflow: 'hidden', background: '#f5f5f5' }}>
            <img
              src={imageUrl}
              alt={venue.name}
              loading="lazy"
              width={400}
              height={250}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <Typography.Title
            level={5}
            ellipsis={{ rows: 1 }}
            style={{ margin: 0, flex: 1 }}
            title={venue.name}
          >
            {venue.name}
          </Typography.Title>
          <Space size={4} style={{ color: '#faad14', fontWeight: 600, flexShrink: 0 }}>
            <StarFilled />
            <span>{venue.avgRating > 0 ? venue.avgRating.toFixed(1) : 'Mới'}</span>
            {venue.reviewCount > 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                ({venue.reviewCount})
              </Typography.Text>
            )}
          </Space>
        </div>

        <Space size={4} style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
          <EnvironmentOutlined />
          <Typography.Text type="secondary" ellipsis>
            {venue.district}, {venue.city}
          </Typography.Text>
        </Space>

        <Space size={[4, 4]} wrap style={{ marginBottom: 16 }}>
          {venue.sports.map((sport) => (
            <Tag key={sport} color="blue" style={{ margin: 0 }}>
              {SPORT_LABELS[sport] ?? sport}
            </Tag>
          ))}
        </Space>

        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Giá thuê
          </Typography.Text>
          <Typography.Text strong style={{ color: '#0958d9', fontSize: 15 }}>
            {venue.minPricePerHour !== null
              ? `Từ ${formatCurrency(venue.minPricePerHour)}/giờ`
              : 'Liên hệ'}
          </Typography.Text>
        </div>
      </Card>
    </Link>
  );
};

export default VenueCard;
