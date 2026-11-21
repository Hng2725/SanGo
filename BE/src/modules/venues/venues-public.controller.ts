import { Controller, Get, Param } from '@nestjs/common';
import type { VenueDetailDto } from '@sango/shared';
import { Public } from '../../common/decorators/auth.decorators';
import { VenuesService } from './venues.service';

@Public()
@Controller('venues')
export class VenuesPublicController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string): Promise<VenueDetailDto> {
    return this.venuesService.getPublicBySlug(slug);
  }
}
