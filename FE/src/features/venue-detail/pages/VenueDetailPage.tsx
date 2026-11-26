import React, { useState } from 'react';
import { useParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Image,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  CalendarOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  StarFilled,
  UserOutlined,
} from '@ant-design/icons';
import {
  formatMinute,
  SPORT_LABELS,
  type Sport,
} from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { FullPageSpinner } from '@/common/ui/FullPageSpinner';
import { EmptyState } from '@/common/ui/EmptyState';
import { VenueMap } from '@/features/map';
import { useGetVenueDetailBySlugQuery } from '../api/venueDetailApi';

const DAY_NAMES = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];

export const VenueDetailPage: React.FC = () => {
  const { token } = theme.useToken();
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: venue, isLoading, isError } = useGetVenueDetailBySlugQuery(slug);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useDocumentTitle(venue ? `${venue.name} – Đặt sân` : 'Chi tiết cụm sân – SanGo');

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isError || !venue) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 16px' }}>
        <EmptyState
          description="Cụm sân này không tồn tại hoặc đã tạm dừng hoạt động."
          action={
            <Button type="primary" onClick={() => (window.location.href = '/')}>
              Về trang chủ tìm kiếm
            </Button>
          }
        />
      </div>
    );
  }

  const images = venue.imageUrls.length > 0
    ? venue.imageUrls
    : ['https://placehold.co/800x500?text=SanGo'];

  const allSports = Array.from(
    new Set(venue.courts.map((c) => c.sport)),
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 64px' }}>
      <Row gutter={[32, 32]}>
        {/* Cột trái: Gallery, Thông tin, Danh sách sân & giá, Lưới lịch, Đánh giá */}
        <Col xs={24} lg={15}>
          {/* Gallery ảnh */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 380, borderRadius: 12, overflow: 'hidden', background: token.colorFillAlter, marginBottom: 12 }}>
              <Image
                src={images[activeImageIndex] || images[0]}
                alt={venue.name}
                height={380}
                width="100%"
                style={{ objectFit: 'cover' }}
              />
            </div>

            {images.length > 1 && (
              <Space size={8} wrap>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: 72,
                      height: 52,
                      borderRadius: 6,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: idx === activeImageIndex ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                    }}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </Space>
            )}
          </div>

          {/* Tiêu đề & Thông tin sân */}
          <div>
            <Typography.Title level={2} style={{ marginBottom: 8 }}>
              {venue.name}
            </Typography.Title>

            <Space size="middle" wrap style={{ marginBottom: 16 }}>
              <Space size={4} style={{ color: token.colorWarning, fontWeight: 600 }}>
                <StarFilled />
                <span>{venue.avgRating ? venue.avgRating.toFixed(1) : '5.0'}</span>
                <Typography.Text type="secondary" style={{ fontWeight: 'normal' }}>
                  ({venue.reviewCount} đánh giá)
                </Typography.Text>
              </Space>

              <Divider orientation="vertical" />

              <Space size={6}>
                {allSports.map((sport) => (
                  <Tag key={sport} color="blue">
                    {SPORT_LABELS[sport] || sport}
                  </Tag>
                ))}
              </Space>
            </Space>

            {venue.description && (
              <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
                {venue.description}
              </Typography.Paragraph>
            )}
          </div>

          <Divider />

          {/* Danh sách sân con & Bảng giá tóm tắt */}
          <div style={{ marginBottom: 32 }}>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
              Bảng giá sân con
            </Typography.Title>

            <Table
              dataSource={venue.courts}
              rowKey="id"
              pagination={false}
              size="middle"
              columns={[
                {
                  title: 'Sân con',
                  dataIndex: 'name',
                  render: (name: string, record) => (
                    <Space orientation="vertical" size={2}>
                      <Typography.Text strong>{name}</Typography.Text>
                      <Tag color="cyan" style={{ fontSize: 11 }}>
                        {SPORT_LABELS[record.sport as Sport]}
                      </Tag>
                    </Space>
                  ),
                },
                {
                  title: 'Giá mặc định / giờ',
                  dataIndex: 'basePricePerHour',
                  render: (price: number) => (
                    <Typography.Text strong style={{ color: token.colorPrimary }}>
                      {formatCurrency(price)}
                    </Typography.Text>
                  ),
                },
                {
                  title: 'Khung giá đặc biệt',
                  key: 'priceRules',
                  render: (_: unknown, record) => (
                    <div>
                      {record.priceRules.length === 0 ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Áp dụng giá mặc định cả ngày
                        </Typography.Text>
                      ) : (
                        <Space orientation="vertical" size={2}>
                          {record.priceRules.map((rule) => (
                            <div key={rule.id} style={{ fontSize: 12 }}>
                              <Tag color={rule.dayType === 'WEEKEND' ? 'green' : 'orange'}>
                                {rule.dayType === 'WEEKEND' ? 'Cuối tuần' : 'Ngày thường'}
                              </Tag>
                              <span>
                                {formatMinute(rule.startMinute)}–{formatMinute(rule.endMinute)}: {formatCurrency(rule.pricePerHour)}/h
                              </span>
                            </div>
                          ))}
                        </Space>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>

          <Divider />

          {/* Khối Lưới lịch & Đặt sân (Placeholder cho Hiếu) */}
          <div style={{ marginBottom: 36 }}>
            <Typography.Title level={4}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              Lịch trống & Đặt sân
            </Typography.Title>
            <Card
              style={{
                background: token.colorFillAlter,
                border: `1px dashed ${token.colorBorder}`,
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
              {/* TODO(Lâm): nhúng component khi merge */}
              <div data-testid="court-week-schedule-placeholder">
                <Typography.Text strong style={{ fontSize: 15, display: 'block' }}>
                  Lưới đặt sân theo tuần (CourtWeekSchedule)
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Hiển thị các khung giờ trống và cho phép chọn khung để đặt trực tiếp.
                </Typography.Text>
              </div>
            </Card>
          </div>

          {/* Khối Đánh giá (Placeholder cho Dương) */}
          <div>
            <Typography.Title level={4}>
              <StarFilled style={{ marginRight: 8, color: token.colorWarning }} />
              Đánh giá từ khách hàng ({venue.reviewCount})
            </Typography.Title>
            <Card
              style={{
                background: token.colorFillAlter,
                border: `1px dashed ${token.colorBorder}`,
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
              {/* TODO(Lâm): nhúng component khi merge */}
              <div data-testid="venue-reviews-placeholder">
                <Typography.Text strong style={{ fontSize: 15, display: 'block' }}>
                  Đánh giá cụm sân (VenueReviews)
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Khách hàng sau khi hoàn thành đơn đặt sân có thể gửi nhận xét và chấm sao tại đây.
                </Typography.Text>
              </div>
            </Card>
          </div>
        </Col>

        {/* Cột phải (Sticky trên desktop): Thông tin liên hệ, Chính sách hủy, Giờ mở cửa, Bản đồ */}
        <Col xs={24} lg={9}>
          <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Thông tin liên hệ */}
            <Card title="Thông tin liên hệ & Vị trí" variant="borderless">
              <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                <Space align="start">
                  <EnvironmentOutlined style={{ color: token.colorPrimary, fontSize: 16, marginTop: 4 }} />
                  <div>
                    <Typography.Text strong style={{ display: 'block' }}>
                      Địa chỉ
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      {venue.address}, {venue.district}, {venue.city}
                    </Typography.Text>
                  </div>
                </Space>

                {venue.phone && (
                  <Space align="start">
                    <PhoneOutlined style={{ color: token.colorSuccess, fontSize: 16, marginTop: 4 }} />
                    <div>
                      <Typography.Text strong style={{ display: 'block' }}>
                        Điện thoại liên hệ
                      </Typography.Text>
                      <Typography.Link href={`tel:${venue.phone}`}>
                        {venue.phone}
                      </Typography.Link>
                    </div>
                  </Space>
                )}

                <Space align="start">
                  <UserOutlined style={{ color: token.colorPrimary, fontSize: 16, marginTop: 4 }} />
                  <div>
                    <Typography.Text strong style={{ display: 'block' }}>
                      Chủ sở hữu
                    </Typography.Text>
                    <Typography.Text type="secondary">{venue.owner.fullName}</Typography.Text>
                  </div>
                </Space>
              </Space>

              <Divider style={{ margin: '16px 0' }} />

              {/* Chính sách hủy */}
              <Alert
                message={`Hủy miễn phí trước giờ chơi ${venue.cancelBeforeHours} giờ`}
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 16 }}
              />

              {/* Bản đồ */}
              <div style={{ marginBottom: 12 }}>
                <VenueMap
                  latitude={venue.latitude}
                  longitude={venue.longitude}
                  name={venue.name}
                  address={venue.address}
                  height={220}
                />
              </div>

              {venue.latitude && venue.longitude && (
                <Button
                  type="default"
                  block
                  icon={<CompassOutlined />}
                  href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`}
                  target="_blank"
                >
                  Chỉ đường trên Google Maps
                </Button>
              )}
            </Card>

            {/* Giờ mở cửa */}
            <Card title="Giờ mở cửa trong tuần" variant="borderless">
              <Table
                dataSource={DISPLAY_DAYS.map((dayOfWeek) => {
                  const hour = venue.openingHours.find((h) => h.dayOfWeek === dayOfWeek);
                  return {
                    key: dayOfWeek,
                    day: DAY_NAMES[dayOfWeek],
                    hour,
                  };
                })}
                pagination={false}
                size="small"
                showHeader={false}
                columns={[
                  {
                    dataIndex: 'day',
                    render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
                  },
                  {
                    dataIndex: 'hour',
                    render: (hour?: { isClosed: boolean; openMinute: number; closeMinute: number }) => {
                      if (!hour || hour.isClosed) {
                        return <Tag color="default">Nghỉ</Tag>;
                      }
                      return (
                        <span>
                          {formatMinute(hour.openMinute)} – {formatMinute(hour.closeMinute)}
                        </span>
                      );
                    },
                  },
                ]}
              />
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default VenueDetailPage;
