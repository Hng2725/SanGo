import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser, JwtPayload } from '@sango/shared';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { AppException } from '../exceptions/app.exception';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      if (isPublic) return true;
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user)
        throw new AppException(
          HttpStatus.UNAUTHORIZED,
          'UNAUTHORIZED',
          'Phiên đăng nhập không hợp lệ',
        );
      if (user.status === 'LOCKED')
        throw new AppException(HttpStatus.FORBIDDEN, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
      request.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        ownerStatus: user.ownerStatus,
      };
      return true;
    } catch (error) {
      if (error instanceof AppException && !isPublic) throw error;
      if (isPublic) return true;
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Phiên đăng nhập không hợp lệ',
      );
    }
  }
}
