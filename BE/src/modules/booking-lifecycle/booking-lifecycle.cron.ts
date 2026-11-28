import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingLifecycleService } from './booking-lifecycle.service';

@Injectable()
export class BookingLifecycleCron {
  private readonly logger = new Logger(BookingLifecycleCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingLifecycleService: BookingLifecycleService,
  ) {}

  @Cron('*/10 * * * *')
  async handleLifecycleTransitions(): Promise<{ completed: number; rejected: number }> {
    const now = new Date();

    const [toComplete, toReject] = await Promise.all([
      this.prisma.booking.findMany({
        where: { status: 'CONFIRMED', endAt: { lte: now } },
        select: { id: true },
      }),
      this.prisma.booking.findMany({
        where: { status: 'PENDING', startAt: { lte: now } },
        select: { id: true },
      }),
    ]);

    let completed = 0;
    for (const item of toComplete) {
      try {
        await this.bookingLifecycleService.transition(item.id, 'COMPLETED', 'SYSTEM', undefined, {
          now,
        });
        completed += 1;
      } catch (error) {
        this.logger.warn(`Không thể tự động hoàn thành đơn ${item.id}: ${String(error)}`);
      }
    }

    let rejected = 0;
    for (const item of toReject) {
      try {
        await this.bookingLifecycleService.transition(item.id, 'REJECTED', 'SYSTEM', undefined, {
          now,
          reason: 'Quá hạn xác nhận',
        });
        rejected += 1;
      } catch (error) {
        this.logger.warn(`Không thể tự động từ chối đơn ${item.id}: ${String(error)}`);
      }
    }

    if (completed > 0 || rejected > 0) {
      this.logger.log(`Cron vòng đời đơn: hoàn thành ${completed}, quá hạn từ chối ${rejected}`);
    }

    return { completed, rejected };
  }
}
