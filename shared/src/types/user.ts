import type { OwnerStatus, Role, UserStatus } from '../constants/roles';
export interface UserDto { id: string; email: string; fullName: string; phone: string | null; role: Role; status: UserStatus; ownerStatus: OwnerStatus; ownerNote?: string | null; createdAt: string }
export type AuthUser = Pick<UserDto, 'id' | 'email' | 'fullName' | 'role' | 'ownerStatus'>;
export interface AuthResponse { user: UserDto; accessToken: string }
export interface JwtPayload { sub: string; role: Role }
