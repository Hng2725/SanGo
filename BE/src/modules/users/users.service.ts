import { HttpStatus, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import type {
  ChangePasswordInput,
  RegisterInput,
  UpdateProfileInput,
  UserDto,
} from '@sango/shared';
import { compare, hash } from 'bcryptjs';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserDto } from './users.mapper';
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }
  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
  create(input: RegisterInput, passwordHash: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        phone: input.phone || null,
        passwordHash,
        role: input.role,
        ownerStatus: input.role === 'OWNER' ? 'PENDING' : 'NONE',
      },
    });
  }
  toUserDto = toUserDto;
  async updateProfile(id: string, input: UpdateProfileInput): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { ...input, ...(input.phone !== undefined ? { phone: input.phone || null } : {}) },
    });
    return toUserDto(user);
  }
  async changePassword(id: string, input: ChangePasswordInput): Promise<{ changed: true }> {
    const user = await this.findById(id);
    if (!user)
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy tài khoản');
    if (!(await compare(input.currentPassword, user.passwordHash)))
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Mật khẩu hiện tại chưa đúng',
        [{ path: 'currentPassword', message: 'Mật khẩu hiện tại chưa đúng' }],
      );
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hash(input.newPassword, 10) },
    });
    return { changed: true };
  }
}
