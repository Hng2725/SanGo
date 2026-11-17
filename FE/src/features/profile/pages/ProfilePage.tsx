import { Alert, App, Avatar, Button, Form, Input } from 'antd';
import { useForm, useWatch } from 'react-hook-form';
import { CheckCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  changePasswordSchema,
  ROLE_LABELS,
  updateProfileSchema,
  type UpdateProfileInput,
} from '@sango/shared';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { getErrorCode, getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { PageHeader } from '@/common/ui/PageHeader';
import { Section } from '@/common/ui/Section';
import { RHFInput, RHFPassword } from '@/common/ui/RHFFields';
import { StatusDot } from '@/common/ui/StatusDot';
import { selectCurrentUser, userUpdated } from '@/features/auth/model/authSlice';
import { useChangePasswordMutation, useUpdateProfileMutation } from '../api/profileApi';

const passwordFormSchema = changePasswordSchema
  .extend({ confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu') })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });
type PasswordFormInput = z.infer<typeof passwordFormSchema>;

export default function ProfilePage() {
  useDocumentTitle('Hồ sơ');
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const profile = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
  });
  const password = useForm<PasswordFormInput>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const [update, updateState] = useUpdateProfileMutation();
  const [change, changeState] = useChangePasswordMutation();
  const newPassword = useWatch({ control: password.control, name: 'newPassword' });
  const passwordHints = [
    { label: 'Ít nhất 8 ký tự', valid: newPassword?.length >= 8 },
    {
      label: 'Chữ hoa và chữ thường',
      valid: /[A-Z]/.test(newPassword ?? '') && /[a-z]/.test(newPassword ?? ''),
    },
    { label: 'Có chữ số', valid: /\d/.test(newPassword ?? '') },
  ];

  const saveProfile = profile.handleSubmit(async (input) => {
    try {
      const updated = await update({ ...input, phone: input.phone || null }).unwrap();
      dispatch(userUpdated(updated));
      profile.reset({ fullName: updated.fullName, phone: updated.phone });
      message.success('Đã lưu thay đổi');
    } catch {
      // The API error is displayed beside the form.
    }
  });
  const savePassword = password.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await change({ currentPassword, newPassword }).unwrap();
      password.reset();
      message.success('Đã đổi mật khẩu');
    } catch (error) {
      if (getErrorCode(error) === 'VALIDATION_ERROR') {
        password.setError('currentPassword', { message: 'Mật khẩu hiện tại chưa đúng.' });
      }
    }
  });

  if (!user) return null;
  return (
    <>
      <PageHeader title="Hồ sơ" />
      <div className="profile-grid">
        <Section className="profile-summary">
          <Avatar size={64} className={`role-avatar role-avatar-${user.role.toLowerCase()}`}>
            {user.fullName.slice(0, 1)}
          </Avatar>
          <h2>{user.fullName}</h2>
          <p>{ROLE_LABELS[user.role]}</p>
          <p>{user.email}</p>
          <p>
            Tham gia{' '}
            {new Intl.DateTimeFormat('en-GB', { month: '2-digit', year: 'numeric' }).format(
              new Date(user.createdAt),
            )}
          </p>
          {user.role === 'OWNER' && (
            <StatusDot
              label={
                user.ownerStatus === 'APPROVED'
                  ? 'Đã duyệt'
                  : user.ownerStatus === 'PENDING'
                    ? 'Chờ duyệt'
                    : 'Từ chối'
              }
              tone={
                user.ownerStatus === 'APPROVED'
                  ? 'success'
                  : user.ownerStatus === 'PENDING'
                    ? 'warning'
                    : 'error'
              }
            />
          )}
        </Section>
        <div className="profile-forms">
          <Section title="Thông tin cá nhân">
            <Form layout="vertical" component="form" onSubmitCapture={saveProfile}>
              <RHFInput control={profile.control} name="fullName" label="Họ và tên" />
              <Form.Item label="Email">
                <Input value={user.email} disabled readOnly />
                <small>Email dùng để đăng nhập, không thể thay đổi.</small>
              </Form.Item>
              <RHFInput control={profile.control} name="phone" label="Số điện thoại" />
              {updateState.error && (
                <Alert type="error" message={getErrorMessage(updateState.error)} />
              )}
              <Button
                type="primary"
                htmlType="submit"
                disabled={!profile.formState.isDirty}
                loading={updateState.isLoading}
              >
                Lưu thay đổi
              </Button>
            </Form>
          </Section>
          <Section title="Đổi mật khẩu">
            <Form layout="vertical" component="form" onSubmitCapture={savePassword}>
              <RHFPassword
                control={password.control}
                name="currentPassword"
                label="Mật khẩu hiện tại"
              />
              <RHFPassword control={password.control} name="newPassword" label="Mật khẩu mới" />
              <ul className="password-hints profile-password-hints">
                {passwordHints.map((hint) => (
                  <li key={hint.label} className={hint.valid ? 'valid' : ''}>
                    {hint.valid ? <CheckCircleOutlined /> : <MinusCircleOutlined />}
                    {hint.label}
                  </li>
                ))}
              </ul>
              <RHFPassword
                control={password.control}
                name="confirmPassword"
                label="Nhập lại mật khẩu"
              />
              {changeState.error && getErrorCode(changeState.error) !== 'VALIDATION_ERROR' && (
                <Alert type="error" message={getErrorMessage(changeState.error)} />
              )}
              <Button type="primary" htmlType="submit" loading={changeState.isLoading}>
                Đổi mật khẩu
              </Button>
            </Form>
          </Section>
        </div>
      </div>
    </>
  );
}
