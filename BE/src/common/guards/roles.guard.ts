import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser, Role } from '@sango/shared';
import type { Request } from 'express';
import { ALLOW_UNAPPROVED_OWNER_KEY, ROLES_KEY } from '../decorators/auth.decorators';
import { AppException } from '../exceptions/app.exception';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user)
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    if (!roles.includes(user.role))
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền thực hiện thao tác này',
      );
    const allow = this.reflector.getAllAndOverride<boolean>(ALLOW_UNAPPROVED_OWNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (user.role === 'OWNER' && user.ownerStatus !== 'APPROVED' && !allow)
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'OWNER_NOT_APPROVED',
        'Tài khoản chủ sân chưa được duyệt',
      );
    return true;
  }
}
