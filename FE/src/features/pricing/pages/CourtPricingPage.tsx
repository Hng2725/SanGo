import React, { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { App, Button, Space } from 'antd';
import { ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons';
import type { PricingConfigInput } from '@sango/shared';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { FullPageSpinner } from '@/components/feedback/FullPageSpinner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { getErrorMessage } from '@/common/api/errors';
import {
  useCopyPricingMutation,
  useGetPricingQuery,
  useUpdatePricingMutation,
} from '../api/pricingApi';
import { PricingForm } from '../components/PricingForm';
import { CopyPricingModal } from '../components/CopyPricingModal';
import styles from './CourtPricingPage.module.css';

export const CourtPricingPage: React.FC = () => {
  const { courtId = '' } = useParams<{ courtId: string }>();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  const { data: pricing, isLoading, isError, refetch } = useGetPricingQuery(courtId);
  const [updatePricing, { isLoading: isUpdating }] = useUpdatePricingMutation();
  const [copyPricing, { isLoading: isCopying }] = useCopyPricingMutation();

  useDocumentTitle('Cấu hình bảng giá sân – SanGo');

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isError || !pricing) {
    return (
      <ErrorState
        title="Không tìm thấy thông tin bảng giá"
        description="Không thể tải dữ liệu bảng giá của sân này."
        actions={
          <Button type="primary" onClick={() => refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const handleSubmit = async (values: PricingConfigInput) => {
    try {
      await updatePricing({ courtId, body: values }).unwrap();
      message.success('Đã cập nhật bảng giá thành công');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
      throw error;
    }
  };

  const handleCopy = async (targetCourtIds: string[]) => {
    try {
      await copyPricing({ courtId, targetCourtIds }).unwrap();
      message.success('Đã sao chép bảng giá thành công');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
      throw error;
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Cấu hình bảng giá"
        description="Thiết lập giá thuê sân theo giờ cho ngày thường và cuối tuần"
        extra={
          <Space wrap className={styles.actions}>
            <Link to="/owner/venues">
              <Button icon={<ArrowLeftOutlined />}>Quay lại danh sách</Button>
            </Link>
            <Button
              icon={<CopyOutlined />}
              onClick={() => setCopyModalOpen(true)}
            >
              Sao chép sang sân khác
            </Button>
          </Space>
        }
      />

      <PricingForm
        initialValues={{
          basePricePerHour: pricing.basePricePerHour,
          rules: pricing.rules.map((r) => ({
            dayType: r.dayType,
            startMinute: r.startMinute,
            endMinute: r.endMinute,
            pricePerHour: r.pricePerHour,
            label: r.label,
          })),
        }}
        onSubmit={handleSubmit}
        loading={isUpdating}
      />

      <CopyPricingModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        sourceCourtId={courtId}
        initialVenueId={searchParams.get('venueId') ?? undefined}
        onCopy={handleCopy}
        loading={isCopying}
      />
    </div>
  );
};

export default CourtPricingPage;
