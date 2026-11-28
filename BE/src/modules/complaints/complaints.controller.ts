import { Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import {
  adminComplaintsQuerySchema,
  adminUpdateComplaintSchema,
  createComplaintSchema,
  idSchema,
  myComplaintsQuerySchema,
  type AdminComplaintsQuery,
  type AdminUpdateComplaintInput,
  type AuthUser,
  type CreateComplaintInput,
  type MyComplaintsQuery,
} from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod.decorators';
import { ComplaintsService } from './complaints.service';

@Controller()
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post('complaints')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createComplaintSchema) body: CreateComplaintInput,
  ) {
    return this.complaintsService.create(user.id, body);
  }

  @Get('me/complaints')
  @Roles('CUSTOMER')
  listMine(
    @CurrentUser() user: AuthUser,
    @ZodQuery(myComplaintsQuerySchema) query: MyComplaintsQuery,
  ) {
    return this.complaintsService.listMine(user.id, query);
  }

  @Get('admin/complaints')
  @Roles('ADMIN')
  adminList(@ZodQuery(adminComplaintsQuerySchema) query: AdminComplaintsQuery) {
    return this.complaintsService.adminList(query);
  }

  @Patch('admin/complaints/:id')
  @Roles('ADMIN')
  adminUpdate(
    @ZodParam('id', idSchema) id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(adminUpdateComplaintSchema) body: AdminUpdateComplaintInput,
  ) {
    return this.complaintsService.adminUpdate(id, user.id, body);
  }
}
