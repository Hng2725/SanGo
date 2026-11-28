import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { OptionalUser } from '../../common/decorators/auth.decorators';
import { ZodQuery, ZodParam } from '../../common/decorators/zod.decorators';
import { idSchema } from '@sango/shared';
import { venueDayQuerySchema, courtWeekQuerySchema } from '@sango/shared';
import type { AuthUser } from '@sango/shared';
import { AvailabilityService } from './availability.service';

@Controller()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Public()
  @Get('venues/:venueId/availability')
  getVenueDay(
    @ZodParam('venueId', idSchema) venueId: string,
    @ZodQuery(venueDayQuerySchema) query: { date: string },
    @OptionalUser() viewer?: AuthUser,
  ) {
    return this.availabilityService.getVenueDay(venueId, query.date, viewer);
  }

  @Public()
  @Get('courts/:courtId/availability')
  getCourtWeek(
    @ZodParam('courtId', idSchema) courtId: string,
    @ZodQuery(courtWeekQuerySchema) query: { weekStart: string },
    @OptionalUser() viewer?: AuthUser,
  ) {
    return this.availabilityService.getCourtWeek(courtId, query.weekStart, viewer);
  }
}
