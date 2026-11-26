import { useState, type FormEvent } from 'react';
import { Button, Input, Select } from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  SPORTS,
  SPORT_LABELS,
  type LocationDto,
  type SearchVenuesQuery,
  type Sport,
} from '@sango/shared';
import styles from './QuickSearchForm.module.css';
import { FilterField } from '@/components/forms/FilterField';

interface QuickSearchFormProps {
  date: string;
  onDateChange: (date: string) => void;
  locations: LocationDto[];
  locationsLoading?: boolean;
  onSearch: (filters: Partial<SearchVenuesQuery>) => void;
}

export function QuickSearchForm({
  date,
  onDateChange,
  locations,
  locationsLoading,
  onSearch,
}: QuickSearchFormProps) {
  const [sport, setSport] = useState<Sport>();
  const [city, setCity] = useState<string>();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch({ sport, city, date });
  };

  return (
    <form className={styles.form} aria-label="Tìm sân" onSubmit={submit}>
      <FilterField
        htmlFor="home-sport"
        label="Môn thể thao"
        icon={<AppstoreOutlined aria-hidden="true" />}
      >
        <Select<Sport>
          id="home-sport"
          allowClear
          size="large"
          placeholder="Tất cả các môn"
          value={sport}
          onChange={setSport}
          options={SPORTS.map((value) => ({ value, label: SPORT_LABELS[value] }))}
        />
      </FilterField>
      <FilterField
        htmlFor="home-city"
        label="Khu vực"
        icon={<EnvironmentOutlined aria-hidden="true" />}
      >
        <Select
          id="home-city"
          allowClear
          size="large"
          placeholder="Tất cả thành phố"
          value={city}
          onChange={setCity}
          loading={locationsLoading}
          options={locations.map(({ city }) => ({ value: city, label: city }))}
        />
      </FilterField>
      <FilterField
        htmlFor="home-date"
        label="Ngày chơi"
        icon={<CalendarOutlined aria-hidden="true" />}
      >
        <Input
          id="home-date"
          type="date"
          size="large"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </FilterField>
      <Button
        className={styles.submit}
        type="primary"
        htmlType="submit"
        size="large"
        icon={<SearchOutlined aria-hidden="true" />}
      >
        Tìm sân
      </Button>
    </form>
  );
}
