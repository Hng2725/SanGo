import React, { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  theme,
} from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import {
  formatMinute,
  openingHoursSchema,
  type OpeningHourDto,
  type OpeningHoursInput,
} from '@sango/shared';

export interface OpeningHoursFormProps {
  initialValues: OpeningHourDto[];
  onSubmit: (values: OpeningHoursInput) => Promise<void>;
  loading?: boolean;
}

const DAY_NAMES = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];

// Thứ tự hiển thị thân thiện: Thứ 2 -> CN
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const OPEN_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i * 60,
  label: formatMinute(i * 60),
}));

const CLOSE_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const minute = (i + 1) * 60;
  return {
    value: minute,
    label: formatMinute(minute),
  };
});

export const OpeningHoursForm: React.FC<OpeningHoursFormProps> = ({
  initialValues,
  onSubmit,
  loading = false,
}) => {
  const { token } = theme.useToken();
  // Chuẩn bị đủ 7 ngày 0..6
  const [hours, setHours] = useState<OpeningHoursInput>(() => {
    const map = new Map<number, OpeningHourDto>();
    initialValues.forEach((h) => map.set(h.dayOfWeek, h));

    return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const existing = map.get(dayOfWeek);
      return (
        existing ?? {
          dayOfWeek,
          isClosed: false,
          openMinute: 360, // 06:00
          closeMinute: 1320, // 22:00
        }
      );
    });
  });

  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  const handleUpdateRow = (
    dayOfWeek: number,
    patch: Partial<OpeningHoursInput[number]>,
  ) => {
    setHours((prev) =>
      prev.map((item) => (item.dayOfWeek === dayOfWeek ? { ...item, ...patch } : item)),
    );
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[dayOfWeek];
      return next;
    });
  };

  const handleApplyToAllWeek = () => {
    const monday = hours.find((h) => h.dayOfWeek === 1);
    if (!monday) return;

    setHours((prev) =>
      prev.map((item) => ({
        ...item,
        isClosed: monday.isClosed,
        openMinute: monday.openMinute,
        closeMinute: monday.closeMinute,
      })),
    );
    setRowErrors({});
  };

  const handleSubmit = async () => {
    const validation = openingHoursSchema.safeParse(hours);
    if (!validation.success) {
      const errs: Record<number, string> = {};
      for (const issue of validation.error.issues) {
        if (typeof issue.path[0] === 'number') {
          const index = issue.path[0];
          const dayOfWeek = hours[index]?.dayOfWeek;
          if (dayOfWeek !== undefined) {
            errs[dayOfWeek] = issue.message;
          }
        }
      }
      setRowErrors(errs);
      return;
    }

    setRowErrors({});
    await onSubmit(hours);
  };

  return (
    <Card
      title="Cấu hình giờ mở cửa"
      variant="borderless"
      extra={
        <Button
          icon={<CopyOutlined />}
          onClick={handleApplyToAllWeek}
          title="Sao chép giờ của Thứ 2 sang tất cả các ngày khác"
        >
          Áp dụng Thứ 2 cho cả tuần
        </Button>
      }
    >
      <Typography.Paragraph type="secondary">
        Hỗ trợ mở cửa qua nửa đêm (ví dụ: mở 18:00 đến 02:00 hôm sau). Giờ đóng cửa qua nửa đêm không
        được chồng vào ca mở cửa của ngày tiếp theo.
      </Typography.Paragraph>

      <Divider style={{ margin: '12px 0 20px' }} />

      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        {DISPLAY_ORDER.map((dayOfWeek) => {
          const current = hours.find((h) => h.dayOfWeek === dayOfWeek)!;
          const errorMsg = rowErrors[dayOfWeek];

          return (
            <div
              key={dayOfWeek}
              style={{
                padding: '12px 16px',
                background: current.isClosed
                  ? token.colorFillTertiary
                  : token.colorFillAlter,
                borderRadius: token.borderRadius,
                border: `1px solid ${errorMsg ? token.colorError : token.colorBorderSecondary}`,
              }}
            >
              <Row gutter={[16, 12]} align="middle">
                <Col xs={24} sm={4}>
                  <Typography.Text strong style={{ fontSize: 15 }}>
                    {DAY_NAMES[dayOfWeek]}
                  </Typography.Text>
                </Col>

                <Col xs={12} sm={4}>
                  <Space>
                    <Switch
                      checked={!current.isClosed}
                      onChange={(open) =>
                        handleUpdateRow(dayOfWeek, { isClosed: !open })
                      }
                    />
                    <Typography.Text type={current.isClosed ? 'secondary' : undefined}>
                      {current.isClosed ? 'Nghỉ' : 'Mở cửa'}
                    </Typography.Text>
                  </Space>
                </Col>

                {!current.isClosed ? (
                  <>
                    <Col xs={12} sm={8}>
                      <Form.Item label="Giờ mở" style={{ marginBottom: 0 }}>
                        <Select
                          value={current.openMinute}
                          onChange={(val) => handleUpdateRow(dayOfWeek, { openMinute: val })}
                          options={OPEN_OPTIONS}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={12} sm={8}>
                      <Form.Item label="Giờ đóng" style={{ marginBottom: 0 }}>
                        <Select
                          value={current.closeMinute}
                          onChange={(val) => handleUpdateRow(dayOfWeek, { closeMinute: val })}
                          options={CLOSE_OPTIONS}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </>
                ) : (
                  <Col xs={24} sm={16}>
                    <Typography.Text type="secondary" style={{ fontStyle: 'italic' }}>
                      Cụm sân đóng cửa cả ngày này
                    </Typography.Text>
                  </Col>
                )}
              </Row>

              {errorMsg && (
                <div style={{ color: token.colorError, fontSize: 13, marginTop: 8 }}>
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>
          );
        })}
      </Space>

      <Button
        type="primary"
        onClick={handleSubmit}
        loading={loading}
        style={{ marginTop: 24 }}
      >
        Lưu cấu hình giờ mở cửa
      </Button>
    </Card>
  );
};

export default OpeningHoursForm;
