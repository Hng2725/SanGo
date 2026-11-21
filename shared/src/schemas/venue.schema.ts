import { z } from 'zod';
import { SPORTS } from '../constants/sports';
import { phoneVnSchema } from './common.schema';

const latLngRefine = (data: { latitude?: number | null; longitude?: number | null }) =>
  (data.latitude == null && data.longitude == null) ||
  (data.latitude != null && data.longitude != null);

const latLngIssue = {
  path: ['latitude'],
  message: 'Kinh độ và vĩ độ phải cùng có hoặc cùng để trống',
};

export const baseVenueSchema = z.object({
  name: z.string().trim().min(3, 'Tên cụm sân từ 3 đến 100 ký tự').max(100, 'Tên cụm sân từ 3 đến 100 ký tự'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự').optional().nullable(),
  address: z.string().trim().min(5, 'Địa chỉ từ 5 đến 200 ký tự').max(200, 'Địa chỉ từ 5 đến 200 ký tự'),
  district: z.string().trim().min(1, 'Quận/Huyện không được để trống').max(100),
  city: z.string().trim().min(1, 'Tỉnh/Thành phố không được để trống').max(100),
  phone: phoneVnSchema.optional().nullable(),
  imageUrls: z.array(z.string().url('URL ảnh không hợp lệ')).max(8, 'Tối đa 8 ảnh').default([]),
  latitude: z.number().min(-90, 'Vĩ độ từ -90 đến 90').max(90, 'Vĩ độ từ -90 đến 90').optional().nullable(),
  longitude: z.number().min(-180, 'Kinh độ từ -180 đến 180').max(180, 'Kinh độ từ -180 đến 180').optional().nullable(),
  cancelBeforeHours: z.number().int().min(0, 'Số giờ hủy từ 0 đến 72').max(72, 'Số giờ hủy từ 0 đến 72').default(2),
});

export const createVenueSchema = baseVenueSchema.refine(latLngRefine, latLngIssue);
export type CreateVenueInput = z.infer<typeof createVenueSchema>;

export const updateVenueSchema = baseVenueSchema.partial().refine(latLngRefine, latLngIssue);
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;

export const openingHourSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openMinute: z.number().int().min(0).max(1380).multipleOf(60),
    closeMinute: z.number().int().min(60).max(1800).multipleOf(60),
  })
  .refine((data) => data.isClosed || data.closeMinute - data.openMinute >= 60, {
    path: ['closeMinute'],
    message: 'Giờ đóng cửa phải sau giờ mở cửa ít nhất 60 phút',
  });

export type OpeningHourInput = z.infer<typeof openingHourSchema>;

export const openingHoursSchema = z
  .array(openingHourSchema)
  .length(7, 'Phải có đủ cấu hình cho 7 ngày trong tuần')
  .superRefine((hours, ctx) => {
    const days = new Set<number>();
    for (let i = 0; i < hours.length; i++) {
      if (days.has(hours[i].dayOfWeek)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i, 'dayOfWeek'],
          message: 'Trùng lặp thứ trong tuần',
        });
      }
      days.add(hours[i].dayOfWeek);
    }

    if (days.size !== 7) return;

    const dayMap = new Map<number, { hour: OpeningHourInput; index: number }>();
    hours.forEach((hour, index) => dayMap.set(hour.dayOfWeek, { hour, index }));

    for (const [dayOfWeek, { hour, index }] of dayMap.entries()) {
      if (hour.isClosed) continue;
      if (hour.closeMinute > 1440) {
        const nextDayOfWeek = (dayOfWeek + 1) % 7;
        const nextDayEntry = dayMap.get(nextDayOfWeek);
        if (!nextDayEntry || nextDayEntry.hour.isClosed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'closeMinute'],
            message: 'Không thể mở cửa qua nửa đêm sang ngày nghỉ tiếp theo',
          });
        } else {
          const overnightMinutes = hour.closeMinute - 1440;
          if (overnightMinutes > nextDayEntry.hour.openMinute) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, 'closeMinute'],
              message: 'Giờ đóng cửa qua nửa đêm chồng vào ca mở cửa của ngày kế tiếp',
            });
          }
        }
      }
    }
  });

export type OpeningHoursInput = z.infer<typeof openingHoursSchema>;

export const createCourtSchema = z.object({
  name: z.string().trim().min(1, 'Tên sân con từ 1 đến 50 ký tự').max(50, 'Tên sân con từ 1 đến 50 ký tự'),
  sport: z.enum(SPORTS),
  basePricePerHour: z
    .number()
    .int()
    .min(10_000, 'Giá tối thiểu 10.000 ₫')
    .max(10_000_000, 'Giá tối đa 10.000.000 ₫')
    .multipleOf(1_000, 'Giá phải là bội số của 1.000 ₫'),
});

export type CreateCourtInput = z.infer<typeof createCourtSchema>;

export const updateCourtSchema = createCourtSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;
