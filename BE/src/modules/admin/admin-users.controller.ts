import { Controller, Get, Patch } from '@nestjs/common';
import type {
  AdminUserQuery,
  AuthUser,
  OwnerApprovalInput,
  UpdateUserStatusInput,
} from '@sango/shared';
import {
  adminUserQuerySchema,
  idSchema,
  ownerApprovalSchema,
  updateUserStatusSchema,
} from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod.decorators';
import { AdminUsersService } from './admin-users.service';
@Controller('admin/users')
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}
  @Get() list(
    @CurrentUser() actor: AuthUser,
    @ZodQuery(adminUserQuerySchema) query: AdminUserQuery,
  ) {
    return this.service.list(actor, query);
  }
  @Get('counts') counts(@CurrentUser() actor: AuthUser) {
    return this.service.counts(actor);
  }
  @Patch(':id/status') status(
    @CurrentUser() actor: AuthUser,
    @ZodParam('id', idSchema) id: string,
    @ZodBody(updateUserStatusSchema) input: UpdateUserStatusInput,
  ) {
    return this.service.status(actor, id, input);
  }
  @Patch(':id/owner-approval') approve(
    @CurrentUser() actor: AuthUser,
    @ZodParam('id', idSchema) id: string,
    @ZodBody(ownerApprovalSchema) input: OwnerApprovalInput,
  ) {
    return this.service.approve(actor, id, input);
  }
}
