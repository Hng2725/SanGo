import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Table,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  formatMinute,
  createMaintenanceSchema,
  isApiErrorBody,
  toVnParts,
  vnDateMinuteToUtc,
  type MaintenanceDto,
} from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { getErrorMessage } from '@/common/api/errors';
import { formatDateTime } from '@/common/utils/format';
import { FullPageSpinner } from '@/components/feedback/FullPageSpinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import {
  useCreateCourtMaintenanceMutation,
  useDeleteCourtMaintenanceMutation,
  useListCourtMaintenanceQuery,
} from '../api/maintenanceApi';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i * 60,
  label: formatMinute(i * 60),
}));

export const CourtMaintenancePage: React.FC = () => {
  const { courtId = '' } = useParams<{ courtId: string }>();
  const { message } = App.useApp();
  useDocumentTitle('Lịch bảo trì sân – SanGo');

  const { data: blocks = [], isLoading, isError, refetch } = useListCourtMaintenanceQuery(courtId);
  const [createMaintenance, { isLoading: isCreating }] = useCreateCourtMaintenanceMutation();
  const [deleteMaintenance, { isLoading: isDeleting }] = useDeleteCourtMaintenanceMutation();

  const [date, setDate] = useState<dayjs.Dayjs | null>(() =>
    dayjs(toVnParts(new Date()).dateStr).add(1, 'day'),
  );
  const [startMinute, setStartMinute] = useState<number>(480); // 08:00
  const [endMinute, setEndMinute] = useState<number>(720); // 12:00
  const [isNextDayEnd, setIsNextDayEnd] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [conflictedCodes, setConflictedCodes] = useState<string[] | null>(null);
  const [conflictMessage, setConflictMessage] = useState('');

  if (isLoading) {
    return <FullPageSpinner />;
  }
  if (isError) {
    return (
      <ErrorState
        title="Không tải được lịch bảo trì"
        description="Hãy thử tải lại danh sách trước khi tạo lịch mới."
        actions={<Button onClick={() => refetch()}>Thử lại</Button>}
      />
    );
  }

  const handleCreate = async () => {
    if (!date) {
      message.error('Vui lòng chọn ngày bảo trì');
      return;
    }

    const dateStr = date.format('YYYY-MM-DD');
    const finalEndMinute = isNextDayEnd ? endMinute + 1440 : endMinute;

    if (finalEndMinute <= startMinute) {
      message.error('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const startAt = vnDateMinuteToUtc(dateStr, startMinute).toISOString();
    const endAt = vnDateMinuteToUtc(dateStr, finalEndMinute).toISOString();
    const parsed = createMaintenanceSchema.safeParse({
      startAt,
      endAt,
      reason: reason.trim() || undefined,
    });
    if (!parsed.success) {
      message.error(parsed.error.issues[0].message);
      return;
    }

    setConflictedCodes(null);
    try {
      await createMaintenance({
        courtId,
        body: parsed.data,
      }).unwrap();

      message.success('Đã tạo lịch bảo trì thành công');
      setReason('');
    } catch (err: unknown) {
      const body = isApiErrorBody(err)
        ? err
        : typeof err === 'object' && err !== null && 'data' in err && isApiErrorBody(err.data)
          ? err.data
          : undefined;
      if (body?.code === 'MAINTENANCE_CONFLICT') {
        const details = body.details;
        const bookingCodes =
          typeof details === 'object' &&
          details !== null &&
          'bookingCodes' in details &&
          Array.isArray(details.bookingCodes)
            ? details.bookingCodes.filter((code): code is string => typeof code === 'string')
            : [];
        setConflictedCodes(bookingCodes);
        setConflictMessage(body.message);
      } else {
        message.error(getErrorMessage(err));
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMaintenance(id).unwrap();
      message.success('Đã xóa lịch bảo trì');
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const columns = [
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'startAt',
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Thời gian kết thúc',
      dataIndex: 'endAt',
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      render: (val: string | null) =>
        val || <Typography.Text type="secondary">Không ghi chú</Typography.Text>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: unknown, record: MaintenanceDto) => (
        <Popconfirm
          title="Xác nhận mở lại sân"
          description="Bạn có chắc chắn muốn hủy khóa lịch bảo trì này?"
          onConfirm={() => handleDelete(record.id)}
          okText="Hủy bảo trì"
          cancelText="Đóng"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} loading={isDeleting}>
            Xóa
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 48 }}>
      <PageHeader
        title="Lịch bảo trì sân con"
        description="Khóa khung giờ sân ngừng phục vụ để sửa chữa, nâng cấp hoặc sự kiện riêng"
        extra={
          <Link to="/owner/venues">
            <Button icon={<ArrowLeftOutlined />}>Quay lại danh sách</Button>
          </Link>
        }
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} md={10}>
          <Card title="Khóa khung giờ mới" variant="borderless">
            {conflictedCodes !== null && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                title={conflictMessage}
                description={
                  <div>
                    {conflictedCodes.length > 0 ? (
                      <>
                        Các mã đơn bị trùng: <strong>{conflictedCodes.join(', ')}</strong>.{' '}
                      </>
                    ) : (
                      'Có khách đang giữ chỗ trong khung giờ này. '
                    )}
                    Vui lòng liên hệ khách hàng hoặc chọn khung giờ khác.
                  </div>
                }
              />
            )}

            <Form layout="vertical">
              <Form.Item label="Ngày bắt đầu bảo trì" required>
                <DatePicker
                  value={date}
                  onChange={(d) => setDate(d)}
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  disabledDate={(current) =>
                    current && current < dayjs(toVnParts(new Date()).dateStr)
                  }
                />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Giờ bắt đầu" required>
                    <Select
                      value={startMinute}
                      onChange={setStartMinute}
                      options={HOUR_OPTIONS}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Giờ kết thúc" required>
                    <Select
                      value={endMinute}
                      onChange={setEndMinute}
                      options={HOUR_OPTIONS}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Select
                  value={isNextDayEnd ? 'next' : 'same'}
                  onChange={(val) => setIsNextDayEnd(val === 'next')}
                  options={[
                    { value: 'same', label: 'Kết thúc trong cùng ngày' },
                    { value: 'next', label: 'Kết thúc vào ngày hôm sau (+1 ngày)' },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label="Lý do / Ghi chú (tùy chọn)">
                <Input.TextArea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Thay thảm sân, bảo dưỡng hệ thống đèn..."
                  maxLength={200}
                  showCount
                  rows={3}
                />
              </Form.Item>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                loading={isCreating}
                block
              >
                Tạo lịch khóa bảo trì
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card title="Danh sách bảo trì sắp tới" variant="borderless">
            {blocks.length === 0 ? (
              <EmptyState description="Sân hiện đang hoạt động bình thường, chưa có lịch bảo trì nào." />
            ) : (
              <Table
                dataSource={blocks}
                columns={columns}
                rowKey="id"
                pagination={false}
                scroll={{ x: 480 }}
                size="middle"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CourtMaintenancePage;
