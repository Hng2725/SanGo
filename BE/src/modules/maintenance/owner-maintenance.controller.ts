import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  createMaintenanceSchema,
  type AuthUser,
  type CreateMaintenanceInput,
  type MaintenanceDto,
} from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { MaintenanceService } from './maintenance.service';

@Roles('OWNER')
@Controller('owner')
export class OwnerMaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('courts/:courtId/maintenance')
  async listUpcoming(
    @CurrentUser() user: AuthUser,
    @Param('courtId') courtId: string,
  ): Promise<MaintenanceDto[]> {
    return this.maintenanceService.listUpcoming(courtId, user.id);
  }

  @Post('courts/:courtId/maintenance')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('courtId') courtId: string,
    @ZodBody(createMaintenanceSchema) body: CreateMaintenanceInput,
  ): Promise<MaintenanceDto> {
    return this.maintenanceService.create(courtId, user.id, user.id, body);
  }

  @Delete('maintenance/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.maintenanceService.remove(id, user.id);
  }
}
