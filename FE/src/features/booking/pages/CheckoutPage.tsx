import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Spin,
  Table,
  Typography,
  type TableColumnsType,
} from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { formatCurrency, formatDate } from '@/common/utils/format';
import {
  createBookingSchema,
  formatMinute,
  SPORT_LABELS,
  toVnParts,
  type CreateBookingInput,
  type PriceBreakdownItem,
} from '@sango/shared';
import { getErrorCode, getErrorMessage } from '@/common/api/errors';
import { useDocumentTitle } from '@/common/hooks/useDocumentTitle';
import { useMediaQuery } from '@/common/hooks/useMediaQuery';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { SportIcon } from '@/components/icons/SportIcon';
import styles from './CheckoutPage.module.css';
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

type CheckoutFormValues = Pick<CreateBookingInput, 'contactPhone' | 'note'>;
const contactSchema = createBookingSchema.innerType().pick({ contactPhone: true, note: true });

function formatSlotRange(startAt: string, endAt: string): string {
  const start = toVnParts(new Date(startAt));
  const end = toVnParts(new Date(endAt));
  const endMinute = end.minuteOfDay + (end.dateStr !== start.dateStr ? 1440 : 0);
  return `${formatMinute(start.minuteOfDay)} – ${formatMinute(endMinute)}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function PriceSlot({ item }: { item: PriceBreakdownItem }) {
  const interval = formatSlotRange(item.startAt, item.endAt);
  return (
    <div className={styles.priceSlot}>
      <span className="num">{interval}</span>
      {item.label && item.label !== interval && (
        <Typography.Text type="secondary">{item.label}</Typography.Text>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  useDocumentTitle('Xác nhận đặt sân');
  const { message } = App.useApp();
  const mobile = useMediaQuery('(max-width: 991px)');
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
  const mountedRef = useRef(false);

  useEffect(() => {
    holdIdRef.current = holdId;
  }, [holdId]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      contactPhone: currentUser?.phone ?? '',
      note: '',
    },
  });

  // Redirect nếu không có draft
  useEffect(() => {
    if (!bookingSucceededRef.current && (!draft.court || draft.slots.length === 0)) {
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

  // StrictMode replays setup/cleanup synchronously. Release only after a real exit.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const exitingHoldId = holdIdRef.current;
      queueMicrotask(() => {
        if (!mountedRef.current && exitingHoldId && !bookingSucceededRef.current) {
          void deleteHold(exitingHoldId);
        }
      });
    };
  }, [deleteHold]);

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
      const code = getErrorCode(err);
      if (code === 'HOLD_EXPIRED') {
        setHoldExpired(true);
        void message.error(
          'Giữ chỗ đã hết hạn hoặc không còn tồn tại. Vui lòng chọn lại khung giờ.',
        );
      } else if (code === 'SLOT_ALREADY_BOOKED') {
        void message.error('Khung giờ vừa bị đặt bởi người khác. Vui lòng chọn lại.');
      } else {
        void message.error(getErrorMessage(err));
      }
      if (
        code === 'HOLD_EXPIRED' ||
        code === 'SLOT_ALREADY_BOOKED' ||
        code === 'SLOT_UNAVAILABLE'
      ) {
        dispatch(availabilityApi.util.invalidateTags(['Availability']));
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
  const dateLabel = startVnParts ? formatDate(startVnParts.dateStr) : '';
  const timeLabel = draftRange ? formatSlotRange(draftRange.startAt, draftRange.endAt) : '';

  const breakdownColumns: TableColumnsType<PriceBreakdownItem> = [
    {
      title: 'Khung giờ',
      key: 'time',
      render: (_value: unknown, item) => <PriceSlot item={item} />,
    },
    {
      title: 'Giá thuê',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (v: number) => <span className="num">{formatCurrency(v)}</span>,
    },
  ];

  // PriceBreakdownItem: { startAt, endAt, price, label }
  const breakdownData = quote?.breakdown ?? slots;

  const displayTotal = quote?.total ?? draftTotal;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Xác nhận đặt sân"
        description="Kiểm tra lịch chơi và thông tin liên hệ trước khi xác nhận."
      />
      <div className={styles.sections}>
        <Section
          title="Thông tin sân"
          extra={<span className={styles.sportLabel}>{SPORT_LABELS[court.sport]}</span>}
        >
          <div className={styles.venue}>
            <span className={styles.sportIcon}>
              <SportIcon sport={court.sport} size={24} decorative />
            </span>
            <div className={styles.venueName}>
              <strong>{venue?.name}</strong>
              <span>Sân con: {court.name}</span>
            </div>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Ngày chơi</dt>
              <dd className="num">{dateLabel}</dd>
            </div>
            <div>
              <dt>Khung giờ</dt>
              <dd className="num">{timeLabel}</dd>
            </div>
            <div>
              <dt>Thời lượng</dt>
              <dd className="num">{slots.length} giờ</dd>
            </div>
          </dl>
        </Section>

        <Section
          title="Bảng giá"
          extra={isQuoting ? <Spin size="small" aria-label="Đang cập nhật giá" /> : undefined}
        >
          {mobile ? (
            <ul className={styles.priceList} aria-label="Giá thuê theo khung giờ">
              {breakdownData.map((item) => (
                <li key={item.startAt}>
                  <PriceSlot item={item} />
                  <span className="num">{formatCurrency(item.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Table<PriceBreakdownItem>
              className={`users-table ${styles.priceTable}`}
              dataSource={breakdownData}
              columns={breakdownColumns}
              pagination={false}
              rowKey="startAt"
              size="middle"
            />
          )}
          <div className={styles.total}>
            <span>Tổng cộng</span>
            <strong className="num">{formatCurrency(displayTotal)}</strong>
          </div>
        </Section>

        {holdExpiresAt && (
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
        )}

        <Section title="Thông tin liên hệ">
          <Form layout="vertical" onFinish={() => void handleSubmit(onSubmit)()}>
            <Form.Item
              label="Số điện thoại liên hệ"
              htmlFor="checkout-contact-phone"
              validateStatus={errors.contactPhone ? 'error' : ''}
              help={errors.contactPhone?.message}
              required
            >
              <Controller
                name="contactPhone"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="checkout-contact-phone" placeholder="0912345678" />
                )}
              />
            </Form.Item>
            <Form.Item
              label="Ghi chú"
              htmlFor="checkout-note"
              validateStatus={errors.note ? 'error' : ''}
              help={errors.note?.message}
            >
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    id="checkout-note"
                    rows={3}
                    placeholder="Yêu cầu đặc biệt (nếu có)..."
                  />
                )}
              />
            </Form.Item>
            <div className={styles.actions}>
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
            </div>
          </Form>
        </Section>
      </div>
    </div>
  );
}
