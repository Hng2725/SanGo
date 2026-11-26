import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [PricingModule, MaintenanceModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
