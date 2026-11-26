import { Alert, Button, Collapse, Form } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { loginSchema, type LoginInput } from '@sango/shared';
import { useAppDispatch } from '@/app/hooks';
import { getErrorCode, getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { RHFInput, RHFPassword } from '@/components/forms/RHFFields';
import { useLoginMutation } from '../api/authApi';
import { credentialsReceived } from '../model/authSlice';
export default function LoginPage() {
  useDocumentTitle('Đăng nhập');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dispatch = useAppDispatch();
  const { control, handleSubmit, setValue } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const [login, { isLoading, error }] = useLoginMutation();
  const submit = handleSubmit(async (values) => {
    try {
      const result = await login(values).unwrap();
      dispatch(credentialsReceived(result));
      const redirect = params.get('redirect');
      const destination =
        redirect?.startsWith('/') && !redirect.startsWith('//')
          ? redirect
          : result.user.role === 'ADMIN'
            ? '/admin'
            : result.user.role === 'OWNER'
              ? '/owner'
              : '/';
      navigate(destination, { replace: true, viewTransition: true });
    } catch {
      /* error rendered below */
    }
  });
  const code = getErrorCode(error);
  const message =
    code === 'INVALID_CREDENTIALS'
      ? 'Email hoặc mật khẩu chưa đúng. Kiểm tra lại rồi thử lần nữa.'
      : code === 'ACCOUNT_LOCKED'
        ? 'Tài khoản này đang bị khóa. Liên hệ quản trị viên để được mở khóa.'
        : getErrorMessage(error);
  return (
    <>
      <h1>Đăng nhập</h1>
      <p>
        Chưa có tài khoản?{' '}
        <Link to="/register" viewTransition>
          Đăng ký
        </Link>
      </p>
      <Form
        layout="vertical"
        component="form"
        requiredMark={false}
        onSubmitCapture={submit}
        className="auth-form"
      >
        {error && <Alert type="error" showIcon message={message} />}
        <RHFInput
          control={control}
          name="email"
          label="Email"
          placeholder="ten@email.com"
          autoComplete="email"
          prefix={<MailOutlined />}
        />
        <RHFPassword
          control={control}
          name="password"
          label="Mật khẩu"
          autoComplete="current-password"
          prefix={<LockOutlined />}
        />
        <Button type="primary" htmlType="submit" block size="large" loading={isLoading}>
          Đăng nhập
        </Button>
      </Form>
      {import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true' && (
        <Collapse
          className="demo-accounts"
          size="small"
          items={[
            {
              key: 'demo',
              label: 'Dùng tài khoản demo',
              children: (
                <div className="demo-list">
                  {[
                    {
                      label: 'Khách đặt sân',
                      email: 'customer@sango.vn',
                      password: 'Customer@123',
                    },
                    { label: 'Chủ sân', email: 'owner@sango.vn', password: 'Owner@123' },
                    { label: 'Quản trị viên', email: 'admin@sango.vn', password: 'Admin@123' },
                  ].map((item) => (
                    <Button
                      key={item.email}
                      type="text"
                      onClick={() => {
                        setValue('email', item.email);
                        setValue('password', item.password);
                      }}
                    >
                      {item.label}
                      <small>{item.email}</small>
                    </Button>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
