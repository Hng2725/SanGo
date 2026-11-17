import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { AuthUser, LoginInput, RegisterInput } from '@sango/shared';
import { loginSchema, registerSchema } from '@sango/shared';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { AuthService } from './auth.service';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') @Public() register(@ZodBody(registerSchema) input: RegisterInput) {
    return this.auth.register(input);
  }
  @Post('login') @Public() @HttpCode(200) login(@ZodBody(loginSchema) input: LoginInput) {
    return this.auth.login(input);
  }
  @Get('me') me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
