import { Alert, App, Button, Checkbox, Form, InputNumber, Space, Table, Typography } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRecurringSchema } from '@sango/shared';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { RHFInput, RHFTextArea } from '@/components/forms/RHFFields';
import { useCreateRecurringMutation, usePreviewRecurringMutation } from '../api/recurringApi';

export default function NewRecurringPage() {
  useDocumentTitle('Đặt cố định hàng tuần');
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm<z.input<typeof createRecurringSchema>>({ resolver: zodResolver(createRecurringSchema) as Resolver<z.input<typeof createRecurringSchema>>, defaultValues: { courtId: params.get('courtId') ?? '', firstDate: params.get('date') ?? '', startMinute: Number(params.get('startMinute') ?? 0), slotCount: Number(params.get('slotCount') ?? 1), weeks: 2, contactPhone: '', note: '', skipConflicts: false } });
  const [preview, previewState] = usePreviewRecurringMutation();
  const [create, createState] = useCreateRecurringMutation();
  const values = form.watch();
  useEffect(() => { if (!values.courtId || !values.firstDate || values.startMinute === undefined || !values.slotCount || !values.weeks) return; const timer = window.setTimeout(() => { void preview({ courtId: values.courtId, firstDate: values.firstDate, startMinute: values.startMinute, slotCount: values.slotCount, weeks: values.weeks }); }, 300); return () => window.clearTimeout(timer); }, [values.courtId, values.firstDate, values.startMinute, values.slotCount, values.weeks, preview]);
  const submit = form.handleSubmit(async (input) => { try { await create({ ...input, skipConflicts: input.skipConflicts ?? false }).unwrap(); message.success('Đã tạo lịch cố định'); navigate('/me/recurring'); } catch { /* Error rendered below. */ } });
  return <Form layout="vertical" component="form" onSubmitCapture={submit}><RHFInput control={form.control} name="firstDate" label="Ngày bắt đầu (YYYY-MM-DD)" /><Space wrap><Form.Item label="Số tuần"><InputNumber min={2} max={12} value={values.weeks} onChange={(value) => form.setValue('weeks', value ?? 2)} /></Form.Item><Form.Item label="Số khung liên tiếp"><InputNumber min={1} max={6} value={values.slotCount} onChange={(value) => form.setValue('slotCount', value ?? 1)} /></Form.Item></Space><RHFInput control={form.control} name="contactPhone" label="Số điện thoại" /><RHFTextArea control={form.control} name="note" label="Ghi chú" /><Form.Item><Checkbox checked={values.skipConflicts} onChange={(event) => form.setValue('skipConflicts', event.target.checked)}>Bỏ qua tuần bị trùng</Checkbox></Form.Item>{previewState.error && <Alert type="error" message={getErrorMessage(previewState.error)} />}{previewState.data && <><Table rowKey="date" pagination={false} dataSource={previewState.data.items} columns={[{ title: 'Ngày', dataIndex: 'date' }, { title: 'Trạng thái', render: (_: unknown, item) => item.available ? 'Còn trống' : `Trùng lịch (${item.reason})` }, { title: 'Giá', render: (_: unknown, item) => item.price ?? '—' }]} /><Typography.Text strong>Tổng tiền: {previewState.data.totalAvailablePrice.toLocaleString('vi-VN')} đ</Typography.Text></>}{createState.error && <Alert type="error" message={getErrorMessage(createState.error)} />}<Button type="primary" htmlType="submit" loading={createState.isLoading}>Đặt cố định</Button></Form>;
}
