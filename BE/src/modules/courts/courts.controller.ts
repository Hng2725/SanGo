import { Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  createCourtSchema,
  updateCourtSchema,
  type AuthUser,
  type CourtDto,
  type CreateCourtInput,
  type UpdateCourtInput,
} from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { CourtsService } from './courts.service';

@Roles('OWNER')
@Controller('owner')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post('venues/:id/courts')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('id') venueId: string,
    @ZodBody(createCourtSchema) body: CreateCourtInput,
  ): Promise<CourtDto> {
    return this.courtsService.create(venueId, user.id, body);
  }

  @Patch('courts/:courtId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('courtId') courtId: string,
    @ZodBody(updateCourtSchema) body: UpdateCourtInput,
  ): Promise<CourtDto> {
    return this.courtsService.update(courtId, user.id, body);
  }

  @Delete('courts/:courtId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('courtId') courtId: string): Promise<void> {
    await this.courtsService.remove(courtId, user.id);
  }
}
