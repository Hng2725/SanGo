import React, { useState } from 'react';
import { Checkbox, Modal, Typography, message } from 'antd';

export interface CopyPricingModalProps {
  open: boolean;
  onClose: () => void;
  sourceCourtId: string;
  availableCourts: { id: string; name: string }[];
  onCopy: (targetCourtIds: string[]) => Promise<void>;
  loading?: boolean;
}

export const CopyPricingModal: React.FC<CopyPricingModalProps> = ({
  open,
  onClose,
  sourceCourtId,
  availableCourts,
  onCopy,
  loading = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectableCourts = availableCourts.filter((c) => c.id !== sourceCourtId);

  const handleOk = async () => {
    if (selectedIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất một sân để sao chép bảng giá');
      return;
    }
    await onCopy(selectedIds);
    setSelectedIds([]);
    onClose();
  };

  return (
    <Modal
      title="Sao chép bảng giá sang sân khác"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Sao chép"
      cancelText="Hủy"
    >
      <Typography.Paragraph type="secondary">
        Bảng giá của sân hiện tại (giá mặc định và các khung giờ đặc biệt) sẽ được áp dụng đè lên các
        sân con bạn chọn bên dưới.
      </Typography.Paragraph>

      {selectableCourts.length === 0 ? (
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
