import { Controller, Patch } from '@nestjs/common';
import type { AuthUser, ChangePasswordInput, UpdateProfileInput } from '@sango/shared';
import { changePasswordSchema, updateProfileSchema } from '@sango/shared';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { UsersService } from './users.service';
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Patch('me') update(
    @CurrentUser() user: AuthUser,
    @ZodBody(updateProfileSchema) input: UpdateProfileInput,
  ) {
    return this.users.updateProfile(user.id, input);
  }
  @Patch('me/password') changePassword(
    @CurrentUser() user: AuthUser,
    @ZodBody(changePasswordSchema) input: ChangePasswordInput,
  ) {
    return this.users.changePassword(user.id, input);
  }
}
