import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  COMPLAINT_TRANSITIONS,
  type AdminComplaintsQuery,
  type AdminUpdateComplaintInput,
  type ComplaintDto,
  type CreateComplaintInput,
  type MyComplaintsQuery,
  type Paginated,
} from '@sango/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { paginate, toSkipTake } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { complaintInclude, toComplaintDto } from './complaints.mapper';

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateComplaintInput): Promise<ComplaintDto> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: input.venueId },
      select: { id: true },
    });
    if (!venue) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Cụm sân không tồn tại');
    }

    if (input.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: input.bookingId },
        include: { court: { select: { venueId: true } } },
      });
      if (!booking) {
        throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Đơn đặt sân không tồn tại');
      }
      if (booking.customerId !== userId) {
        throw new AppException(
          HttpStatus.FORBIDDEN,
          'FORBIDDEN',
          'Bạn không có quyền khiếu nại cho đơn đặt của người khác',
        );
      }
      if (booking.court.venueId !== input.venueId) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'Đơn đặt sân không thuộc cụm sân đã chọn',
        );
      }
    }

    const created = await this.prisma.complaint.create({
      data: {
        authorId: userId,
        venueId: input.venueId,
        bookingId: input.bookingId ?? null,
        title: input.title,
        content: input.content,
      },
      include: complaintInclude,
    });

    return toComplaintDto(created);
  }

  async listMine(userId: string, query: MyComplaintsQuery): Promise<Paginated<ComplaintDto>> {
    const where: Prisma.ComplaintWhereInput = { authorId: userId };
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        include: complaintInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return paginate(items.map(toComplaintDto), total, query.page, query.pageSize);
  }

  async adminList(query: AdminComplaintsQuery): Promise<Paginated<ComplaintDto>> {
    const where: Prisma.ComplaintWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        include: complaintInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return paginate(items.map(toComplaintDto), total, query.page, query.pageSize);
  }

  async adminUpdate(
    complaintId: string,
    adminId: string,
    input: AdminUpdateComplaintInput,
  ): Promise<ComplaintDto> {
    const existing = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!existing) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Khiếu nại không tồn tại');
    }

    const allowedNext = COMPLAINT_TRANSITIONS[existing.status];
    if (!allowedNext.includes(input.status)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'INVALID_STATUS_TRANSITION',
        `Không thể chuyển khiếu nại từ ${existing.status} sang ${input.status}`,
      );
    }

    const isResolved = input.status === 'RESOLVED' || input.status === 'REJECTED';
    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: input.status,
        adminResponse: input.adminResponse ?? existing.adminResponse,
        handledById: adminId,
        resolvedAt: isResolved ? new Date() : null,
      },
      include: complaintInclude,
    });

    return toComplaintDto(updated);
  }
}
