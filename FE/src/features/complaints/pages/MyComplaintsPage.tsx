import { Alert, Card, Empty, Pagination, Skeleton, Space, Tag, Typography } from 'antd';
import { useSearchParams } from 'react-router';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { useGetMyComplaintsQuery } from '../api/complaintsApi';

export default function MyComplaintsPage() {
  useDocumentTitle('Khiếu nại của tôi');
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1');
  const result = useGetMyComplaintsQuery({ page: Number.isFinite(page) && page > 0 ? page : 1, pageSize: 10 });
  return <><PageHeader title="Khiếu nại của tôi" description="Theo dõi phản hồi từ quản trị viên." />{result.isLoading && <Skeleton active />}{result.isError && <Alert type="error" message={getErrorMessage(result.error)} />}{result.data?.items.length === 0 && <Empty description="Bạn chưa có khiếu nại." />}{result.data && result.data.items.length > 0 && <Space direction="vertical" style={{ width: '100%' }}>{result.data.items.map((complaint) => <Card key={complaint.id} title={complaint.title} extra={<Tag>{complaint.status}</Tag>}><Typography.Paragraph>{complaint.content}</Typography.Paragraph><Typography.Text type="secondary">{complaint.venue.name}</Typography.Text>{complaint.adminResponse && <Alert type="info" message="Phản hồi quản trị viên" description={complaint.adminResponse} style={{ marginTop: 12 }} />}</Card>)}<Pagination current={result.data.page} pageSize={result.data.pageSize} total={result.data.total} onChange={(value) => setParams({ page: String(value) })} /></Space>}</>;
}
