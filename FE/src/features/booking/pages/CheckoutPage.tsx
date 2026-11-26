import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Row,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { formatCurrency, formatDate } from '@/common/utils/format';
import { formatMinute, toVnParts } from '@sango/shared';
import {
  draftCleared,
  selectDraft,
  selectDraftHoldExpiresAt,
  selectDraftHoldId,
  selectDraftRange,
  selectDraftTotal,
} from '../model/bookingDraftSlice';
import { useCreateBookingMutation } from '../api/bookingApi';
import { useDeleteHoldMutation } from '../api/holdApi';
import { useQuotePriceMutation } from '@/features/pricing/api/pricingApi';
import { availabilityApi } from '@/features/availability/api/availabilityApi';
import { selectCurrentUser } from '@/features/auth/model/authSlice';

interface CheckoutFormValues {
  contactPhone: string;
  note?: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectDraft);
  const holdId = useAppSelector(selectDraftHoldId);
  const holdExpiresAt = useAppSelector(selectDraftHoldExpiresAt);
  const draftTotal = useAppSelector(selectDraftTotal);
  const draftRange = useAppSelector(selectDraftRange);
  const currentUser = useAppSelector(selectCurrentUser);

  const [createBooking, { isLoading: isBooking }] = useCreateBookingMutation();
  const [deleteHold] = useDeleteHoldMutation();
  const [quotePrice, { data: quote, isLoading: isQuoting }] = useQuotePriceMutation();

  const [countdown, setCountdown] = useState<number>(0);
  const [holdExpired, setHoldExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdIdRef = useRef<string | null>(holdId);
  const bookingSucceededRef = useRef(false);

  useEffect(() => {
    holdIdRef.current = holdId;
  }, [holdId]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    defaultValues: {
      contactPhone: currentUser?.phone ?? '',
      note: '',
    },
  });

  // Redirect nếu không có draft
  useEffect(() => {
    if (!draft.court || draft.slots.length === 0) {
      navigate(-1);
    }
  }, [draft, navigate]);

  // Quote price khi có đủ thông tin
  useEffect(() => {
    if (draft.court && draftRange) {
      quotePrice({
        courtId: draft.court.id,
        startAt: draftRange.startAt,
        endAt: draftRange.endAt,
      });
    }
  }, [draft.court, draftRange, quotePrice]);

  // Countdown hold
  useEffect(() => {
    if (!holdExpiresAt) return;

    const tick = () => {
      const remaining = new Date(holdExpiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setCountdown(0);
        setHoldExpired(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setCountdown(remaining);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [holdExpiresAt]);

  // Xóa hold khi rời trang (nếu chưa đặt thành công)
  useEffect(() => {
    return () => {
      if (holdIdRef.current && !bookingSucceededRef.current) {
        deleteHold(holdIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: CheckoutFormValues) => {
    if (!draft.court || !draftRange) return;

    try {
      const booking = await createBooking({
        courtId: draft.court.id,
        startAt: draftRange.startAt,
        endAt: draftRange.endAt,
        contactPhone: values.contactPhone,
        note: values.note || undefined,
        holdId: holdId ?? undefined,
      }).unwrap();

      bookingSucceededRef.current = true;
      dispatch(draftCleared());
      void message.success('Đã đặt sân');
      navigate(`/me/bookings/${booking.id}`);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: { code?: string } };
      if (apiErr?.status === 409) {
        void message.error('Khung giờ vừa bị đặt bởi người khác. Vui lòng chọn lại.');
        dispatch(availabilityApi.util.invalidateTags(['Availability']));
      } else {
        void message.error('Đặt sân thất bại. Vui lòng thử lại.');
      }
    }
  };

  const handleChooseAgain = () => {
    dispatch(availabilityApi.util.invalidateTags(['Availability']));
    navigate(-1);
  };

  if (!draft.court || draft.slots.length === 0) {
    return <Spin />;
  }

  const { venue, court, slots } = draft;

  const startVnParts = draftRange ? toVnParts(new Date(draftRange.startAt)) : null;
  const endVnParts = draftRange ? toVnParts(new Date(draftRange.endAt)) : null;
  const dateLabel = startVnParts ? formatDate(startVnParts.dateStr) : '';
  const timeLabel =
    startVnParts && endVnParts
      ? `${formatMinute(startVnParts.minuteOfDay)} – ${formatMinute(endVnParts.minuteOfDay)}`
      : '';

  const breakdownColumns = [
    { title: 'Khung giờ', dataIndex: 'label', key: 'label' },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'price',
      key: 'subtotal',
      render: (v: number) => formatCurrency(v),
    },
  ];

  // PriceBreakdownItem: { startAt, endAt, price, label }
  const breakdownData = quote?.breakdown ?? slots.map((s) => ({
    startAt: s.startAt,
    endAt: s.endAt,
    price: s.price,
    label: s.label ?? `${formatMinute(toVnParts(new Date(s.startAt)).minuteOfDay)} – ${formatMinute(toVnParts(new Date(s.endAt)).minuteOfDay)}`,
  }));

  const displayTotal = quote?.total ?? draftTotal;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <Typography.Title level={3}>Xác nhận đặt sân</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Thông tin sân">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Cụm sân">{venue?.name}</Descriptions.Item>
              <Descriptions.Item label="Sân con">{court.name}</Descriptions.Item>
              <Descriptions.Item label="Ngày">{dateLabel}</Descriptions.Item>
              <Descriptions.Item label="Giờ">{timeLabel}</Descriptions.Item>
              <Descriptions.Item label="Số khung">{slots.length} giờ</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Bảng giá" extra={isQuoting && <Spin size="small" />}>
            <Table
              dataSource={breakdownData}
              columns={breakdownColumns}
              pagination={false}
              rowKey="startAt"
              size="small"
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Typography.Text strong>Tổng cộng</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Typography.Text strong style={{ color: '#0958d9' }}>
                      {formatCurrency(displayTotal)}
                    </Typography.Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Col>

        {holdExpiresAt && (
          <Col span={24}>
            <Alert
              type={holdExpired ? 'error' : 'warning'}
              showIcon
              title={
                holdExpired
                  ? 'Thời gian giữ chỗ đã hết. Vui lòng chọn lại khung giờ.'
                  : `Thời gian giữ chỗ còn lại: ${formatCountdown(countdown)}`
              }
              data-testid="hold-countdown"
            />
          </Col>
        )}

        <Col span={24}>
          <Card title="Thông tin liên hệ">
            <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
              <Form.Item
                label="Số điện thoại liên hệ"
                validateStatus={errors.contactPhone ? 'error' : ''}
                help={errors.contactPhone?.message}
                required
              >
                <Controller
                  name="contactPhone"
                  control={control}
                  rules={{
                    required: 'Vui lòng nhập số điện thoại',
                    pattern: {
                      value: /^(0[3-9][0-9]{8}|(\+84)[3-9][0-9]{8})$/,
                      message: 'Số điện thoại Việt Nam không hợp lệ',
                    },
                  }}
                  render={({ field }) => (
                    <Input {...field} placeholder="0912345678" />
                  )}
                />
              </Form.Item>

              <Form.Item
                label="Ghi chú"
                validateStatus={errors.note ? 'error' : ''}
                help={errors.note?.message}
              >
                <Controller
                  name="note"
                  control={control}
                  rules={{ maxLength: { value: 500, message: 'Tối đa 500 ký tự' } }}
                  render={({ field }) => (
                    <Input.TextArea
                      {...field}
                      rows={3}
                      placeholder="Yêu cầu đặc biệt (nếu có)..."
                    />
                  )}
                />
              </Form.Item>

              <Divider />

              <Space wrap>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isBooking}
                  disabled={holdExpired}
                  data-testid="submit-booking"
                >
                  Xác nhận đặt sân
                </Button>
                <Button onClick={handleChooseAgain} data-testid="choose-again">
                  Chọn lại khung
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
