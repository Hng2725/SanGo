import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Pagination,
  Row,
  Select,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  CompassOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  SPORTS,
  SPORT_LABELS,
  type SearchVenuesQuery,
  type Sport,
} from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { useDebounce } from '@/common/hooks/useDebounce';
import { EmptyState } from '@/common/ui/EmptyState';
import { useGetLocationsQuery } from '@/features/owner-venues/api/ownerVenueApi';
import { useGetVenuesQuery } from '../api/searchApi';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { VenueCard } from '../components/VenueCard';

type UrlFilterState = {
  q: string | undefined;
  sport: string | undefined;
  city: string | undefined;
  district: string | undefined;
  date: string | undefined;
  from: string | undefined;
  to: string | undefined;
  sort: string | undefined;
  page: string | undefined;
  pageSize: string | undefined;
};

const FILTER_DEFAULTS: UrlFilterState = {
  q: undefined,
  sport: undefined,
  city: undefined,
  district: undefined,
  date: undefined,
  from: undefined,
  to: undefined,
  sort: 'rating',
  page: '1',
  pageSize: '12',
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const label = `${String(h).padStart(2, '0')}:00`;
  return { value: label, label };
});

export const SearchPage: React.FC = () => {
  useDocumentTitle('Tìm sân thể thao');

  const [filters, setFilters, resetFilters] = useUrlFilters<UrlFilterState>(FILTER_DEFAULTS);
  const [keyword, setKeyword] = useState(filters.q ?? '');
  const debouncedKeyword = useDebounce(keyword, 400);

  useEffect(() => {
    setKeyword(filters.q ?? '');
  }, [filters.q]);

  useEffect(() => {
    const normalized = debouncedKeyword.trim() || undefined;
    if (normalized !== filters.q) {
      setFilters({ q: normalized });
    }
  }, [debouncedKeyword, filters.q, setFilters]);

  const { data: locations = [] } = useGetLocationsQuery();

  const cityOptions = useMemo(
    () => locations.map((loc) => ({ value: loc.city, label: loc.city })),
    [locations],
  );

  const districtOptions = useMemo(() => {
    if (!filters.city) return [];
    const found = locations.find((loc) => loc.city === filters.city);
    return found ? found.districts.map((d) => ({ value: d, label: d })) : [];
  }, [locations, filters.city]);

  const queryArgs = useMemo((): Partial<SearchVenuesQuery> => {
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 12;
    const sort = (filters.sort as SearchVenuesQuery['sort']) || 'rating';
    const sport =
      filters.sport && (SPORTS as readonly string[]).includes(filters.sport)
        ? (filters.sport as Sport)
        : undefined;

    const hasValidDate = Boolean(filters.date);
    const from = hasValidDate ? filters.from : undefined;
    const to = hasValidDate ? filters.to : undefined;

    return {
      q: filters.q,
      sport,
      city: filters.city,
      district: filters.district,
      date: filters.date,
      from,
      to,
      sort,
      page,
      pageSize,
    };
  }, [filters]);

  const { data, isLoading, isFetching } = useGetVenuesQuery(queryArgs);

  const handleSportToggle = (sport?: Sport) => {
    setFilters({ sport: filters.sport === sport ? undefined : sport });
  };

  const handleCityChange = (city?: string) => {
    setFilters({ city: city || undefined, district: undefined });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextDate = e.target.value || undefined;
    if (!nextDate) {
      setFilters({ date: undefined, from: undefined, to: undefined });
    } else {
      setFilters({ date: nextDate });
    }
  };

  const handleFromChange = (from?: string) => {
    if (from && filters.to && from >= filters.to) {
      setFilters({ from, to: undefined });
    } else {
      setFilters({ from: from || undefined });
    }
  };

  const handleToChange = (to?: string) => {
    setFilters({ to: to || undefined });
  };

  const handleReset = () => {
    setKeyword('');
    resetFilters();
  };

  const toHourOptions = useMemo(() => {
    if (!filters.from) return HOUR_OPTIONS;
    return HOUR_OPTIONS.filter((opt) => opt.value > filters.from!);
  }, [filters.from]);

  const listContent = (
    <>
      {isLoading || isFetching ? (
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
      ) : !data || data.items.length === 0 ? (
        <Card style={{ padding: '32px 0' }}>
          <EmptyState
            description="Không tìm thấy cụm sân nào khớp với bộ lọc hiện tại."
            action={
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleReset}>
                Xóa bộ lọc
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Row gutter={[20, 20]}>
            {data.items.map((venue) => (
              <Col xs={24} sm={12} lg={8} key={venue.id}>
                <VenueCard venue={venue} date={filters.date} />
              </Col>
            ))}
          </Row>

          {data.total > data.pageSize && (
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                current={data.page}
                pageSize={data.pageSize}
                total={data.total}
                showSizeChanger={false}
                onChange={(page) => setFilters({ page: String(page) })}
              />
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 64px' }}>
      <Typography.Title level={2} style={{ marginBottom: 16 }}>
        Tìm sân thể thao
      </Typography.Title>

      {/* Bộ lọc */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Môn thể thao (Chip) */}
          <div>
            <Typography.Text strong style={{ marginRight: 12 }}>
              Môn thể thao:
            </Typography.Text>
            <Space size={[8, 8]} wrap>
              <Tag.CheckableTag
                checked={!filters.sport}
                onChange={() => handleSportToggle(undefined)}
              >
                Tất cả
              </Tag.CheckableTag>
              {SPORTS.map((sport) => (
                <Tag.CheckableTag
                  key={sport}
                  checked={filters.sport === sport}
                  onChange={() => handleSportToggle(sport)}
                >
                  {SPORT_LABELS[sport]}
                </Tag.CheckableTag>
              ))}
            </Space>
          </div>

          {/* Hàng lọc: Từ khóa, Thành phố, Quận, Ngày, Giờ từ/đến, Sắp xếp */}
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Tên sân, địa chỉ..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </Col>

            <Col xs={12} sm={6} md={4}>
              <Select
                allowClear
                placeholder="Thành phố"
                style={{ width: '100%' }}
                value={filters.city}
                options={cityOptions}
                onChange={handleCityChange}
              />
            </Col>

            <Col xs={12} sm={6} md={4}>
              <Select
                allowClear
                placeholder="Quận / Huyện"
                style={{ width: '100%' }}
                disabled={!filters.city}
                value={filters.district}
                options={districtOptions}
                onChange={(district) => setFilters({ district: district || undefined })}
              />
            </Col>

            <Col xs={12} sm={8} md={4}>
              <Input
                type="date"
                value={filters.date ?? ''}
                onChange={handleDateChange}
                aria-label="Ngày chơi"
              />
            </Col>

            <Col xs={6} sm={4} md={2}>
              <Select
                allowClear
                placeholder="Giờ từ"
                style={{ width: '100%' }}
                disabled={!filters.date}
                value={filters.from}
                options={HOUR_OPTIONS}
                onChange={handleFromChange}
              />
            </Col>

            <Col xs={6} sm={4} md={2}>
              <Select
                allowClear
                placeholder="Giờ đến"
                style={{ width: '100%' }}
                disabled={!filters.date}
                value={filters.to}
                options={toHourOptions}
                onChange={handleToChange}
              />
            </Col>

            <Col xs={12} sm={8} md={2}>
              <Button block icon={<ReloadOutlined />} onClick={handleReset}>
                Đặt lại
              </Button>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Typography.Text type="secondary">
              {data ? `Tìm thấy ${data.total} cụm sân` : 'Đang tải danh sách sân...'}
            </Typography.Text>

            <Space size={8}>
              <Typography.Text type="secondary">Sắp xếp:</Typography.Text>
              <Select
                value={filters.sort ?? 'rating'}
                style={{ width: 160 }}
                onChange={(sort) => setFilters({ sort })}
                options={[
                  { value: 'rating', label: 'Đánh giá cao nhất' },
                  { value: 'newest', label: 'Mới nhất' },
                  { value: 'name', label: 'Tên A → Z' },
                ]}
              />
            </Space>
          </div>
        </Space>
      </Card>

      {/* Tabs Danh sách / Bản đồ */}
      <Tabs
        defaultActiveKey="list"
        items={[
          {
            key: 'list',
            label: (
              <span>
                <AppstoreOutlined /> Danh sách
              </span>
            ),
            children: listContent,
          },
          {
            key: 'map',
            label: (
              <span>
                <CompassOutlined /> Bản đồ
              </span>
            ),
            children: (
              <Card style={{ textAlign: 'center', padding: '48px 16px' }}>
                {/* TODO: nhúng VenuesMap của Lâm */}
                <Typography.Text type="secondary">
                  Chế độ xem bản đồ sẽ hiển thị vị trí các cụm sân trong trang hiện tại.
                </Typography.Text>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default SearchPage;
