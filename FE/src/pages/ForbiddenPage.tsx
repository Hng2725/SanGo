import { Button } from 'antd';
import { Link, useNavigate } from 'react-router';
import { useAppDispatch } from '@/app/hooks';
import { baseApi } from '@/common/api/baseApi';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { ErrorState } from '@/components/feedback/ErrorState';
import { loggedOut } from '@/features/auth/model/authSlice';

export default function ForbiddenPage() {
  useDocumentTitle('Không có quyền');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const switchAccount = () => {
    dispatch(loggedOut());
    dispatch(baseApi.util.resetApiState());
    navigate('/login', { viewTransition: true });
  };
  return (
    <ErrorState
      title="Bạn không có quyền xem trang này"
      description="Trang này dành cho vai trò khác. Đăng nhập bằng tài khoản phù hợp để tiếp tục."
      actions={
        <>
          <Link to="/" viewTransition>
            <Button type="primary">Về trang chủ</Button>
          </Link>
          <Button onClick={switchAccount}>Đăng nhập tài khoản khác</Button>
        </>
      }
    />
  );
}
