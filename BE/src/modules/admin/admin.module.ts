import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
@Module({
  controllers: [AdminUsersController, AdminStatsController],
  providers: [AdminUsersService, AdminStatsService],
})
export class AdminModule {}
