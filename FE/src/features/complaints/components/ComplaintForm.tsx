import { Alert, App, Button, Form } from 'antd';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createComplaintSchema, type CreateComplaintInput } from '@sango/shared';
import { RHFInput, RHFTextArea } from '@/components/forms/RHFFields';
import { getErrorMessage } from '@/common/api/errors';
import { useCreateComplaintMutation } from '../api/complaintsApi';

interface ComplaintFormProps { venueId: string; bookingId?: string; onSuccess?(): void }

export function ComplaintForm({ venueId, bookingId, onSuccess }: ComplaintFormProps) {
  const { message } = App.useApp();
  const [create, state] = useCreateComplaintMutation();
  const form = useForm<CreateComplaintInput>({ resolver: zodResolver(createComplaintSchema), defaultValues: { venueId, bookingId, title: '', content: '' } });
  const submit = form.handleSubmit(async (input) => { try { await create(input).unwrap(); message.success('Đã gửi khiếu nại'); form.reset({ venueId, bookingId, title: '', content: '' }); onSuccess?.(); } catch { /* Rendered below. */ } });
  return <Form layout="vertical" component="form" onSubmitCapture={submit}><RHFInput control={form.control} name="title" label="Tiêu đề" /><RHFTextArea control={form.control} name="content" label="Nội dung" />{state.error && <Alert type="error" message={getErrorMessage(state.error)} />}<Button type="primary" htmlType="submit" loading={state.isLoading}>Gửi khiếu nại</Button></Form>;
}
