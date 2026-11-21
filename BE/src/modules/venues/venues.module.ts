import { Module } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { OwnerVenuesController } from './owner-venues.controller';
import { VenuesPublicController } from './venues-public.controller';
import { MetaController } from './meta.controller';

@Module({
  controllers: [OwnerVenuesController, VenuesPublicController, MetaController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
