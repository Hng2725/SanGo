import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { ArrowRightOutlined, SearchOutlined } from '@ant-design/icons';
import { SPORTS, SPORT_LABELS, toVnParts, type Sport } from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { EmptyState } from '@/common/ui/EmptyState';
import { useGetLocationsQuery } from '@/features/owner-venues/api/ownerVenueApi';
import { VenueCard, useGetVenuesQuery } from '@/features/search';

export default function HomePage() {
  useDocumentTitle('Trang chủ');
  const navigate = useNavigate();

  const todayStr = toVnParts(new Date()).dateStr;
  const [sport, setSport] = useState<Sport | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [date, setDate] = useState<string>(todayStr);

  const { data: locations = [] } = useGetLocationsQuery();
  const { data: featuredData, isLoading: isFeaturedLoading } = useGetVenuesQuery({
    sort: 'rating',
    pageSize: 6,
  });

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (city) params.set('city', city);
    if (date) params.set('date', date);
    const qs = params.toString();
    navigate(qs ? `/venues?${qs}` : '/venues');
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 64px' }}>
      {/* Hero + Form tìm nhanh */}
      <Card
        style={{
          marginBottom: 40,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0958d9 0%, #1677ff 100%)',
          color: '#fff',
        }}
        styles={{ body: { padding: '40px 24px' } }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <Typography.Title level={1} style={{ color: '#fff', marginBottom: 12 }}>
            Tìm sân trống, đặt giờ chơi ngay
          </Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.88)', fontSize: 16, marginBottom: 28 }}>
            Tra cứu lịch trống theo thời gian thực, chọn khung giờ phù hợp và giữ chỗ nhanh chóng cho đội của bạn.
          </Typography.Paragraph>

          <Card style={{ borderRadius: 12, textAlign: 'left' }} styles={{ body: { padding: 16 } }}>
            <form onSubmit={handleQuickSearch}>
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} sm={8} md={7}>
                  <Select
                    allowClear
                    size="large"
                    placeholder="Chọn môn thể thao"
                    style={{ width: '100%' }}
                    value={sport}
                    onChange={(val) => setSport(val)}
                    options={SPORTS.map((s) => ({
                      value: s,
                      label: SPORT_LABELS[s],
                    }))}
                  />
                </Col>
                <Col xs={24} sm={8} md={7}>
                  <Select
                    allowClear
                    size="large"
                    placeholder="Chọn thành phố"
                    style={{ width: '100%' }}
                    value={city}
                    onChange={(val) => setCity(val)}
                    options={locations.map((loc) => ({
                      value: loc.city,
                      label: loc.city,
                    }))}
                  />
                </Col>
                <Col xs={24} sm={8} md={6}>
                  <Input
                    type="date"
                    size="large"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    aria-label="Ngày chơi"
                  />
                </Col>
                <Col xs={24} md={4}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<SearchOutlined />}
                    block
                  >
                    Tìm sân
                  </Button>
                </Col>
              </Row>
            </form>
          </Card>
        </div>
      </Card>

      {/* Lối tắt theo môn thể thao */}
      <div style={{ marginBottom: 44 }}>
        <Typography.Title level={3} style={{ marginBottom: 16 }}>
          Tìm theo môn thể thao
        </Typography.Title>
        <Row gutter={[12, 12]}>
          {SPORTS.map((s) => (
            <Col xs={12} sm={8} md={4} key={s}>
              <Link to={`/venues?sport=${s}`} style={{ textDecoration: 'none' }}>
                <Card
                  hoverable
                  style={{ textAlign: 'center', borderRadius: 10 }}
                  styles={{ body: { padding: '18px 12px' } }}
                >
                  <Typography.Text strong style={{ fontSize: 15 }}>
                    {SPORT_LABELS[s]}
                  </Typography.Text>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </div>

      {/* Khối Sân nổi bật */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Typography.Title level={3} style={{ margin: 0 }}>
            Sân nổi bật
          </Typography.Title>
          <Link to="/venues?sort=rating">
            <Space size={4}>
              <span>Xem tất cả</span>
              <ArrowRightOutlined />
            </Space>
          </Link>
        </div>

        {isFeaturedLoading ? (
          <Row gutter={[20, 20]}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Col xs={24} sm={12} lg={8} key={idx}>
                <Card>
                  <Skeleton.Image active style={{ width: '100%', height: 160, marginBottom: 16 }} />
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : !featuredData || featuredData.items.length === 0 ? (
          <Card>
            <EmptyState description="Chưa có cụm sân nổi bật nào." />
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {featuredData.items.map((venue) => (
              <Col xs={24} sm={12} lg={8} key={venue.id}>
                <VenueCard venue={venue} date={date} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
