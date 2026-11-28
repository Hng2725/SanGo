import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import {
  BookingActionsController,
  MyBookingsController,
  OwnerBookingsController,
} from './booking-lifecycle.controller';
import { BookingLifecycleCron } from './booking-lifecycle.cron';
import { BookingLifecycleService } from './booking-lifecycle.service';

@Module({
  imports: [BookingsModule],
  controllers: [MyBookingsController, BookingActionsController, OwnerBookingsController],
  providers: [BookingLifecycleService, BookingLifecycleCron],
  exports: [BookingLifecycleService],
})
export class BookingLifecycleModule {}
