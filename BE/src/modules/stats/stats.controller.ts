import { Controller, Get } from '@nestjs/common';
import { revenueQuerySchema, type AuthUser, type RevenueQuery } from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodQuery } from '../../common/decorators/zod.decorators';
import { StatsService } from './stats.service';

@Controller('owner/stats')
@Roles('OWNER')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('revenue')
  revenue(@CurrentUser() user: AuthUser, @ZodQuery(revenueQuerySchema) query: RevenueQuery) {
    return this.statsService.revenue(user.id, query);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.statsService.summary(user.id);
  }
}
