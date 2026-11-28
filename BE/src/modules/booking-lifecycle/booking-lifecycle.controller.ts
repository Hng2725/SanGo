import { Controller, Get, Param, Patch } from '@nestjs/common';
import {
  cancelBookingSchema,
  idSchema,
  myBookingsQuerySchema,
  ownerBookingsQuerySchema,
  rejectBookingSchema,
  type AuthUser,
  type CancelBookingInput,
  type MyBookingsQuery,
  type OwnerBookingsQuery,
  type RejectBookingInput,
} from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod.decorators';
import { BookingLifecycleService } from './booking-lifecycle.service';

@Controller('me/bookings')
@Roles('CUSTOMER')
export class MyBookingsController {
  constructor(private readonly bookingLifecycleService: BookingLifecycleService) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser, @ZodQuery(myBookingsQuerySchema) query: MyBookingsQuery) {
    return this.bookingLifecycleService.listMine(user.id, query);
  }
}

@Controller('bookings')
export class BookingActionsController {
  constructor(private readonly bookingLifecycleService: BookingLifecycleService) {}

  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bookingLifecycleService.getDetail(id, user);
  }

  @Patch(':id/cancel')
  @Roles('CUSTOMER', 'ADMIN')
  cancel(
    @ZodParam('id', idSchema) id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(cancelBookingSchema) body: CancelBookingInput,
  ) {
    return this.bookingLifecycleService.cancel(id, user, body.reason);
  }
}

@Controller('owner/bookings')
@Roles('OWNER')
export class OwnerBookingsController {
  constructor(private readonly bookingLifecycleService: BookingLifecycleService) {}

  @Get()
  listForOwner(
    @CurrentUser() user: AuthUser,
    @ZodQuery(ownerBookingsQuerySchema) query: OwnerBookingsQuery,
  ) {
    return this.bookingLifecycleService.listForOwner(user.id, query);
  }

  @Patch(':id/confirm')
  confirm(@ZodParam('id', idSchema) id: string, @CurrentUser() user: AuthUser) {
    return this.bookingLifecycleService.confirm(id, user);
  }

  @Patch(':id/reject')
  reject(
    @ZodParam('id', idSchema) id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(rejectBookingSchema) body: RejectBookingInput,
  ) {
    return this.bookingLifecycleService.reject(id, user, body.reason);
  }

  @Patch(':id/complete')
  complete(@ZodParam('id', idSchema) id: string, @CurrentUser() user: AuthUser) {
    return this.bookingLifecycleService.complete(id, user);
  }
}
