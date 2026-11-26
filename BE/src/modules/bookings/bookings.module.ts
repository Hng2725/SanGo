import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { SlotLockService } from './slot-lock.service';

@Module({
  imports: [PricingModule, MaintenanceModule],
  controllers: [BookingsController],
  providers: [BookingsService, SlotLockService],
  exports: [BookingsService, SlotLockService],
})
export class BookingsModule {}
