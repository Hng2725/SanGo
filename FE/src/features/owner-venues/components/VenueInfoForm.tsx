import React from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Space,
  Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createVenueSchema,
  type CreateVenueInput,
} from '@sango/shared';
import type { z } from 'zod';
import { RHFInput, RHFTextArea } from '@/components/forms/RHFFields';

export interface VenueInfoFormProps {
  initialValues?: Partial<CreateVenueInput>;
  onSubmit: (values: CreateVenueInput) => Promise<void>;
  loading?: boolean;
  submitText?: string;
}

export const VenueInfoForm: React.FC<VenueInfoFormProps> = ({
  initialValues = {
    name: '',
    description: '',
    address: '',
    district: '',
    city: '',
    phone: '',
    imageUrls: [],
    cancelBeforeHours: 2,
    latitude: null,
    longitude: null,
  },
  onSubmit,
  loading = false,
  submitText = 'Lưu thông tin',
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof createVenueSchema>, unknown, CreateVenueInput>({
    resolver: zodResolver(createVenueSchema),
    defaultValues: {
      name: initialValues.name ?? '',
      description: initialValues.description ?? '',
      address: initialValues.address ?? '',
      district: initialValues.district ?? '',
      city: initialValues.city ?? '',
      phone: initialValues.phone ?? '',
      imageUrls: initialValues.imageUrls ?? [],
      cancelBeforeHours: initialValues.cancelBeforeHours ?? 2,
      latitude: initialValues.latitude ?? null,
      longitude: initialValues.longitude ?? null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'imageUrls' as never,
  });

  return (
    <Form layout="vertical" component="form" onSubmitCapture={handleSubmit(onSubmit)}>
      <Card title="Thông tin cơ bản cụm sân" variant="borderless">
        <Row gutter={[16, 0]}>
          <Col xs={24} md={16}>
            <RHFInput
              control={control}
              name="name"
              label="Tên cụm sân"
              placeholder="Ví dụ: CLB Bóng đá Hoa Lư"
            />
          </Col>
          <Col xs={24} md={8}>
            <RHFInput
              control={control}
              name="phone"
              label="Số điện thoại liên hệ"
              placeholder="0901234567"
            />
          </Col>
        </Row>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <RHFInput
              control={control}
              name="address"
              label="Địa chỉ chi tiết"
              placeholder="Số nhà, tên đường, phường..."
            />
          </Col>
          <Col xs={12} md={6}>
            <RHFInput
              control={control}
              name="district"
              label="Quận / Huyện"
              placeholder="Quận 1"
            />
          </Col>
          <Col xs={12} md={6}>
            <RHFInput
              control={control}
              name="city"
              label="Tỉnh / Thành phố"
              placeholder="TP. Hồ Chí Minh"
            />
          </Col>
        </Row>

        <RHFTextArea
          control={control}
          name="description"
          label="Mô tả cụm sân"
          placeholder="Giới thiệu về cơ sở vật chất, tiện ích (căn tin, bãi giữ xe, tắm nóng lạnh...)"
        />

        <Form.Item
          label="Chính sách hủy đơn (Số giờ tối thiểu trước giờ chơi)"
          tooltip="Khách hàng chỉ được hủy miễn phí trước giờ chơi đúng bằng hoặc nhiều hơn số giờ này"
          validateStatus={errors.cancelBeforeHours ? 'error' : ''}
          help={errors.cancelBeforeHours?.message}
          required
        >
          <Controller
            control={control}
            name="cancelBeforeHours"
            render={({ field }) => (
              <Space.Compact style={{ width: 200 }}>
                <InputNumber
                  {...field}
                  min={0}
                  max={72}
                  style={{ width: '100%' }}
                />
                <Button disabled>
                  giờ
                </Button>
              </Space.Compact>
            )}
          />
        </Form.Item>

        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Typography.Text strong>Hình ảnh sân (Tối đa 8 ảnh)</Typography.Text>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => append('https://' as never)}
              disabled={fields.length >= 8}
            >
              Thêm URL ảnh
            </Button>
          </div>

          {fields.map((field, idx) => (
            <Row gutter={[12, 12]} key={field.id} align="middle" style={{ marginBottom: 8 }}>
              <Col flex="auto">
                <Controller
                  control={control}
                  name={`imageUrls.${idx}`}
                  render={({ field: inputField }) => (
                    <Input {...inputField} placeholder="https://example.com/photo.jpg" />
                  )}
                />
              </Col>
              <Col>
                <Controller
                  control={control}
                  name={`imageUrls.${idx}`}
                  render={({ field: inputField }) =>
                    inputField.value ? (
                      <Image
                        src={inputField.value}
                        width={36}
                        height={36}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                        fallback="https://placehold.co/100x100?text=Error"
                      />
                    ) : (
                      <span />
                    )
                  }
                />
              </Col>
              <Col>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(idx)}
                />
              </Col>
            </Row>
          ))}
        </div>

        <Button type="primary" htmlType="submit" loading={loading} style={{ marginTop: 16 }}>
          {submitText}
        </Button>
      </Card>
    </Form>
  );
};

export default VenueInfoForm;
