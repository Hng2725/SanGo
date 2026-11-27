import { Alert, App, Button, Form } from 'antd';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createReviewSchema, type CreateReviewInput } from '@sango/shared';
import { RHFTextArea } from '@/components/forms/RHFFields';
import { getErrorMessage } from '@/common/api/errors';
import { RatingStars } from './RatingStars';
import { useCreateReviewMutation } from '../api/reviewsApi';

interface ReviewFormProps { bookingId: string; onSuccess?(): void }

export function ReviewForm({ bookingId, onSuccess }: ReviewFormProps) {
  const { message } = App.useApp();
  const form = useForm<CreateReviewInput>({ resolver: zodResolver(createReviewSchema), defaultValues: { bookingId, rating: 5, comment: '' } });
  const [create, state] = useCreateReviewMutation();
  const rating = form.watch('rating');
  const submit = form.handleSubmit(async (input) => {
    try { await create(input).unwrap(); message.success('Đã gửi đánh giá'); onSuccess?.(); form.reset({ bookingId, rating: 5, comment: '' }); }
    catch { /* API error is rendered below. */ }
  });
  return <Form layout="vertical" component="form" onSubmitCapture={submit}>
    <Form.Item label="Đánh giá">
      <RatingStars value={rating} onChange={(value) => form.setValue('rating', value, { shouldDirty: true, shouldValidate: true })} />
    </Form.Item>
    <RHFTextArea control={form.control} name="comment" label="Nhận xét" />
    {state.error && <Alert type="error" message={getErrorMessage(state.error)} />}
    <Button type="primary" htmlType="submit" loading={state.isLoading}>Gửi đánh giá</Button>
  </Form>;
}
