import { Alert, App, Button, Form, Radio } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { registerSchema, type RegisterInput } from '@sango/shared';
import { useAppDispatch } from '@/app/hooks';
import { getErrorCode, getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { RHFInput, RHFPassword } from '@/common/ui/RHFFields';
import { useRegisterMutation } from '../api/authApi';
import { credentialsReceived } from '../model/authSlice';
export default function RegisterPage() {
  useDocumentTitle('Tạo tài khoản');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const { control, handleSubmit, setValue, setError } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      role: params.get('role') === 'OWNER' ? 'OWNER' : 'CUSTOMER',
    },
  });
  const role = useWatch({ control, name: 'role' });
  const password = useWatch({ control, name: 'password' });
  const [register, { isLoading, error }] = useRegisterMutation();
  const submit = handleSubmit(async (values) => {
    try {
      const result = await register(values).unwrap();
      dispatch(credentialsReceived(result));
      if (result.user.role === 'CUSTOMER') message.success('Đã tạo tài khoản');
      navigate(result.user.role === 'OWNER' ? '/owner/pending' : '/', {
        replace: true,
        viewTransition: true,
      });
    } catch (failure) {
      if (getErrorCode(failure) === 'EMAIL_TAKEN')
        setError('email', {
          message: 'Email này đã được đăng ký. Đăng nhập hoặc dùng email khác.',
        });
    }
  });
  const hints = [
    { label: 'Ít nhất 8 ký tự', valid: password?.length >= 8 },
    {
      label: 'Chữ hoa và chữ thường',
      valid: /[A-Z]/.test(password ?? '') && /[a-z]/.test(password ?? ''),
    },
    { label: 'Có chữ số', valid: /\d/.test(password ?? '') },
  ];
  return (
    <>
      <h1>Tạo tài khoản</h1>
      <p>
        Đã có tài khoản?{' '}
        <Link to="/login" viewTransition>
          Đăng nhập
        </Link>
      </p>
      <Form
        layout="vertical"
        component="form"
        requiredMark={false}
        onSubmitCapture={submit}
        className="auth-form register-form"
      >
        <Form.Item label="Bạn dùng SanGo để">
          <Radio.Group
            value={role}
            onChange={(event) => setValue('role', event.target.value as RegisterInput['role'])}
            className="role-options"
          >
            <Radio.Button value="CUSTOMER">
              <span className="role-option-icon">
                <CalendarOutlined />
              </span>
              <CheckCircleOutlined className="role-option-check" />
              <strong>Đặt sân</strong>
              <small>Tìm sân trống và đặt theo giờ.</small>
            </Radio.Button>
            <Radio.Button value="OWNER">
              <span className="role-option-icon">
                <ShopOutlined />
              </span>
              <CheckCircleOutlined className="role-option-check" />
              <strong>Cho thuê sân</strong>
              <small>Đăng cụm sân, quản lý lịch và doanh thu.</small>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>
        {role === 'OWNER' && (
          <Alert
            type="info"
            showIcon
            message="Tài khoản chủ sân cần quản trị viên duyệt trước khi đăng sân."
          />
        )}
        {error && getErrorCode(error) !== 'EMAIL_TAKEN' && (
          <Alert type="error" showIcon message={getErrorMessage(error)} />
        )}
        <div className="form-two-cols">
          <RHFInput control={control} name="fullName" label="Họ và tên" />
          <RHFInput control={control} name="phone" label="Số điện thoại" autoComplete="tel" />
        </div>
        <RHFInput control={control} name="email" label="Email" autoComplete="email" />
        <div className="form-two-cols">
          <RHFPassword
            control={control}
            name="password"
            label="Mật khẩu"
            autoComplete="new-password"
          />
          <RHFPassword
            control={control}
            name="confirmPassword"
            label="Nhập lại mật khẩu"
            autoComplete="new-password"
          />
        </div>
        <ul className="password-hints">
          {hints.map((hint) => (
            <li key={hint.label} className={hint.valid ? 'valid' : ''}>
              {hint.valid ? <CheckCircleOutlined /> : <MinusCircleOutlined />}
              {hint.label}
            </li>
          ))}
        </ul>
        <Button type="primary" htmlType="submit" block size="large" loading={isLoading}>
          Tạo tài khoản
        </Button>
      </Form>
    </>
  );
}
