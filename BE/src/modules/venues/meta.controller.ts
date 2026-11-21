import { Controller, Get } from '@nestjs/common';
import type { LocationDto } from '@sango/shared';
import { Public } from '../../common/decorators/auth.decorators';
import { VenuesService } from './venues.service';

@Public()
@Controller('meta')
export class MetaController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get('locations')
  async getLocations(): Promise<LocationDto[]> {
    return this.venuesService.getLocations();
  }
}
