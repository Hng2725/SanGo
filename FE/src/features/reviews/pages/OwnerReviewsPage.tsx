import { Alert, App, Button, Card, Empty, Input, Pagination, Select, Skeleton, Space, Tag, Typography } from 'antd';
import { useSearchParams } from 'react-router';
import { useState } from 'react';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { RatingStars } from '../components/RatingStars';
import { useGetOwnerReviewsQuery, useReplyReviewMutation } from '../api/reviewsApi';

export default function OwnerReviewsPage() {
  useDocumentTitle('Đánh giá của khách');
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const [reply, setReply] = useState<Record<string, string>>({});
  const page = Number(params.get('page') ?? 1);
  const rating = params.get('rating') ? Number(params.get('rating')) : undefined;
  const result = useGetOwnerReviewsQuery({ page, pageSize: 10, rating });
  const [replyReview, replyState] = useReplyReviewMutation();
  const saveReply = async (id: string) => { const text = reply[id]?.trim(); if (!text) return; try { await replyReview({ id, input: { reply: text } }).unwrap(); message.success('Đã gửi phản hồi'); setReply((current) => { const next = { ...current }; delete next[id]; return next; }); } catch (error) { message.error(getErrorMessage(error)); } };
  return <><PageHeader title="Đánh giá của khách" description="Theo dõi và phản hồi đánh giá tại các cụm sân." /><Space direction="vertical" style={{ width: '100%' }}><Select allowClear placeholder="Lọc số sao" value={rating} options={[5, 4, 3, 2, 1].map((value) => ({ value, label: `${value} sao` }))} onChange={(value) => setParams(value ? { rating: String(value), page: '1' } : { page: '1' })} />{result.isLoading && <Skeleton active />}{result.isError && <Alert type="error" message={getErrorMessage(result.error)} />}{result.data?.items.length === 0 && <Empty description="Chưa có đánh giá." />}{result.data?.items.map((item) => <Card key={item.id} title={<Space><Typography.Text strong>{item.user.fullName}</Typography.Text><RatingStars value={item.rating} readOnly /></Space>} extra={<Tag>{item.court.name}</Tag>}><Typography.Paragraph>{item.comment || 'Không có nhận xét.'}</Typography.Paragraph><Space.Compact style={{ width: '100%' }}><Input value={reply[item.id] ?? item.ownerReply ?? ''} onChange={(event) => setReply((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Phản hồi khách hàng" maxLength={1000} /><Button loading={replyState.isLoading} onClick={() => void saveReply(item.id)}>Phản hồi</Button></Space.Compact></Card>)}{result.data && <Pagination current={result.data.page} pageSize={result.data.pageSize} total={result.data.total} onChange={(value) => setParams({ rating: rating ? String(rating) : '', page: String(value) })} />}</Space></>;
}
