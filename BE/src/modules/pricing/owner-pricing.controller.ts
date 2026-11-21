import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import {
  copyPricingSchema,
  pricingConfigSchema,
  type AuthUser,
  type CopyPricingInput,
  type CourtPricingDto,
  type PricingConfigInput,
} from '@sango/shared';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { PricingService } from './pricing.service';

@Roles('OWNER')
@Controller('owner/courts/:courtId/pricing')
export class OwnerPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  async getPricing(
    @CurrentUser() user: AuthUser,
    @Param('courtId') courtId: string,
  ): Promise<CourtPricingDto> {
    return this.pricingService.getForOwner(courtId, user.id);
  }

  @Put()
  async replacePricing(
    @CurrentUser() user: AuthUser,
    @Param('courtId') courtId: string,
    @ZodBody(pricingConfigSchema) body: PricingConfigInput,
  ): Promise<CourtPricingDto> {
    return this.pricingService.replaceForOwner(courtId, user.id, body);
  }

  @Post('copy')
  @HttpCode(HttpStatus.OK)
  async copyPricing(
    @CurrentUser() user: AuthUser,
    @Param('courtId') courtId: string,
    @ZodBody(copyPricingSchema) body: CopyPricingInput,
  ): Promise<void> {
    await this.pricingService.copyToCourts(courtId, user.id, body.targetCourtIds);
  }
}
