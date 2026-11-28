import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { App, Button, Card, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { CreateVenueInput, OpeningHoursInput, UpdateVenueInput } from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { getErrorMessage } from '@/common/api/errors';
import { PageHeader } from '@/components/layout/PageHeader';
import { FullPageSpinner } from '@/components/feedback/FullPageSpinner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LocationPicker } from '@/features/map';
import {
  useCreateOwnerVenueMutation,
  useGetOwnerVenueQuery,
  useReplaceOpeningHoursMutation,
  useUpdateOwnerVenueMutation,
} from '../api/ownerVenueApi';
import { VenueInfoForm } from '../components/VenueInfoForm';
import { CourtsManager } from '../components/CourtsManager';
import { OpeningHoursForm } from '../components/OpeningHoursForm';
import styles from './VenueEditorPage.module.css';

export const VenueEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { message } = App.useApp();

  useDocumentTitle(isNew ? 'Thêm cụm sân mới – SanGo' : 'Quản lý cụm sân – SanGo');

  const {
    data: venue,
    isLoading: isVenueLoading,
    isError,
    refetch,
  } = useGetOwnerVenueQuery(id ?? '', { skip: isNew });

  const [createVenue, { isLoading: isCreating }] = useCreateOwnerVenueMutation();
  const [updateVenue, { isLoading: isUpdating }] = useUpdateOwnerVenueMutation();
  const [replaceHours, { isLoading: isReplacingHours }] = useReplaceOpeningHoursMutation();

  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  if (!isNew && isVenueLoading) {
    return <FullPageSpinner />;
  }

  if (!isNew && (isError || !venue)) {
    return (
      <ErrorState
        title="Không tìm thấy cụm sân"
        description="Cụm sân này không tồn tại hoặc bạn không có quyền truy cập."
        actions={
          <Button type="primary" onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const handleInfoSubmit = async (values: CreateVenueInput) => {
    try {
      if (isNew) {
        const created = await createVenue(values).unwrap();
        message.success(
          'Đã tạo cụm sân thành công! Bạn có thể tiếp tục thêm sân con và chỉnh giờ mở cửa.',
        );
        navigate(`/owner/venues/${created.id}`, { replace: true });
      } else {
        if (!venue) return;
        const body: UpdateVenueInput = { ...values };
        // Coordinates are saved independently from the map tab.
        delete body.latitude;
        delete body.longitude;
        await updateVenue({ id: venue.id, body }).unwrap();
        message.success('Đã lưu thông tin cụm sân thành công');
      }
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    }
  };

  const handleOpeningHoursSubmit = async (values: OpeningHoursInput) => {
    if (!venue) return;
    try {
      await replaceHours({ venueId: venue.id, body: values }).unwrap();
      message.success('Đã cập nhật giờ mở cửa của cụm sân');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    }
  };

  const handleSaveLocation = async () => {
    if (!venue) return;
    if (!locationCoords) {
      message.warning('Vui lòng chọn một điểm trên bản đồ');
      return;
    }
    try {
      await updateVenue({
        id: venue.id,
        body: {
          latitude: locationCoords.lat,
          longitude: locationCoords.lng,
        },
      }).unwrap();
      message.success('Đã cập nhật tọa độ vị trí sân thành công');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    }
  };

  const tabsItems = [
    {
      key: 'info',
      label: 'Thông tin chung',
      children: (
        <VenueInfoForm
          initialValues={
            venue
              ? {
                  name: venue.name,
                  description: venue.description,
                  address: venue.address,
                  district: venue.district,
                  city: venue.city,
                  phone: venue.phone,
                  cancelBeforeHours: venue.cancelBeforeHours,
                  imageUrls: venue.imageUrls,
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                }
              : undefined
          }
          onSubmit={handleInfoSubmit}
          loading={isCreating || isUpdating}
          submitText={isNew ? 'Tạo cụm sân' : 'Lưu thay đổi'}
        />
      ),
    },
    {
      key: 'courts',
      label: `Sân con (${venue?.courts.length ?? 0})`,
      disabled: isNew,
      children: venue ? <CourtsManager venueId={venue.id} courts={venue.courts} /> : null,
    },
    {
      key: 'hours',
      label: 'Giờ mở cửa',
      disabled: isNew,
      children: venue ? (
        <OpeningHoursForm
          initialValues={venue.openingHours}
          onSubmit={handleOpeningHoursSubmit}
          loading={isReplacingHours}
        />
      ) : null,
    },
    {
      key: 'location',
      label: 'Vị trí bản đồ',
      disabled: isNew,
      children: (
        <Card title="Định vị cụm sân trên bản đồ" variant="borderless">
          <LocationPicker
            value={
              locationCoords ??
              (venue?.latitude != null && venue?.longitude != null
                ? { lat: venue.latitude, lng: venue.longitude }
                : null)
            }
            onChange={(coords) => setLocationCoords(coords)}
            height={420}
          />
          <Button
            type="primary"
            onClick={handleSaveLocation}
            loading={isUpdating}
            style={{ marginTop: 16 }}
            disabled={!locationCoords}
          >
            Lưu tọa độ vị trí
          </Button>
        </Card>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={isNew ? 'Thêm cụm sân mới' : (venue?.name ?? 'Quản lý cụm sân')}
        description={
          isNew
            ? 'Nhập các thông tin cơ bản để khởi tạo cụm sân'
            : `${venue?.address}, ${venue?.district}, ${venue?.city}`
        }
        extra={
          <Link to="/owner/venues">
            <Button icon={<ArrowLeftOutlined />}>Quay lại danh sách</Button>
          </Link>
        }
      />

      <Tabs items={tabsItems} defaultActiveKey="info" type="card" />
    </div>
  );
};

export default VenueEditorPage;
