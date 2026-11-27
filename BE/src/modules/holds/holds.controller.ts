import { Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { type CreateHoldInput, createHoldSchema, type AuthUser } from '@sango/shared';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { HoldsService } from './holds.service';

@Controller('holds')
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Post()
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthUser, @ZodBody(createHoldSchema) input: CreateHoldInput) {
    return this.holdsService.createHold(user.id, input);
  }

  @Delete(':id')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.holdsService.deleteHold(id, user.id);
  }
}
