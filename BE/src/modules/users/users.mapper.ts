import type { User } from '@prisma/client';
import type { UserDto } from '@sango/shared';
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    ownerStatus: user.ownerStatus,
    ownerNote: user.ownerNote,
    createdAt: user.createdAt.toISOString(),
  };
}
