import { Alert, Button, Pagination, Select, Tabs } from 'antd';
import { AppstoreOutlined, CompassOutlined } from '@ant-design/icons';
import { SPORTS, type SearchVenuesQuery } from '@sango/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterField } from '@/components/forms/FilterField';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { useDebounce } from '@/common/hooks/useDebounce';
import { useGetLocationsQuery } from '@/features/owner-venues';
import { useGetVenuesQuery } from '../api/searchApi';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { SearchFilters, type SearchFilterValues } from '../components/SearchFilters';
import { SearchResults } from '../components/SearchResults';
import styles from './SearchPage.module.css';

const FILTER_DEFAULTS: SearchFilterValues = {
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

export default function SearchPage() {
  useDocumentTitle('Tìm sân thể thao');
  const [filters, setFilters, resetFilters] = useUrlFilters(FILTER_DEFAULTS);
  const keyword = useDebounce(filters.q?.trim() || undefined, 400);
  const locations = useGetLocationsQuery();
  const sort: SearchVenuesQuery['sort'] =
    filters.sort === 'newest' || filters.sort === 'name' ? filters.sort : 'rating';
  const query: Partial<SearchVenuesQuery> = {
    q: keyword,
    sport: SPORTS.find((sport) => sport === filters.sport),
    city: filters.city,
    district: filters.district,
    date: filters.date,
    from: filters.date ? filters.from : undefined,
    to: filters.date ? filters.to : undefined,
    sort,
    page: Number(filters.page) || 1,
    pageSize: Number(filters.pageSize) || 12,
  };
  const venues = useGetVenuesQuery(query);
  const renderResults = (view: 'list' | 'map') => (
    <SearchResults
      venues={venues.data?.items ?? []}
      date={filters.date}
      loading={venues.isLoading || venues.isFetching}
      error={venues.isError}
      view={view}
      onRetry={() => void venues.refetch()}
      onReset={resetFilters}
    />
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tìm sân thể thao"
        description="Chọn môn, khu vực và thời gian để tìm sân phù hợp với bạn."
      />
      <SearchFilters
        filters={filters}
        locations={locations.data ?? []}
        locationsLoading={locations.isLoading}
        onChange={setFilters}
        onReset={resetFilters}
      />
      {locations.isError && (
        <Alert
          type="warning"
          showIcon
          title="Chưa tải được khu vực. Bạn vẫn có thể tìm theo tên sân và môn thể thao."
          action={<Button onClick={() => void locations.refetch()}>Tải lại khu vực</Button>}
        />
      )}
      <section className={styles.results} aria-labelledby="search-results-title">
        <div className={styles.toolbar}>
          <div>
            <h2 id="search-results-title">Kết quả tìm kiếm</h2>
            <p aria-live="polite">
              {venues.isError
                ? 'Chưa tải được kết quả.'
                : venues.isFetching
                  ? 'Đang cập nhật danh sách sân…'
                  : venues.data
                    ? `Tìm thấy ${venues.data.total} cụm sân`
                    : 'Đang tìm sân…'}
            </p>
          </div>
          <FilterField className={styles.sort} htmlFor="search-sort" label="Sắp xếp">
            <Select
              id="search-sort"
              value={sort}
              size="large"
              onChange={(sort) => setFilters({ sort })}
              options={[
                { value: 'rating', label: 'Đánh giá cao nhất' },
                { value: 'newest', label: 'Mới nhất' },
                { value: 'name', label: 'Tên từ A đến Z' },
              ]}
            />
          </FilterField>
        </div>
        <Tabs
          className={styles.tabs}
          defaultActiveKey="list"
          items={[
            {
              key: 'list',
              label: 'Danh sách',
              icon: <AppstoreOutlined aria-hidden="true" />,
              children: renderResults('list'),
            },
            {
              key: 'map',
              label: 'Bản đồ',
              icon: <CompassOutlined aria-hidden="true" />,
              children: renderResults('map'),
            },
          ]}
        />
        {!venues.isError && venues.data && venues.data.total > venues.data.pageSize && (
          <div className={styles.pagination}>
            <Pagination
              current={venues.data.page}
              pageSize={venues.data.pageSize}
              total={venues.data.total}
              showSizeChanger={false}
              onChange={(page) => setFilters({ page: String(page) })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
