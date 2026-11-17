import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse, LoginInput, RegisterInput, UserDto } from '@sango/shared';
import { compare, hash } from 'bcryptjs';
import { AppException } from '../../common/exceptions/app.exception';
import { isPrismaUniqueError } from '../../common/utils/prisma-errors';
import { UsersService } from '../users/users.service';
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}
  private async response(user: UserDto): Promise<AuthResponse> {
    return { user, accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }) };
  }
  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    if (await this.users.findByEmail(email))
      throw new AppException(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'Email đã được đăng ký');
    try {
      const user = await this.users.create({ ...input, email }, await hash(input.password, 10));
      return this.response(this.users.toUserDto(user));
    } catch (error) {
      if (isPrismaUniqueError(error))
        throw new AppException(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'Email đã được đăng ký');
      throw error;
    }
  }
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user)
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
      );
    if (user.status === 'LOCKED')
      throw new AppException(HttpStatus.FORBIDDEN, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
    if (!(await compare(input.password, user.passwordHash)))
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
      );
    return this.response(this.users.toUserDto(user));
  }
  async me(id: string): Promise<UserDto> {
    const user = await this.users.findById(id);
    if (!user)
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy tài khoản');
    return this.users.toUserDto(user);
  }
}
