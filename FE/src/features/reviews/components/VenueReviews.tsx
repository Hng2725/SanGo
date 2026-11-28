import { Button, Empty, List, Progress, Skeleton, Space, Typography } from 'antd';
import { useState } from 'react';
import type { ReviewDto } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { EmptyState } from '@/components/feedback/EmptyState';
import { RatingStars } from './RatingStars';
import { useGetVenueReviewsQuery } from '../api/reviewsApi';
import './VenueReviews.css';

interface VenueReviewsProps { venueId: string }

export function VenueReviews({ venueId }: VenueReviewsProps) {
  return <VenueReviewPages key={venueId} venueId={venueId} />;
}

function ReviewItems({ items }: { items: ReviewDto[] }) {
  return <List dataSource={items} renderItem={(review) => <List.Item><Space orientation="vertical"><Space><strong>{review.user.fullName}</strong><RatingStars value={review.rating} readOnly /></Space><Typography.Text>{review.comment}</Typography.Text>{review.ownerReply && <Typography.Text type="secondary">Phản hồi chủ sân: {review.ownerReply}</Typography.Text>}</Space></List.Item>} />;
}

function ReviewPage({ venueId, page }: VenueReviewsProps & { page: number }) {
  const result = useGetVenueReviewsQuery({ venueId, query: { page, pageSize: 10 } });
  if (result.isLoading) return <Skeleton active />;
  if (result.isError) return <EmptyState description={getErrorMessage(result.error)} action={<Button onClick={() => result.refetch()}>Thử lại</Button>} />;
  return <ReviewItems items={result.currentData?.items ?? []} />;
}

function VenueReviewPages({ venueId }: VenueReviewsProps) {
  const [pageCount, setPageCount] = useState(1);
  const result = useGetVenueReviewsQuery({ venueId, query: { page: 1, pageSize: 10 } });
  if (result.isLoading) return <Skeleton active />;
  if (result.isError) return <EmptyState description={getErrorMessage(result.error)} action={<Button onClick={() => result.refetch()}>Thử lại</Button>} />;
  if (!result.data || result.data.items.length === 0) return <Empty description="Chưa có đánh giá." />;
  const { summary } = result.data;
  return <Space className="venue-reviews" orientation="vertical" style={{ width: '100%' }}>
    <Space align="start" wrap>
      <div><Typography.Title level={3}>{summary.avgRating.toFixed(1)}</Typography.Title><RatingStars value={Math.round(summary.avgRating)} readOnly /></div>
      <div className="review-distribution">{([5, 4, 3, 2, 1] as const).map((rating) => <div className="review-distribution-row" key={rating}><span className="review-distribution-label">{rating} sao</span><Progress percent={summary.count ? (summary.distribution[rating] / summary.count) * 100 : 0} showInfo={false} size="small" /><span className="review-distribution-count">{summary.distribution[rating]}</span></div>)}</div>
    </Space>
    <ReviewItems items={result.data.items} />
    {Array.from({ length: pageCount - 1 }, (_, index) => <ReviewPage key={index + 2} venueId={venueId} page={index + 2} />)}
    {pageCount < result.data.totalPages && <Button loading={result.isFetching} onClick={() => setPageCount((value) => value + 1)}>Xem thêm</Button>}
  </Space>;
}
