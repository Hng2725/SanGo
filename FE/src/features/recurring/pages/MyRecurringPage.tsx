import { Alert, Button, Card, Empty, Modal, Skeleton, Space, Tag } from 'antd';
import { useState } from 'react';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { useCancelRecurringMutation, useGetMyRecurringQuery } from '../api/recurringApi';

export default function MyRecurringPage() {
  useDocumentTitle('Lịch cố định');
  const result = useGetMyRecurringQuery();
  const [cancel, state] = useCancelRecurringMutation();
  const [selected, setSelected] = useState<string | null>(null);
  const submit = async () => { if (!selected) return; try { await cancel(selected).unwrap(); setSelected(null); } catch { /* RTK error rendered by query state. */ } };
  return <><h1>Lịch cố định hàng tuần</h1>{result.isLoading && <Skeleton active />}{result.isError && <Alert type="error" message={getErrorMessage(result.error)} />}{result.data?.length === 0 && <Empty description="Chưa có lịch cố định." />}{result.data && <Space direction="vertical" style={{ width: '100%' }}>{result.data.map((series) => <Card key={series.id} title={series.venue.name} extra={<Tag>{series.status}</Tag>}><p>{series.court.name} · {series.weeks} tuần · {series.bookingStats.total} đơn</p>{series.status === 'ACTIVE' && <Button danger onClick={() => setSelected(series.id)}>Hủy chuỗi</Button>}</Card>)}</Space>}<Modal title="Hủy lịch cố định" open={Boolean(selected)} confirmLoading={state.isLoading} onCancel={() => setSelected(null)} onOk={() => void submit()}>Các đơn còn được phép hủy sẽ được giải phóng.</Modal></>;
}
