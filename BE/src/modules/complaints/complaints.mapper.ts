import type { Prisma } from '@prisma/client';
import type { ComplaintDto } from '@sango/shared';

export const complaintInclude = {
  venue: { select: { id: true, name: true } },
  booking: { select: { id: true, code: true } },
  author: { select: { id: true, fullName: true, email: true } },
  handledBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ComplaintInclude;

export type ComplaintWithRelations = Prisma.ComplaintGetPayload<{
  include: typeof complaintInclude;
}>;

export function toComplaintDto(complaint: ComplaintWithRelations): ComplaintDto {
  return {
    id: complaint.id,
    venueId: complaint.venueId,
    venue: complaint.venue,
    bookingId: complaint.bookingId,
    bookingCode: complaint.booking?.code ?? null,
    author: complaint.author,
    title: complaint.title,
    content: complaint.content,
    status: complaint.status,
    adminResponse: complaint.adminResponse,
    handledBy: complaint.handledBy,
    resolvedAt: complaint.resolvedAt ? complaint.resolvedAt.toISOString() : null,
    createdAt: complaint.createdAt.toISOString(),
    updatedAt: complaint.updatedAt.toISOString(),
  };
}
