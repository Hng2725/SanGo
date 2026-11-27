import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '@prisma/client';
import {
  InvalidTransitionError,
  assertTransition,
  vnDateMinuteToUtc,
  type AuthUser,
  type BookingActor,
  type BookingDetailDto,
  type BookingListItemDto,
  type BookingStatus,
  type MyBookingsQuery,
  type OwnerBookingsQuery,
  type Paginated,
} from '@sango/shared';
import { AppEvents, type BookingEventPayload } from '../../common/events/app-events';
import { AppException } from '../../common/exceptions/app.exception';
import { paginate, toSkipTake } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { SlotLockService } from '../bookings/slot-lock.service';
import { evaluateCancellation } from './cancellation-policy';
import {
  bookingLifecycleInclude,
  toBookingDetailDto,
  toBookingListItemDto,
} from './booking-lifecycle.mapper';

export interface TransitionExtra {
  reason?: string;
  now?: Date;
}

const TRANSITION_EVENT_MAP: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: AppEvents.BookingConfirmed,
  REJECTED: AppEvents.BookingRejected,
  CANCELLED: AppEvents.BookingCancelled,
  COMPLETED: AppEvents.BookingCompleted,
};

@Injectable()
export class BookingLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotLockService: SlotLockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async transition(
    bookingId: string,
    to: BookingStatus,
    actor: BookingActor,
    user?: AuthUser,
    extra?: TransitionExtra,
  ): Promise<BookingDetailDto> {
    const now = extra?.now ?? new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      return this.transitionInTx(tx, bookingId, to, actor, user, { ...extra, now });
    });

    const eventName = TRANSITION_EVENT_MAP[to];
    if (eventName) {
      const payload: BookingEventPayload = { bookingId };
      this.eventEmitter.emit(eventName, payload);
    }

    return updated;
  }

  async transitionInTx(
    tx: Prisma.TransactionClient,
    bookingId: string,
    to: BookingStatus,
    actor: BookingActor,
    user?: AuthUser,
    extra?: TransitionExtra,
  ): Promise<BookingDetailDto> {
    const now = extra?.now ?? new Date();

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: bookingLifecycleInclude,
    });

    if (!booking) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Đơn đặt sân không tồn tại');
    }

    // Kiểm tra quyền sở hữu ở tầng dữ liệu
    if (actor === 'CUSTOMER' && booking.customerId !== user?.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền thao tác trên đơn đặt này',
      );
    }
    if (actor === 'OWNER' && booking.court.venue.ownerId !== user?.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền quản lý đơn đặt của sân này',
      );
    }

    // Kiểm tra máy trạng thái
    try {
      assertTransition(booking.status, to, actor);
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'INVALID_STATUS_TRANSITION',
          `Không thể chuyển trạng thái đơn từ ${booking.status} sang ${to}`,
        );
      }
      throw error;
    }

    // Kiểm tra điều kiện thời gian và chính sách hủy
    if (to === 'CONFIRMED' && booking.startAt.getTime() <= now.getTime()) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'INVALID_STATUS_TRANSITION',
        'Không thể xác nhận đơn đã tới hoặc quá giờ chơi',
      );
    }

    if (to === 'COMPLETED' && booking.endAt.getTime() > now.getTime()) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'INVALID_STATUS_TRANSITION',
        'Chỉ có thể hoàn thành đơn sau khi kết thúc giờ chơi',
      );
    }

    if (to === 'CANCELLED' && (actor === 'CUSTOMER' || actor === 'ADMIN')) {
      const decision = evaluateCancellation({
        status: booking.status,
        startAt: booking.startAt,
        now,
        cancelBeforeHours: booking.court.venue.cancelBeforeHours,
        actor,
      });
      if (!decision.allowed) {
        const message =
          decision.reason === 'ALREADY_STARTED'
            ? 'Không thể hủy đơn đã bắt đầu hoặc đã qua giờ chơi'
            : decision.reason === 'TOO_LATE'
              ? 'Đã quá thời hạn hủy đơn miễn phí theo quy định của sân'
              : 'Trạng thái đơn hiện tại không cho phép hủy';
        throw new AppException(HttpStatus.CONFLICT, 'CANCELLATION_NOT_ALLOWED', message, {
          reason: decision.reason,
          deadline: decision.deadline?.toISOString() ?? null,
        });
      }
    }

    // Khóa lạc quan theo trạng thái hiện tại
    const updateData: Prisma.BookingUpdateManyMutationInput = {
      status: to,
    };
    if (to === 'CONFIRMED') {
      updateData.confirmedAt = now;
    } else if (to === 'COMPLETED') {
      updateData.completedAt = now;
    } else if (to === 'CANCELLED') {
      updateData.cancelledAt = now;
      updateData.cancelReason = extra?.reason ?? null;
    } else if (to === 'REJECTED') {
      updateData.rejectedAt = now;
      updateData.rejectReason = extra?.reason ?? null;
    }

    const result = await tx.booking.updateMany({
      where: { id: bookingId, status: booking.status },
      data: updateData,
    });

    if (result.count === 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'INVALID_STATUS_TRANSITION',
        'Trạng thái đơn vừa được thay đổi, vui lòng tải lại',
      );
    }

    if (to === 'CANCELLED' || to === 'REJECTED') {
      await this.slotLockService.releaseBooking(tx, bookingId);
    }

    const refreshed = await tx.booking.findUnique({
      where: { id: bookingId },
      include: bookingLifecycleInclude,
    });

    if (!refreshed) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Đơn đặt sân không tồn tại');
    }

    return toBookingDetailDto(refreshed, actor, now);
  }

  confirm(bookingId: string, user: AuthUser): Promise<BookingDetailDto> {
    return this.transition(bookingId, 'CONFIRMED', 'OWNER', user);
  }

  reject(bookingId: string, user: AuthUser, reason: string): Promise<BookingDetailDto> {
    return this.transition(bookingId, 'REJECTED', 'OWNER', user, { reason });
  }

  cancel(bookingId: string, user: AuthUser, reason?: string): Promise<BookingDetailDto> {
    const actor: BookingActor = user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
    return this.transition(bookingId, 'CANCELLED', actor, user, { reason });
  }

  complete(bookingId: string, user: AuthUser): Promise<BookingDetailDto> {
    return this.transition(bookingId, 'COMPLETED', 'OWNER', user);
  }

  async getDetail(bookingId: string, user: AuthUser): Promise<BookingDetailDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingLifecycleInclude,
    });

    if (!booking) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Đơn đặt sân không tồn tại');
    }

    const isCustomerOwner = user.role === 'CUSTOMER' && booking.customerId === user.id;
    const isVenueOwner = user.role === 'OWNER' && booking.court.venue.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isCustomerOwner && !isVenueOwner && !isAdmin) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền xem đơn đặt sân này',
      );
    }

    const actor: BookingActor = isAdmin ? 'ADMIN' : isVenueOwner ? 'OWNER' : 'CUSTOMER';
    return toBookingDetailDto(booking, actor, new Date());
  }

  async listMine(
    customerId: string,
    query: MyBookingsQuery,
  ): Promise<Paginated<BookingListItemDto>> {
    const now = new Date();
    const where: Prisma.BookingWhereInput = { customerId };

    if (query.status) {
      where.status = query.status;
    } else if (query.upcoming === true) {
      where.status = { in: ['PENDING', 'CONFIRMED'] };
      where.endAt = { gt: now };
    } else if (query.upcoming === false) {
      where.OR = [
        { status: { in: ['COMPLETED', 'CANCELLED', 'REJECTED'] } },
        { endAt: { lte: now } },
      ];
    }

    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: bookingLifecycleInclude,
        orderBy: { startAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(
      items.map((item) => toBookingListItemDto(item, 'CUSTOMER', now)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async listForOwner(
    ownerId: string,
    query: OwnerBookingsQuery,
  ): Promise<Paginated<BookingListItemDto>> {
    const now = new Date();
    const where: Prisma.BookingWhereInput = {
      court: {
        venue: { ownerId },
        ...(query.venueId ? { venueId: query.venueId } : {}),
      },
      ...(query.courtId ? { courtId: query.courtId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    if (query.from || query.to) {
      where.startAt = {
        ...(query.from ? { gte: vnDateMinuteToUtc(query.from, 0) } : {}),
        ...(query.to ? { lt: vnDateMinuteToUtc(query.to, 1440) } : {}),
      };
    }

    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { contactPhone: { contains: q, mode: 'insensitive' } },
        { customer: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: bookingLifecycleInclude,
        orderBy: { startAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(
      items.map((item) => toBookingListItemDto(item, 'OWNER', now)),
      total,
      query.page,
      query.pageSize,
    );
  }
}
