import React from 'react';
import { Space, Typography } from 'antd';
import { useAvailabilityGridContext } from './AvailabilityGridContext';

interface LegendItem {
  label: string;
  bg: string;
  border: string;
  striped?: boolean;
}

const CUSTOMER_ITEMS: LegendItem[] = [
  { label: 'Trống', bg: '#f6ffed', border: '#b7eb8f' },
  { label: 'Đang chọn', bg: '#1677ff', border: '#0958d9' },
  { label: 'Của bạn (giữ chỗ)', bg: '#e6f4ff', border: '#1677ff' },
  { label: 'Đang giữ', bg: '#fffbe6', border: '#ffe58f' },
  { label: 'Đã đặt', bg: '#fff1f0', border: '#ffa39e' },
  { label: 'Bảo trì', bg: '#f5f5f5', border: '#d9d9d9', striped: true },
  { label: 'Đã qua / Nghỉ', bg: '#fafafa', border: '#e8e8e8' },
];

const OWNER_ITEMS: LegendItem[] = [
  { label: 'Trống', bg: '#f6ffed', border: '#b7eb8f' },
  { label: 'Chờ xác nhận', bg: '#fff7e6', border: '#ffd591' },
  { label: 'Đã xác nhận', bg: '#e6f4ff', border: '#91caff' },
  { label: 'Hoàn thành', bg: '#f6ffed', border: '#73d13d' },
  { label: 'Đang giữ chỗ', bg: '#fffbe6', border: '#ffe58f' },
  { label: 'Bảo trì', bg: '#f5f5f5', border: '#d9d9d9', striped: true },
  { label: 'Đã qua / Nghỉ', bg: '#fafafa', border: '#e8e8e8' },
];

export const Legend: React.FC = () => {
  const { mode } = useAvailabilityGridContext();
  const items = mode === 'owner' ? OWNER_ITEMS : CUSTOMER_ITEMS;

  return (
    <Space wrap size={[12, 6]}>
      {items.map((item) => (
        <Space key={item.label} size={6} align="center">
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              borderRadius: 3,
              background: item.striped
                ? 'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 3px, #d9d9d9 3px, #d9d9d9 6px)'
                : item.bg,
              border: `1px solid ${item.border}`,
            }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.label}
          </Typography.Text>
        </Space>
      ))}
    </Space>
  );
};
