import { Alert, App, Button, Card, Empty, Modal, Skeleton, Space, Tag } from 'antd';
import { useState } from 'react';
import { formatMinute } from '@sango/shared';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { useCancelRecurringMutation, useGetMyRecurringQuery } from '../api/recurringApi';

export default function MyRecurringPage() {
  useDocumentTitle('Lịch cố định');
  const { message } = App.useApp();
  const result = useGetMyRecurringQuery();
  const [cancel, state] = useCancelRecurringMutation();
  const [selected, setSelected] = useState<string | null>(null);
  const submit = async () => {
    if (!selected) return;
    try {
      const response = await cancel(selected).unwrap();
      message.success(`Đã hủy ${response.cancelledCount} đơn; ${response.skippedCount} đơn không còn trong hạn hủy.`);
      setSelected(null);
    } catch { /* Mutation error is rendered in the dialog. */ }
  };
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return (
    <>
      <h1>Lịch cố định hàng tuần</h1>
      {result.isLoading && <Skeleton active />}
      {result.isError && <Alert type="error" title={getErrorMessage(result.error)} />}
      {result.data?.length === 0 && <Empty description="Chưa có lịch cố định." />}
      {result.data && <Space orientation="vertical" style={{ width: '100%' }}>
        {result.data.map((series) => <Card key={series.id} title={series.venue.name} extra={<Tag>{series.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã hủy'}</Tag>}>
          <p>{series.court.name} · {series.weeks} tuần · {series.bookingStats.total} đơn</p>
          <p>{weekdays[series.dayOfWeek]} · {formatMinute(series.startMinute)} – {formatMinute(series.startMinute + series.slotCount * 60)}</p>
          <p>Chờ xác nhận: {series.bookingStats.pending} · Đã xác nhận: {series.bookingStats.confirmed} · Hoàn thành: {series.bookingStats.completed} · Đã hủy: {series.bookingStats.cancelled} · Từ chối: {series.bookingStats.rejected}</p>
          {series.status === 'ACTIVE' && <Button danger onClick={() => { state.reset(); setSelected(series.id); }}>Hủy chuỗi</Button>}
        </Card>)}
      </Space>}
      <Modal title="Hủy lịch cố định" open={Boolean(selected)} okText="Xác nhận hủy" cancelText="Đóng" confirmLoading={state.isLoading} onCancel={() => setSelected(null)} onOk={() => void submit()}>
        {state.isError && <Alert type="error" title={getErrorMessage(state.error)} />}
        Các đơn còn được phép hủy sẽ được giải phóng.
      </Modal>
    </>
  );
}
