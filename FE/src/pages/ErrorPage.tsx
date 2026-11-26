import { Button, Collapse } from 'antd';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { ErrorState } from '@/components/feedback/ErrorState';

export default function ErrorPage() {
  useDocumentTitle('Lỗi tải trang');
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <ErrorState
      variant={missing ? 'out' : 'pitch'}
      title={missing ? 'Không tìm thấy trang' : 'Không tải được trang này'}
      description={
        missing
          ? 'Đường dẫn có thể đã đổi hoặc không còn tồn tại.'
          : 'Thử tải lại trang. Nếu lỗi lặp lại, báo cho quản trị viên kèm thời điểm xảy ra lỗi.'
      }
      actions={
        <>
          <Button type="primary" onClick={() => window.location.reload()}>
            Tải lại trang
          </Button>
          <Link to="/" viewTransition>
            <Button>Về trang chủ</Button>
          </Link>
        </>
      }
      details={
        import.meta.env.DEV ? (
          <Collapse
            ghost
            className="error-state-details"
            items={[
              {
                key: 'details',
                label: 'Chi tiết lỗi',
                children: <pre>{error instanceof Error ? error.stack : String(error)}</pre>,
              },
            ]}
          />
        ) : undefined
      }
    />
  );
}
