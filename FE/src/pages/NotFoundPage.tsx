import { Button } from 'antd';
import { Link } from 'react-router';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { ErrorState } from '@/components/feedback/ErrorState';

export default function NotFoundPage() {
  useDocumentTitle('Không tìm thấy trang');
  return (
    <ErrorState
      title="Không tìm thấy trang"
      description="Đường dẫn có thể đã đổi hoặc không còn tồn tại."
      actions={
        <>
          <Link to="/" viewTransition>
            <Button type="primary">Về trang chủ</Button>
          </Link>
          <Link to="/venues" viewTransition>
            <Button>Tìm sân</Button>
          </Link>
        </>
      }
    />
  );
}
