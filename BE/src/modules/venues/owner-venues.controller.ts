import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  createVenueSchema,
  openingHoursSchema,
  updateVenueSchema,
  type AuthUser,
  type CreateVenueInput,
  type OpeningHourDto,
  type OpeningHoursInput,
  type OwnerVenueDetailDto,
  type UpdateVenueInput,
  type VenueDto,
} from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { VenuesService } from './venues.service';

@Roles('OWNER')
@Controller('owner/venues')
export class OwnerVenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  async listMine(@CurrentUser() user: AuthUser): Promise<VenueDto[]> {
    return this.venuesService.listMine(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createVenueSchema) body: CreateVenueInput,
  ): Promise<OwnerVenueDetailDto> {
    return this.venuesService.create(user.id, body);
  }

  @Get(':id')
  async getMine(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OwnerVenueDetailDto> {
    return this.venuesService.getMine(id, user.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(updateVenueSchema) body: UpdateVenueInput,
  ): Promise<OwnerVenueDetailDto> {
    return this.venuesService.update(id, user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hide(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.venuesService.hide(id, user.id);
  }

  @Put(':id/opening-hours')
  async replaceOpeningHours(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(openingHoursSchema) body: OpeningHoursInput,
  ): Promise<OpeningHourDto[]> {
    return this.venuesService.replaceOpeningHours(id, user.id, body);
  }
}
