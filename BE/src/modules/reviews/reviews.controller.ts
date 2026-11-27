import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import {
  createReviewSchema,
  idSchema,
  ownerReviewsQuerySchema,
  replyReviewSchema,
  updateReviewSchema,
  venueReviewsQuerySchema,
  type AuthUser,
  type CreateReviewInput,
  type OwnerReviewsQuery,
  type ReplyReviewInput,
  type UpdateReviewInput,
  type VenueReviewsQuery,
} from '@sango/shared';
import { CurrentUser, Public, Roles } from '../../common/decorators/auth.decorators';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod.decorators';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @ZodBody(createReviewSchema) body: CreateReviewInput) {
    return this.reviewsService.create(user.id, body);
  }

  @Patch('reviews/:id')
  @Roles('CUSTOMER')
  update(
    @ZodParam('id', idSchema) id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(updateReviewSchema) body: UpdateReviewInput,
  ) {
    return this.reviewsService.update(id, user.id, body);
  }

  @Delete('reviews/:id')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ZodParam('id', idSchema) id: string, @CurrentUser() user: AuthUser) {
    return this.reviewsService.remove(id, user.id);
  }

  @Get('venues/:venueId/reviews')
  @Public()
  listByVenue(
    @ZodParam('venueId', idSchema) venueId: string,
    @ZodQuery(venueReviewsQuerySchema) query: VenueReviewsQuery,
  ) {
    return this.reviewsService.listByVenue(venueId, query);
  }

  @Get('owner/reviews')
  @Roles('OWNER')
  listForOwner(
    @CurrentUser() user: AuthUser,
    @ZodQuery(ownerReviewsQuerySchema) query: OwnerReviewsQuery,
  ) {
    return this.reviewsService.listForOwner(user.id, query);
  }

  @Patch('owner/reviews/:id/reply')
  @Roles('OWNER')
  reply(
    @ZodParam('id', idSchema) id: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(replyReviewSchema) body: ReplyReviewInput,
  ) {
    return this.reviewsService.reply(id, user.id, body);
  }
}
