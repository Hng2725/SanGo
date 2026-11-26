import { Button, Input, Select } from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { SPORTS, SPORT_LABELS, type LocationDto } from '@sango/shared';
import { FilterField } from '@/components/forms/FilterField';
import { SportIcon } from '@/components/icons/SportIcon';
import styles from './SearchFilters.module.css';

export type SearchFilterValues = {
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

interface SearchFiltersProps {
  filters: SearchFilterValues;
  locations: LocationDto[];
  locationsLoading?: boolean;
  onChange: (patch: Partial<SearchFilterValues>) => void;
  onReset: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, '0')}:00`;
  return { value, label: value };
});

export function SearchFilters({
  filters,
  locations,
  locationsLoading,
  onChange,
  onReset,
}: SearchFiltersProps) {
  const districts = locations.find((location) => location.city === filters.city)?.districts ?? [];
  const toHours = HOURS.filter(({ value }) => !filters.from || value > filters.from);

  return (
    <section className={styles.panel} role="search" aria-label="Bộ lọc tìm sân">
      <div className={styles.heading}>
        <h2>Bộ lọc tìm sân</h2>
        <Button icon={<ReloadOutlined aria-hidden="true" />} onClick={onReset}>
          Đặt lại
        </Button>
      </div>
      <div className={styles.sports} role="group" aria-label="Môn thể thao">
        <Button
          className={styles.sportButton}
          aria-pressed={!filters.sport}
          icon={<AppstoreOutlined aria-hidden="true" />}
          onClick={() => onChange({ sport: undefined })}
        >
          Tất cả
        </Button>
        {SPORTS.map((sport) => (
          <Button
            key={sport}
            className={styles.sportButton}
            aria-pressed={filters.sport === sport}
            icon={<SportIcon sport={sport} size={20} decorative />}
            onClick={() => onChange({ sport: filters.sport === sport ? undefined : sport })}
          >
            {SPORT_LABELS[sport]}
          </Button>
        ))}
      </div>
      <div className={styles.grid}>
        <FilterField
          htmlFor="search-keyword"
          label="Tên sân hoặc địa chỉ"
          icon={<SearchOutlined aria-hidden="true" />}
          className={styles.keyword}
        >
          <Input
            id="search-keyword"
            size="large"
            allowClear
            placeholder="Nhập tên sân, địa chỉ…"
            value={filters.q ?? ''}
            maxLength={200}
            onChange={(event) => onChange({ q: event.target.value || undefined })}
          />
        </FilterField>
        <FilterField
          htmlFor="search-city"
          label="Thành phố"
          icon={<EnvironmentOutlined aria-hidden="true" />}
          className={styles.location}
        >
          <Select
            id="search-city"
            size="large"
            allowClear
            placeholder="Tất cả thành phố"
            loading={locationsLoading}
            value={filters.city}
            options={locations.map(({ city }) => ({ value: city, label: city }))}
            onChange={(city) => onChange({ city, district: undefined })}
          />
        </FilterField>
        <FilterField
          htmlFor="search-district"
          label="Quận / huyện"
          icon={<EnvironmentOutlined aria-hidden="true" />}
          className={styles.location}
        >
          <Select
            id="search-district"
            size="large"
            allowClear
            placeholder={filters.city ? 'Tất cả quận / huyện' : 'Chọn thành phố trước'}
            disabled={!filters.city}
            value={filters.district}
            options={districts.map((district) => ({ value: district, label: district }))}
            onChange={(district) => onChange({ district })}
          />
        </FilterField>
        <FilterField
          htmlFor="search-date"
          label="Ngày chơi"
          icon={<CalendarOutlined aria-hidden="true" />}
          className={styles.date}
        >
          <Input
            id="search-date"
            type="date"
            size="large"
            value={filters.date ?? ''}
            onChange={(event) =>
              onChange(
                event.target.value
                  ? { date: event.target.value }
                  : { date: undefined, from: undefined, to: undefined },
              )
            }
          />
        </FilterField>
        <FilterField
          htmlFor="search-from"
          label="Từ giờ"
          icon={<ClockCircleOutlined aria-hidden="true" />}
        >
          <Select
            id="search-from"
            size="large"
            allowClear
            placeholder="Chọn giờ"
            disabled={!filters.date}
            value={filters.from}
            options={HOURS}
            onChange={(from: string | undefined) =>
              onChange(
                from && filters.to && from >= filters.to ? { from, to: undefined } : { from },
              )
            }
          />
        </FilterField>
        <FilterField
          htmlFor="search-to"
          label="Đến giờ"
          icon={<ClockCircleOutlined aria-hidden="true" />}
        >
          <Select
            id="search-to"
            size="large"
            allowClear
            placeholder="Chọn giờ"
            disabled={!filters.date}
            value={filters.to}
            options={toHours}
            onChange={(to) => onChange({ to })}
          />
        </FilterField>
      </div>
      <p className={styles.note}>
        {filters.date
          ? 'Khung giờ hiển thị theo giờ Việt Nam.'
          : 'Chọn ngày chơi để tìm sân theo khung giờ.'}
      </p>
    </section>
  );
}
