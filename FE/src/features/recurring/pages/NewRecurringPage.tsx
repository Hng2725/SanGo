import { Alert, App, Button, Checkbox, Form, InputNumber, Space, Table, Typography } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRecurringSchema, formatMinute, recurringPreviewSchema, type RecurringConflictReason, type RecurringPreviewItemDto } from '@sango/shared';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { RHFInput, RHFTextArea } from '@/components/forms/RHFFields';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { useCreateRecurringMutation, usePreviewRecurringMutation } from '../api/recurringApi';
import { formatCurrency, formatDate } from '@/common/utils/format';

const conflictLabels: Record<RecurringConflictReason, string> = { BOOKED: 'Đã có người đặt hoặc giữ chỗ', MAINTENANCE: 'Sân đang bảo trì', CLOSED: 'Ngoài giờ mở cửa', PAST: 'Đã qua giờ chơi' };

export default function NewRecurringPage() {
  useDocumentTitle('Đặt cố định hàng tuần');
  const { message } = App.useApp();
  const mobile = useMediaQuery('(max-width: 991px)');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm<z.input<typeof createRecurringSchema>>({ resolver: zodResolver(createRecurringSchema) as Resolver<z.input<typeof createRecurringSchema>>, defaultValues: { courtId: params.get('courtId') ?? '', firstDate: params.get('date') ?? '', startMinute: Number(params.get('startMinute') ?? 0), slotCount: Number(params.get('slotCount') ?? 1), weeks: 2, contactPhone: '', note: '', skipConflicts: false } });
  const [preview, previewState] = usePreviewRecurringMutation();
  const [create, createState] = useCreateRecurringMutation();
  const values = useWatch({ control: form.control });
  const { courtId, firstDate, startMinute, slotCount, weeks } = values;
  useEffect(() => {
    const input = recurringPreviewSchema.safeParse({ courtId, firstDate, startMinute, slotCount, weeks });
    if (!input.success) return;
    const timer = window.setTimeout(() => { void preview(input.data); }, 300);
    return () => window.clearTimeout(timer);
  }, [courtId, firstDate, startMinute, slotCount, weeks, preview]);
  const submit = form.handleSubmit(async (input) => { try { await create({ ...input, skipConflicts: input.skipConflicts ?? false }).unwrap(); message.success('Đã tạo lịch cố định'); navigate('/me/recurring'); } catch { /* Error rendered below. */ } });
  const selection = recurringPreviewSchema.safeParse({ courtId, firstDate, startMinute, slotCount, weeks });
  const availabilityLabel = (item: RecurringPreviewItemDto) => item.available ? 'Còn trống' : conflictLabels[item.reason ?? 'CLOSED'];
  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Đặt cố định hàng tuần" description="Xem trước lịch và giá từng tuần trước khi đặt." />
      <Section>
        <Form layout="vertical" component="form" onSubmitCapture={submit}>
          {selection.success && <Typography.Paragraph>Giờ đã chọn: {formatMinute(selection.data.startMinute)} – {formatMinute(selection.data.startMinute + selection.data.slotCount * 60)} · {selection.data.slotCount} giờ mỗi tuần</Typography.Paragraph>}
          <RHFInput control={form.control} name="firstDate" label="Ngày bắt đầu (YYYY-MM-DD)" />
          <Space wrap>
            <Form.Item label="Số tuần"><InputNumber aria-label="Số tuần" min={2} max={12} value={values.weeks} onChange={(value) => form.setValue('weeks', value ?? 2)} /></Form.Item>
            <Form.Item label="Số khung liên tiếp"><InputNumber aria-label="Số khung liên tiếp" min={1} max={6} value={values.slotCount} onChange={(value) => form.setValue('slotCount', value ?? 1)} /></Form.Item>
          </Space>
          <RHFInput control={form.control} name="contactPhone" label="Số điện thoại" />
          <RHFTextArea control={form.control} name="note" label="Ghi chú" />
          <Form.Item><Checkbox checked={values.skipConflicts} onChange={(event) => form.setValue('skipConflicts', event.target.checked)}>Bỏ qua tuần bị trùng</Checkbox></Form.Item>
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {previewState.error && <Alert type="error" title={getErrorMessage(previewState.error)} />}
            {previewState.data && <>
              {mobile ? <ul aria-label="Các tuần đặt cố định" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {previewState.data.items.map((item) => <li key={item.date} style={{ padding: '12px 0', borderBottom: '1px solid var(--sg-line)' }}>
                  <Space orientation="vertical" size={4}>
                    <Typography.Text strong>{formatDate(item.date)}</Typography.Text>
                    <Typography.Text>{availabilityLabel(item)}</Typography.Text>
                    <Typography.Text>{item.price === null ? '—' : formatCurrency(item.price)}</Typography.Text>
                  </Space>
                </li>)}
              </ul> : <Table<RecurringPreviewItemDto> rowKey="date" pagination={false} dataSource={previewState.data.items} columns={[
                { title: 'Ngày', dataIndex: 'date', render: (date: string) => formatDate(date) },
                { title: 'Trạng thái', render: (_: unknown, item) => availabilityLabel(item) },
                { title: 'Giá', align: 'right', render: (_: unknown, item) => item.price === null ? '—' : formatCurrency(item.price) },
              ]} />}
              <Typography.Text strong>Tổng tiền: {formatCurrency(previewState.data.totalAvailablePrice)}</Typography.Text>
            </>}
            {createState.error && <Alert type="error" title={getErrorMessage(createState.error)} />}
            <Button type="primary" htmlType="submit" block={mobile} loading={createState.isLoading}>Đặt cố định</Button>
          </Space>
        </Form>
      </Section>
    </div>
  );
}
