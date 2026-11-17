export const ROLES = ['CUSTOMER', 'OWNER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];
export const USER_STATUSES = ['ACTIVE', 'LOCKED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
export const OWNER_STATUSES = ['NONE', 'PENDING', 'APPROVED', 'REJECTED'] as const;
export type OwnerStatus = (typeof OWNER_STATUSES)[number];
export const ROLE_LABELS: Record<Role, string> = { CUSTOMER: 'Khách đặt sân', OWNER: 'Chủ sân', ADMIN: 'Quản trị viên' };
