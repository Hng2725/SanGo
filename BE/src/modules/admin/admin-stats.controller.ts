import { Controller, Get } from '@nestjs/common';
import type { AuthUser } from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { AdminStatsService } from './admin-stats.service';
@Controller('admin/stats')
@Roles('ADMIN')
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}
  @Get('overview') overview(@CurrentUser() user: AuthUser) {
    return this.service.overview(user);
  }
}
