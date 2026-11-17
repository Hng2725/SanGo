import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '@prisma/client';
import type {
  AdminUserQuery,
  AuthUser,
  OwnerApprovalInput,
  UpdateUserStatusInput,
} from '@sango/shared';
import { AppEvents } from '../../common/events/app-events';
import { AppException } from '../../common/exceptions/app.exception';
import { paginate, toSkipTake } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserDto } from '../users/users.mapper';
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}
  private assertAdmin(actor: AuthUser): void {
    if (actor.role !== 'ADMIN')
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Chỉ quản trị viên được thực hiện');
  }
  async list(actor: AuthUser, query: AdminUserQuery) {
    this.assertAdmin(actor);
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
      ownerStatus: query.ownerStatus,
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.UserOrderByWithRelationInput =
      query.sort === 'name'
        ? { fullName: 'asc' }
        : { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy, ...toSkipTake(query.page, query.pageSize) }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items.map(toUserDto), total, query.page, query.pageSize);
  }
  async counts(actor: AuthUser) {
    this.assertAdmin(actor);
    const [all, customers, owners, pendingOwners, locked] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({ where: { role: 'OWNER' } }),
      this.prisma.user.count({ where: { role: 'OWNER', ownerStatus: 'PENDING' } }),
      this.prisma.user.count({ where: { status: 'LOCKED' } }),
    ]);
    return { all, customers, owners, pendingOwners, locked };
  }
  async status(actor: AuthUser, id: string, input: UpdateUserStatusInput) {
    this.assertAdmin(actor);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy người dùng');
    if (id === actor.id && input.status === 'LOCKED')
      throw new AppException(HttpStatus.CONFLICT, 'CONFLICT', 'Không thể tự khóa tài khoản');
    if (user.role === 'ADMIN' && input.status === 'LOCKED')
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Không thể khóa quản trị viên');
    return toUserDto(
      await this.prisma.user.update({ where: { id }, data: { status: input.status } }),
    );
  }
  async approve(actor: AuthUser, id: string, input: OwnerApprovalInput) {
    this.assertAdmin(actor);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user)
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy người dùng');
    if (user.role !== 'OWNER')
      throw new AppException(HttpStatus.CONFLICT, 'CONFLICT', 'Tài khoản không phải chủ sân');
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ownerStatus: input.decision,
        ownerNote: input.decision === 'REJECTED' ? input.note : null,
      },
    });
    this.events.emit(
      input.decision === 'APPROVED' ? AppEvents.OwnerApproved : AppEvents.OwnerRejected,
      { userId: id, note: input.note },
    );
    return toUserDto(updated);
  }
}
