import { Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import {
  createRecurringSchema,
  idSchema,
  recurringPreviewSchema,
  type AuthUser,
  type CreateRecurringInput,
  type RecurringPreviewInput,
} from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody, ZodParam } from '../../common/decorators/zod.decorators';
import { RecurringService } from './recurring.service';

@Controller()
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post('recurring/preview')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.OK)
  preview(
    @CurrentUser() user: AuthUser,
    @ZodBody(recurringPreviewSchema) body: RecurringPreviewInput,
  ) {
    return this.recurringService.preview(user.id, body);
  }

  @Post('recurring')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createRecurringSchema) body: CreateRecurringInput,
  ) {
    return this.recurringService.create(user.id, body);
  }

  @Get('me/recurring')
  @Roles('CUSTOMER')
  listMine(@CurrentUser() user: AuthUser) {
    return this.recurringService.listMine(user.id);
  }

  @Patch('me/recurring/:id/cancel')
  @Roles('CUSTOMER')
  cancelSeries(@ZodParam('id', idSchema) id: string, @CurrentUser() user: AuthUser) {
    return this.recurringService.cancelSeries(id, user);
  }

  @Patch('owner/recurring/:id/confirm')
  @Roles('OWNER')
  confirmSeries(@ZodParam('id', idSchema) id: string, @CurrentUser() user: AuthUser) {
    return this.recurringService.confirmSeries(id, user);
  }
}
