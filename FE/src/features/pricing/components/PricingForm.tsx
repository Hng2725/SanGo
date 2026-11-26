import React, { useMemo } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  formatMinute,
  pricingConfigSchema,
  type PricingConfigInput,
} from '@sango/shared';
import { formatCurrency } from '@/common/utils/format';
import { buildPriceTable } from '../utils/buildPriceTable';

export interface PricingFormProps {
  initialValues?: PricingConfigInput;
  onSubmit: (values: PricingConfigInput) => Promise<void>;
  loading?: boolean;
}

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => ({
  value: i * 60,
  label: i === 24 ? '24:00 (Hết ngày)' : formatMinute(i * 60),
}));

export const PricingForm: React.FC<PricingFormProps> = ({
  initialValues = { basePricePerHour: 150_000, rules: [] },
  onSubmit,
  loading = false,
}) => {
  const { token } = theme.useToken();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PricingConfigInput>({
    resolver: zodResolver(pricingConfigSchema),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rules',
  });

  const watchedBase = useWatch({ control, name: 'basePricePerHour' });
  const watchedRules = useWatch({ control, name: 'rules' });

  const priceTable = useMemo(() => {
    return buildPriceTable({
      basePricePerHour: watchedBase || 0,
      rules: watchedRules || [],
    });
  }, [watchedBase, watchedRules]);

  const handleAddGoldenHourPreset = () => {
    append({
      dayType: 'WEEKDAY',
      startMinute: 1020, // 17:00
      endMinute: 1260, // 21:00
      pricePerHour: (watchedBase || 150_000) + 50_000,
      label: 'Giờ vàng',
    });
  };

  const renderRuleRow = (index: number) => {
    const error = errors.rules?.[index];

    return (
      <Card
        key={fields[index].id}
        size="small"
        style={{
          marginBottom: 12,
          background: token.colorFillAlter,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={12} sm={6}>
            <Form.Item
              label="Bắt đầu"
              validateStatus={error?.startMinute ? 'error' : ''}
              help={error?.startMinute?.message}
              style={{ marginBottom: 0 }}
            >
              <Controller
                control={control}
                name={`rules.${index}.startMinute`}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={HOUR_OPTIONS.slice(0, 24)}
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>
          </Col>

          <Col xs={12} sm={6}>
            <Form.Item
              label="Kết thúc"
              validateStatus={error?.endMinute ? 'error' : ''}
              help={error?.endMinute?.message}
              style={{ marginBottom: 0 }}
            >
              <Controller
                control={control}
                name={`rules.${index}.endMinute`}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={HOUR_OPTIONS.slice(1)}
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>
          </Col>

          <Col xs={16} sm={6}>
            <Form.Item
              label="Giá / giờ (₫)"
              validateStatus={error?.pricePerHour ? 'error' : ''}
              help={error?.pricePerHour?.message}
              style={{ marginBottom: 0 }}
            >
              <Controller
                control={control}
                name={`rules.${index}.pricePerHour`}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    step={10_000}
                    min={10_000}
                    max={10_000_000}
                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    parser={(val) => (val ? Number(val.replace(/\./g, '')) : 0)}
                    style={{ width: '100%' }}
                  />
                )}
              />
            </Form.Item>
          </Col>

          <Col xs={18} sm={5}>
            <Form.Item
              label="Tên nhãn (tùy chọn)"
              validateStatus={error?.label ? 'error' : ''}
              help={error?.label?.message}
              style={{ marginBottom: 0 }}
            >
              <Controller
                control={control}
                name={`rules.${index}.label`}
                render={({ field }) => (
                  <Input {...field} value={field.value ?? ''} placeholder="vd: Giờ vàng" />
                )}
              />
            </Form.Item>
          </Col>

          <Col xs={6} sm={1} style={{ textAlign: 'right' }}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => remove(index)}
              title="Xóa khung giá này"
            />
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <Form layout="vertical" component="form" onSubmitCapture={handleSubmit(onSubmit)}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={15}>
          <Card title="Cấu hình bảng giá" variant="borderless">
            <Form.Item
              label="Giá thuê mặc định / giờ"
              validateStatus={errors.basePricePerHour ? 'error' : ''}
              help={errors.basePricePerHour?.message}
              tooltip="Giá áp dụng cho các khung giờ không thuộc quy tắc giá đặc biệt nào"
              required
            >
              <Controller
                control={control}
                name="basePricePerHour"
                render={({ field }) => (
                  <Space.Compact style={{ width: 280 }}>
                    <InputNumber
                      {...field}
                      step={10_000}
                      min={10_000}
                      max={10_000_000}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      parser={(val) => (val ? Number(val.replace(/\./g, '')) : 0)}
                      style={{ width: '100%' }}
                    />
                    <Button disabled>
                      ₫ / giờ
                    </Button>
                  </Space.Compact>
                )}
              />
            </Form.Item>

            <Divider />

            {/* Ngày thường */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Quy tắc Ngày thường (Thứ 2 – Thứ 6)
                </Typography.Title>
                <Space>
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    onClick={handleAddGoldenHourPreset}
                  >
                    Thêm giờ vàng 17:00–21:00
                  </Button>
                  <Button
                    size="small"
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      append({
                        dayType: 'WEEKDAY',
                        startMinute: 1020,
                        endMinute: 1260,
                        pricePerHour: (watchedBase || 150_000) + 30_000,
                        label: '',
                      })
                    }
                  >
                    Thêm khung
                  </Button>
                </Space>
              </div>

              {fields
                .map((field, idx) => ({ field, idx }))
                .filter(({ idx }) => watchedRules?.[idx]?.dayType === 'WEEKDAY')
                .map(({ idx }) => renderRuleRow(idx))}

              {fields.filter((_, idx) => watchedRules?.[idx]?.dayType === 'WEEKDAY').length ===
                0 && (
                <Typography.Text type="secondary" style={{ fontStyle: 'italic', display: 'block' }}>
                  Chưa có khung giá riêng cho ngày thường (áp dụng giá mặc định cả ngày).
                </Typography.Text>
              )}
            </div>

            <Divider />

            {/* Cuối tuần */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Quy tắc Cuối tuần (Thứ 7 & Chủ nhật)
                </Typography.Title>
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    append({
                      dayType: 'WEEKEND',
                      startMinute: 480,
                      endMinute: 1320,
                      pricePerHour: (watchedBase || 150_000) + 50_000,
                      label: 'Cuối tuần',
                    })
                  }
                >
                  Thêm khung cuối tuần
                </Button>
              </div>

              {fields
                .map((field, idx) => ({ field, idx }))
                .filter(({ idx }) => watchedRules?.[idx]?.dayType === 'WEEKEND')
                .map(({ idx }) => renderRuleRow(idx))}

              {fields.filter((_, idx) => watchedRules?.[idx]?.dayType === 'WEEKEND').length ===
                0 && (
                <Typography.Text type="secondary" style={{ fontStyle: 'italic', display: 'block' }}>
                  Chưa có khung giá riêng cho cuối tuần (áp dụng giá mặc định cả ngày).
                </Typography.Text>
              )}
            </div>

            <Button type="primary" htmlType="submit" loading={loading} style={{ marginTop: 12 }}>
              Lưu bảng giá
            </Button>
          </Card>
        </Col>

        {/* Cột xem trước realtime 24h */}
        <Col xs={24} lg={9}>
          <Card
            title="Xem trước bảng giá 24 giờ"
            variant="borderless"
            extra={<Typography.Text type="secondary">Cập nhật realtime</Typography.Text>}
          >
            <Table
              dataSource={priceTable}
              rowKey="minute"
              size="small"
              pagination={false}
              scroll={{ y: 520 }}
              columns={[
                {
                  title: 'Khung giờ',
                  dataIndex: 'minute',
                  width: 90,
                  render: (minute: number) => (
                    <Typography.Text strong style={{ fontSize: 12 }}>
                      {formatMinute(minute)}
                    </Typography.Text>
                  ),
                },
                {
                  title: 'Ngày thường',
                  dataIndex: 'weekday',
                  render: (price: number, record) => (
                    <div>
                      <div style={{ fontSize: 13 }}>{formatCurrency(price)}</div>
                      {record.weekdayLabel && (
                        <Tag color="orange" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                          {record.weekdayLabel}
                        </Tag>
                      )}
                    </div>
                  ),
                },
                {
                  title: 'Cuối tuần',
                  dataIndex: 'weekend',
                  render: (price: number, record) => (
                    <div>
                      <div style={{ fontSize: 13 }}>{formatCurrency(price)}</div>
                      {record.weekendLabel && (
                        <Tag color="green" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                          {record.weekendLabel}
                        </Tag>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Form>
  );
};

export default PricingForm;
