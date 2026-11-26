import { z } from 'zod';
import { dateStrSchema } from './common.schema';
import { startOfWeekDateStr } from '../utils/time';

/** Query cho GET /venues/:venueId/availability */
export const venueDayQuerySchema = z.object({
  date: dateStrSchema,
});
export type VenueDayQuery = z.infer<typeof venueDayQuerySchema>;

/** Query cho GET /courts/:courtId/availability — chuẩn hoá weekStart về Thứ 2 */
export const courtWeekQuerySchema = z.object({
  weekStart: dateStrSchema.transform((d) => startOfWeekDateStr(d)),
});
export type CourtWeekQuery = z.infer<typeof courtWeekQuerySchema>;
