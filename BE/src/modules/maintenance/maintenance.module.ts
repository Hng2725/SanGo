import { Module } from '@nestjs/common';
import { CourtsModule } from '../courts/courts.module';
import { OwnerMaintenanceController } from './owner-maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [CourtsModule],
  controllers: [OwnerMaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
