import { z } from 'zod';
import { isoDateTimeSchema } from './common.schema';
import { isSlotAligned } from '../utils/time';

export const createMaintenanceSchema = z
  .object({
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    reason: z.string().trim().max(200, 'Lý do tối đa 200 ký tự').optional().nullable(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startAt);
      const end = new Date(data.endAt);
      return end.getTime() > start.getTime();
    },
    { path: ['endAt'], message: 'Thời gian kết thúc phải sau thời gian bắt đầu' },
  )
  .refine(
    (data) => {
      const start = new Date(data.startAt);
      const end = new Date(data.endAt);
      return isSlotAligned(start) && isSlotAligned(end);
    },
    { path: ['startAt'], message: 'Thời gian bắt đầu và kết thúc phải là bội số của 60 phút' },
  )
  .refine(
    (data) => {
      const start = new Date(data.startAt);
      const end = new Date(data.endAt);
      return end.getTime() - start.getTime() <= 30 * 24 * 60 * 60 * 1000;
    },
    { path: ['endAt'], message: 'Thời gian bảo trì tối đa 30 ngày' },
  );

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
