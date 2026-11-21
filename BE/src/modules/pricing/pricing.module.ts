import { Module } from '@nestjs/common';
import { CourtsModule } from '../courts/courts.module';
import { OwnerPricingController } from './owner-pricing.controller';
import { PricingPublicController } from './pricing-public.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [CourtsModule],
  controllers: [OwnerPricingController, PricingPublicController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
