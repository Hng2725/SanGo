import React, { useState } from 'react';
import { Alert, App, Checkbox, Form, Modal, Select, Spin, Typography } from 'antd';
import {
  useGetOwnerVenueQuery,
  useListOwnerVenuesQuery,
} from '@/features/owner-venues/api/ownerVenueApi';

export interface CopyPricingModalProps {
  open: boolean;
  onClose: () => void;
  sourceCourtId: string;
  initialVenueId?: string;
  onCopy: (targetCourtIds: string[]) => Promise<void>;
  loading?: boolean;
}

export const CopyPricingModal: React.FC<CopyPricingModalProps> = ({
  open,
  onClose,
  sourceCourtId,
  initialVenueId,
  onCopy,
  loading = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { message } = App.useApp();
  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueId);
  const {
    data: venues = [],
    isLoading: isVenuesLoading,
    isError: isVenuesError,
  } = useListOwnerVenuesQuery(undefined, { skip: !open });
  const venueId = selectedVenueId ?? venues[0]?.id;
  const {
    data: venue,
    isFetching: isVenueLoading,
    isError: isVenueError,
  } = useGetOwnerVenueQuery(venueId ?? '', { skip: !open || !venueId });
  const availableCourts = venue && venue.id === venueId ? venue.courts : [];

  const selectableCourts = availableCourts.filter((c) => c.id !== sourceCourtId);

  const handleOk = async () => {
    if (selectedIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất một sân để sao chép bảng giá');
      return;
    }
    try {
      await onCopy(selectedIds);
      setSelectedIds([]);
      onClose();
    } catch {
      // The parent displays the API error. Keep the selection available for retry.
    }
  };

  return (
    <Modal
      title="Sao chép bảng giá sang sân khác"
      open={open}
      onCancel={() => {
        setSelectedIds([]);
        onClose();
      }}
      onOk={handleOk}
      confirmLoading={loading}
      okButtonProps={{ disabled: selectedIds.length === 0 || isVenueLoading || isVenueError }}
      okText="Sao chép"
      cancelText="Hủy"
    >
      <Typography.Paragraph type="secondary">
        Bảng giá của sân hiện tại (giá mặc định và các khung giờ đặc biệt) sẽ được áp dụng đè lên
        các sân con bạn chọn bên dưới.
      </Typography.Paragraph>

      <Form layout="vertical">
        <Form.Item label="Cụm sân">
          <Select
            aria-label="Cụm sân"
            value={venueId}
            options={venues.map(({ id, name }) => ({ value: id, label: name }))}
            loading={isVenuesLoading}
            onChange={(id: string) => {
              setSelectedVenueId(id);
              setSelectedIds([]);
            }}
          />
        </Form.Item>
      </Form>
      {(isVenuesError || isVenueError) && (
        <Alert
          type="error"
          showIcon
          title="Không tải được danh sách sân. Hãy đóng và mở lại hộp thoại."
        />
      )}

      {isVenueLoading ? (
        <Spin />
      ) : selectableCourts.length === 0 ? (
        <Typography.Text type="secondary" style={{ fontStyle: 'italic' }}>
          Không có sân con nào khác trong cụm này để sao chép.
        </Typography.Text>
      ) : (
        <Checkbox.Group
          value={selectedIds}
          onChange={(values) => setSelectedIds(values as string[])}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}
        >
          {selectableCourts.map((court) => (
            <Checkbox key={court.id} value={court.id}>
              {court.name}
            </Checkbox>
          ))}
        </Checkbox.Group>
      )}
    </Modal>
  );
};

export default CopyPricingModal;
