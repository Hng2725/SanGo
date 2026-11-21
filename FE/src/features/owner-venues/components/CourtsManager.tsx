import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  SPORT_LABELS,
  SPORTS,
  type CourtDto,
  type CreateCourtInput,
  type Sport,
} from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';
import {
  useCreateCourtMutation,
  useDeleteCourtMutation,
  useUpdateCourtMutation,
} from '../api/ownerVenueApi';

export interface CourtsManagerProps {
  venueId: string;
  courts: CourtDto[];
}

export const CourtsManager: React.FC<CourtsManagerProps> = ({ venueId, courts }) => {
  const { message } = App.useApp();
  const [createCourt, { isLoading: isCreating }] = useCreateCourtMutation();
  const [updateCourt, { isLoading: isUpdating }] = useUpdateCourtMutation();
  const [deleteCourt, { isLoading: isDeleting }] = useDeleteCourtMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<CourtDto | null>(null);

  const [courtName, setCourtName] = useState('');
  const [sport, setSport] = useState<Sport>('FOOTBALL');
  const [basePrice, setBasePrice] = useState<number>(150_000);

  const openAddModal = () => {
    setEditingCourt(null);
    setCourtName('');
    setSport('FOOTBALL');
    setBasePrice(150_000);
    setModalOpen(true);
  };

  const openEditModal = (court: CourtDto) => {
    setEditingCourt(court);
    setCourtName(court.name);
    setSport(court.sport);
    setBasePrice(court.basePricePerHour);
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!courtName.trim()) {
      message.error('Vui lòng nhập tên sân con');
      return;
    }

    try {
      if (editingCourt) {
        await updateCourt({
          courtId: editingCourt.id,
          venueId,
          body: {
            name: courtName.trim(),
            sport,
            basePricePerHour: basePrice,
          },
        }).unwrap();
        message.success('Đã cập nhật sân con');
      } else {
        const payload: CreateCourtInput = {
          name: courtName.trim(),
          sport,
          basePricePerHour: basePrice,
        };
        await createCourt({ venueId, body: payload }).unwrap();
        message.success('Đã thêm sân con mới');
      }
      setModalOpen(false);
    } catch {
      message.error('Thao tác không thành công. Kiểm tra lại thông tin.');
    }
  };

  const handleToggleActive = async (court: CourtDto, checked: boolean) => {
    try {
      await updateCourt({
        courtId: court.id,
        venueId,
        body: { isActive: checked },
      }).unwrap();
      message.success(checked ? 'Đã bật hoạt động sân' : 'Đã tạm ngưng hoạt động sân');
    } catch {
      message.error('Không thể đổi trạng thái hoạt động của sân');
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    try {
      await deleteCourt({ courtId, venueId }).unwrap();
      message.success('Đã xóa sân con');
    } catch {
      message.error('Không thể xóa sân con');
    }
  };

  const columns = [
    {
      title: 'Tên sân',
      dataIndex: 'name',
      render: (name: string, record: CourtDto) => (
        <Space orientation="vertical" size={2}>
          <Typography.Text strong>{name}</Typography.Text>
          {!record.isActive && <Tag color="default">Đang tạm ngưng</Tag>}
        </Space>
      ),
    },
    {
      title: 'Môn thể thao',
      dataIndex: 'sport',
      render: (s: Sport) => <Tag color="blue">{SPORT_LABELS[s] || s}</Tag>,
    },
    {
      title: 'Giá mặc định / giờ',
      dataIndex: 'basePricePerHour',
      render: (price: number) => formatCurrency(price),
    },
    {
      title: 'Hoạt động',
      dataIndex: 'isActive',
      render: (active: boolean, record: CourtDto) => (
        <Switch
          checked={active}
          onChange={(checked) => handleToggleActive(record, checked)}
          disabled={isUpdating}
        />
      ),
    },
    {
      title: 'Thao tác & Cấu hình',
      key: 'actions',
      render: (_: unknown, record: CourtDto) => (
        <Space size="middle" wrap>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Sửa
          </Button>

          <Link to={`/owner/courts/${record.id}/pricing`}>
            <Button size="small" icon={<DollarOutlined />}>
              Bảng giá
            </Button>
          </Link>

          <Link to={`/owner/courts/${record.id}/maintenance`}>
            <Button size="small" icon={<CalendarOutlined />}>
              Bảo trì
            </Button>
          </Link>

          <Popconfirm
            title="Xác nhận xóa sân"
            description="Nếu sân đã có đơn đặt trước đó, sân sẽ được chuyển sang trạng thái ngưng hoạt động thay vì xóa hoàn toàn."
            onConfirm={() => handleDeleteCourt(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} loading={isDeleting} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Danh sách sân con"
      variant="borderless"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Thêm sân con
        </Button>
      }
    >
      <Table
        dataSource={courts}
        columns={columns}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: 'Chưa có sân con nào trong cụm này' }}
      />

      <Modal
        title={editingCourt ? 'Chỉnh sửa sân con' : 'Thêm sân con mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSaveModal}
        confirmLoading={isCreating || isUpdating}
        okText={editingCourt ? 'Lưu' : 'Tạo sân'}
        cancelText="Hủy"
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Tên sân con" required>
            <Input
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="Ví dụ: Sân 5A, Sân VIP 1..."
            />
          </Form.Item>

          <Form.Item label="Môn thể thao" required>
            <Select
              value={sport}
              onChange={(val) => setSport(val)}
              options={SPORTS.map((s) => ({ value: s, label: SPORT_LABELS[s] }))}
            />
          </Form.Item>

          <Form.Item label="Giá mặc định / giờ (₫)" required>
            <InputNumber
              value={basePrice}
              onChange={(val) => setBasePrice(val || 100_000)}
              step={10_000}
              min={10_000}
              max={10_000_000}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(val) => (val ? Number(val.replace(/\./g, '')) : 0)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CourtsManager;
