import { Controller, Get } from '@nestjs/common';
import type { Paginated, SearchVenuesQuery, VenueCardDto } from '@sango/shared';
import { searchVenuesQuerySchema } from '@sango/shared';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodQuery } from '../../common/decorators/zod.decorators';
import { SearchService } from './search.service';

@Controller('venues')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  search(
    @ZodQuery(searchVenuesQuerySchema) query: SearchVenuesQuery,
  ): Promise<Paginated<VenueCardDto>> {
    return this.searchService.search(query);
  }
}
