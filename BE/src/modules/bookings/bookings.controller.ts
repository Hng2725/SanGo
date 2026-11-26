import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { type CreateBookingInput, createBookingSchema, type AuthUser } from '@sango/shared';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createBookingSchema) input: CreateBookingInput,
  ) {
    return this.bookingsService.createBooking(user.id, input);
  }
}
