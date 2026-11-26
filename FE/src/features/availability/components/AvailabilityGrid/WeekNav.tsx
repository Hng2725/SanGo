import React from 'react';
import { Button, Space, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { addDaysToDateStr, startOfWeekDateStr, toVnParts } from '@sango/shared';
import { formatDate } from '@/common/utils/format';
import { useAvailabilityGridContext } from './AvailabilityGridContext';

export interface WeekNavProps {
  weekStart: string;
  onChange: (newWeekStart: string) => void;
}

export const WeekNav: React.FC<WeekNavProps> = ({ weekStart, onChange }) => {
  const { mode } = useAvailabilityGridContext();

  const currentWeekMonday = startOfWeekDateStr(toVnParts(new Date()).dateStr);
  const weekEnd = addDaysToDateStr(weekStart, 6);

  // Mode customer không cho lùi về tuần đã qua
  const canGoPrev = mode === 'owner' || weekStart > currentWeekMonday;

  const handlePrev = () => {
    if (!canGoPrev) return;
    onChange(addDaysToDateStr(weekStart, -7));
  };

  const handleToday = () => {
    onChange(currentWeekMonday);
  };

  const handleNext = () => {
    onChange(addDaysToDateStr(weekStart, 7));
  };

  return (
    <Space wrap size="small" align="center">
      <Button
        icon={<LeftOutlined />}
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Tuần trước"
      >
        Tuần trước
      </Button>
      <Button onClick={handleToday}>Hôm nay</Button>
      <Button
        onClick={handleNext}
        aria-label="Tuần sau"
      >
        Tuần sau <RightOutlined />
      </Button>
      <Typography.Text strong style={{ marginLeft: 8 }}>
        {formatDate(weekStart)} – {formatDate(weekEnd)}
      </Typography.Text>
    </Space>
  );
};
