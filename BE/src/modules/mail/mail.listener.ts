import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AppEvents,
  type BookingEventPayload,
  type OwnerEventPayload,
  type RecurringEventPayload,
} from '../../common/events/app-events';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from './mail.service';
import { emailFrame } from './templates/mail.templates';
@Injectable()
export class MailListener {
  private readonly logger = new Logger(MailListener.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}
  private async booking(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: { customer: true, court: { include: { venue: { include: { owner: true } } } } },
    });
  }
  private async safeSend(to: string, subject: string, content: string): Promise<void> {
    try {
      await this.mail.send({ to, subject, html: emailFrame(subject, content) });
    } catch (error) {
      this.logger.error(
        `Mail delivery failed: ${subject}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
  @OnEvent(AppEvents.BookingCreated, { async: true })
  async bookingCreated({ bookingId }: BookingEventPayload): Promise<void> {
    const booking = await this.booking(bookingId);
    if (!booking) return;
    await Promise.all([
      this.safeSend(
        booking.customer.email,
        'Đã nhận yêu cầu đặt sân',
        `Đơn ${booking.code} tại ${booking.court.venue.name} đã được gửi đến chủ sân.`,
      ),
      this.safeSend(
        booking.court.venue.owner.email,
        'Có đơn đặt sân mới',
        `Đơn ${booking.code} cho ${booking.court.name} đang chờ xác nhận.`,
      ),
    ]);
  }
  @OnEvent(AppEvents.BookingConfirmed, { async: true })
  async bookingConfirmed({ bookingId }: BookingEventPayload): Promise<void> {
    const booking = await this.booking(bookingId);
    if (!booking) return;
    await this.safeSend(
      booking.customer.email,
      'Đơn đặt sân đã được xác nhận',
      `Đơn ${booking.code} tại ${booking.court.venue.name} đã được xác nhận.`,
    );
  }
  @OnEvent(AppEvents.BookingRejected, { async: true })
  async bookingRejected({ bookingId }: BookingEventPayload): Promise<void> {
    const booking = await this.booking(bookingId);
    if (!booking) return;
    await this.safeSend(
      booking.customer.email,
      'Đơn đặt sân bị từ chối',
      `Đơn ${booking.code} bị từ chối. Lý do: ${booking.rejectReason ?? 'Không được cung cấp'}`,
    );
  }
  @OnEvent(AppEvents.BookingCancelled, { async: true })
  async bookingCancelled({ bookingId }: BookingEventPayload): Promise<void> {
    const booking = await this.booking(bookingId);
    if (!booking) return;
    await this.safeSend(
      booking.customer.email,
      'Đơn đặt sân đã hủy',
      `Đơn ${booking.code} đã được hủy.`,
    );
  }
  @OnEvent(AppEvents.BookingCompleted, { async: true })
  async bookingCompleted({ bookingId }: BookingEventPayload): Promise<void> {
    const booking = await this.booking(bookingId);
    if (!booking) return;
    await this.safeSend(
      booking.customer.email,
      'Buổi chơi đã hoàn thành',
      `Đơn ${booking.code} đã hoàn thành. Cảm ơn bạn đã dùng SanGo.`,
    );
  }
  @OnEvent(AppEvents.RecurringCreated, { async: true })
  async recurringCreated({ seriesId }: RecurringEventPayload): Promise<void> {
    const series = await this.prisma.recurringSeries.findUnique({
      where: { id: seriesId },
      include: {
        customer: { select: { email: true, fullName: true } },
        _count: { select: { bookings: true } },
        court: {
          select: {
            name: true,
            venue: { select: { name: true, owner: { select: { email: true } } } },
          },
        },
      },
    });
    if (!series) return;
    await Promise.all([
      this.safeSend(
        series.customer.email,
        'Đã tạo lịch cố định',
        `Đã tạo ${series._count.bookings} buổi trong lịch cố định ${series.weeks} tuần tại ${series.court.venue.name}.`,
      ),
      this.safeSend(
        series.court.venue.owner.email,
        'Có lịch đặt sân cố định mới',
        `${series.customer.fullName} đã đặt ${series._count.bookings} buổi tại ${series.court.name} trong lịch ${series.weeks} tuần. Các đơn đang chờ xác nhận.`,
      ),
    ]);
  }
  @OnEvent(AppEvents.OwnerApproved, { async: true })
  async ownerApproved({ userId }: OwnerEventPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await this.safeSend(
      user.email,
      'Tài khoản chủ sân đã được duyệt',
      'Bạn đã có thể đăng cụm sân và nhận đơn đặt.',
    );
  }
  @OnEvent(AppEvents.OwnerRejected, { async: true })
  async ownerRejected({ userId, note }: OwnerEventPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await this.safeSend(
      user.email,
      'Tài khoản chủ sân chưa được duyệt',
      `Lý do: ${note ?? user.ownerNote ?? 'Không được cung cấp'}`,
    );
  }
}
