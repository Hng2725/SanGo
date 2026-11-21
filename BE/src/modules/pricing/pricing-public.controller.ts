import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { quotePriceSchema, type PriceQuote, type QuotePriceInput } from '@sango/shared';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodBody } from '../../common/decorators/zod.decorators';
import { PricingService } from './pricing.service';

@Public()
@Controller('pricing')
export class PricingPublicController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async quote(@ZodBody(quotePriceSchema) body: QuotePriceInput): Promise<PriceQuote> {
    return this.pricingService.quote(body.courtId, new Date(body.startAt), new Date(body.endAt));
  }
}
