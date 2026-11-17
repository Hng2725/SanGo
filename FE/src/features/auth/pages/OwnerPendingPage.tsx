import { Alert, App, Button, Grid, Steps } from 'antd';
import { ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { baseApi } from '@/common/api/baseApi';
import { useMeQuery } from '../api/authApi';
import { loggedOut, selectCurrentUser, userUpdated } from '../model/authSlice';

export default function OwnerPendingPage() {
  useDocumentTitle('Chờ duyệt');
  const screens = Grid.useBreakpoint();
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { refetch, isFetching } = useMeQuery();
  const rejected = user?.ownerStatus === 'REJECTED';

  const check = async () => {
    try {
      const current = (await refetch()).data;
      if (current) {
        dispatch(userUpdated(current));
        if (current.ownerStatus === 'APPROVED') {
          message.success('Tài khoản đã được duyệt');
          navigate('/owner', { viewTransition: true });
        } else {
          message.info('Hồ sơ vẫn đang chờ duyệt');
        }
      }
    } catch {
      message.error('Không kiểm tra được trạng thái');
    }
  };
  const logout = () => {
    dispatch(loggedOut());
    dispatch(baseApi.util.resetApiState());
    navigate('/login', { viewTransition: true });
  };

  return (
    <div className="pending-page">
      <div
        className={`pending-symbol ${rejected ? 'pending-symbol-rejected' : ''}`}
        aria-hidden="true"
      >
        {rejected ? <CloseCircleOutlined /> : <ClockCircleOutlined />}
      </div>
      <h1>{rejected ? 'Hồ sơ chủ sân chưa được duyệt' : 'Tài khoản chủ sân đang chờ duyệt'}</h1>
      <p>
        {rejected
          ? 'Bạn có thể đăng ký tài khoản khác bằng email khác để đặt sân.'
          : `Quản trị viên sẽ xem xét hồ sơ của bạn. Kết quả được gửi tới ${user?.email ?? 'email của bạn'}.`}
      </p>
      {rejected && (
        <Alert type="error" showIcon message={user?.ownerNote ?? 'Hồ sơ chưa được duyệt'} />
      )}
      <Steps
        className="pending-steps"
        current={1}
        status={rejected ? 'error' : 'process'}
        size="small"
        direction={screens.sm ? 'horizontal' : 'vertical'}
        items={[
          { title: 'Tạo tài khoản' },
          { title: 'Quản trị viên duyệt' },
          { title: 'Đăng cụm sân đầu tiên' },
        ]}
      />
      <div className="pending-actions">
        {!rejected && (
          <Button type="primary" loading={isFetching} onClick={check}>
            Kiểm tra lại
          </Button>
        )}
        <Button className="logout-action" onClick={logout}>
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}
