import type { ComplaintStatus } from '../constants/booking-status';

export const COMPLAINT_TRANSITIONS: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};

export interface ComplaintDto {
  id: string;
  venueId: string;
  venue: { id: string; name: string };
  bookingId: string | null;
  bookingCode: string | null;
  author: { id: string; fullName: string; email: string };
  title: string;
  content: string;
  status: ComplaintStatus;
  adminResponse: string | null;
  handledBy: { id: string; fullName: string } | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
