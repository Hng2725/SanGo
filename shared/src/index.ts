// Barrel export của @sango/shared – MỌI type/schema/constant/util dùng chung đều export qua đây.
// Hưng sẽ bổ sung constants/, types/, schemas/, utils/ ở task H0.2 (xem docs/Phân chia/01_Hung.md).
export const APP_NAME = 'SanGo';
export * from './constants/roles';
export * from './constants/sports';
export * from './constants/booking-status';
export * from './constants/time';
export * from './constants/error-codes';
export * from './types/api';
export * from './types/user';
export * from './types/admin';
export * from './schemas/common.schema';
export * from './schemas/auth.schema';
export * from './schemas/user.schema';
export * from './utils/time';
export * from './utils/type-guards';
