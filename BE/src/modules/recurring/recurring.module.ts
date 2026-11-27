import { Module } from '@nestjs/common';
import { BookingLifecycleModule } from '../booking-lifecycle/booking-lifecycle.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PricingModule } from '../pricing/pricing.module';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';

@Module({
  imports: [BookingsModule, PricingModule, BookingLifecycleModule],
  controllers: [RecurringController],
  providers: [RecurringService],
  exports: [RecurringService],
})
export class RecurringModule {}
