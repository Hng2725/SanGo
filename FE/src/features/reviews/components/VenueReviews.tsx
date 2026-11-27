import { Button, Empty, List, Progress, Skeleton, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { ReviewListDto } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { EmptyState } from '@/components/feedback/EmptyState';
import { RatingStars } from './RatingStars';
import { useGetVenueReviewsQuery } from '../api/reviewsApi';
import './VenueReviews.css';

interface VenueReviewsProps { venueId: string }

export function VenueReviews({ venueId }: VenueReviewsProps) {
  const [page, setPage] = useState(1);
  const [loadedItems, setLoadedItems] = useState<ReviewListDto['items']>([]);
  const result = useGetVenueReviewsQuery({ venueId, query: { page, pageSize: 10 } });
  useEffect(() => { setPage(1); setLoadedItems([]); }, [venueId]);
  useEffect(() => { const data = result.data; if (data) setLoadedItems((current) => page === 1 ? data.items : [...current, ...data.items.filter((item) => !current.some((old) => old.id === item.id))]); }, [page, result.data]);
  if (result.isLoading) return <Skeleton active />;
  if (result.isError) return <EmptyState description={getErrorMessage(result.error)} action={<Button onClick={() => result.refetch()}>Thử lại</Button>} />;
  if (!result.data || loadedItems.length === 0) return <Empty description="Chưa có đánh giá." />;
  const { summary } = result.data;
  return <Space className="venue-reviews" direction="vertical" style={{ width: '100%' }}>
    <Space align="start" wrap>
      <div><Typography.Title level={3}>{summary.avgRating.toFixed(1)}</Typography.Title><RatingStars value={Math.round(summary.avgRating)} readOnly /></div>
      <div className="review-distribution">{([5, 4, 3, 2, 1] as const).map((rating) => <div className="review-distribution-row" key={rating}><span className="review-distribution-label">{rating} sao</span><Progress percent={summary.count ? (summary.distribution[rating] / summary.count) * 100 : 0} showInfo={false} size="small" /><span className="review-distribution-count">{summary.distribution[rating]}</span></div>)}</div>
    </Space>
    <List dataSource={loadedItems} renderItem={(review) => <List.Item><Space direction="vertical"><Space><strong>{review.user.fullName}</strong><RatingStars value={review.rating} readOnly /></Space><Typography.Text>{review.comment}</Typography.Text>{review.ownerReply && <Typography.Text type="secondary">Phản hồi chủ sân: {review.ownerReply}</Typography.Text>}</Space></List.Item>} />
    {loadedItems.length < result.data.total && <Button loading={result.isFetching} onClick={() => setPage((value) => value + 1)}>Xem thêm</Button>}
  </Space>;
}
