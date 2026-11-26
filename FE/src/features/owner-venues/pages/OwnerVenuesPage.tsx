import React from 'react';
import { Link } from 'react-router';
import {
  App,
  Button,
  Card,
  Col,
  Image,
  Popconfirm,
  Row,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { VenueDto } from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FullPageSpinner } from '@/components/feedback/FullPageSpinner';
import {
  useHideOwnerVenueMutation,
  useListOwnerVenuesQuery,
} from '../api/ownerVenueApi';

export const OwnerVenuesPage: React.FC = () => {
  useDocumentTitle('Quản lý cụm sân – SanGo');
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const { data: venues = [], isLoading, refetch } = useListOwnerVenuesQuery();
  const [hideVenue, { isLoading: isHiding }] = useHideOwnerVenueMutation();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  const handleHideVenue = async (venueId: string) => {
    try {
      await hideVenue(venueId).unwrap();
      message.success('Đã ẩn cụm sân khỏi kết quả tìm kiếm công khai');
      refetch();
    } catch {
      message.error('Không thể ẩn cụm sân');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 48 }}>
      <PageHeader
        title="Quản lý cụm sân"
        description="Danh sách các cụm sân thể thao bạn đang làm chủ sở hữu"
        extra={
          <Link to="/owner/venues/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Thêm cụm sân mới
            </Button>
          </Link>
        }
      />

      {venues.length === 0 ? (
        <EmptyState
          description="Bạn chưa có cụm sân nào. Đăng ký cụm sân đầu tiên để bắt đầu quản lý sân con, bảng giá và nhận đơn đặt sân."
          action={
            <Link to="/owner/venues/new">
              <Button type="primary">Tạo cụm sân ngay</Button>
            </Link>
          }
        />
      ) : (
        <Row gutter={[20, 20]}>
          {venues.map((venue: VenueDto) => (
            <Col xs={24} md={12} lg={8} key={venue.id}>
              <Card
                hoverable
                cover={
                  <div style={{ height: 180, overflow: 'hidden', background: token.colorFillAlter }}>
                    <Image
                      alt={venue.name}
                      src={venue.imageUrls[0] || 'https://placehold.co/800x500?text=SanGo'}
                      height={180}
                      width="100%"
                      style={{ objectFit: 'cover' }}
                      preview={false}
                    />
                  </div>
                }
                actions={[
                  <Link to={`/owner/venues/${venue.id}`} key="edit">
                    <Button type="link" icon={<EditOutlined />}>
                      Quản lý
                    </Button>
                  </Link>,
                  <Link to={`/venues/${venue.slug}`} key="view" target="_blank">
                    <Button type="link" icon={<EyeOutlined />}>
                      Xem trang
                    </Button>
                  </Link>,
                  venue.status === 'ACTIVE' ? (
                    <Popconfirm
                      key="hide"
                      title="Xác nhận ẩn cụm sân"
                      description="Cụm sân sẽ tạm thời không xuất hiện trên trang tìm kiếm công khai của khách hàng."
                      onConfirm={() => handleHideVenue(venue.id)}
                      okText="Ẩn sân"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="link" danger icon={<StopOutlined />} loading={isHiding}>
                        Ẩn sân
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Tag key="hidden" color="default" style={{ margin: 'auto' }}>
                      Đã ẩn
                    </Tag>
                  ),
                ]}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography.Title level={5} ellipsis={{ rows: 1 }} style={{ marginBottom: 4 }}>
                    {venue.name}
                  </Typography.Title>
                  <Tag color={venue.status === 'ACTIVE' ? 'green' : 'default'}>
                    {venue.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ẩn'}
                  </Tag>
                </div>

                <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 13, marginBottom: 8, minHeight: 38 }}>
                  {venue.address}, {venue.district}, {venue.city}
                </Typography.Paragraph>

                <Space style={{ marginTop: 12 }} size="middle">
                  <Typography.Text style={{ fontSize: 13 }}>
                    ⭐ {venue.avgRating.toFixed(1)} ({venue.reviewCount} đánh giá)
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    Hủy trước: {venue.cancelBeforeHours}h
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default OwnerVenuesPage;
