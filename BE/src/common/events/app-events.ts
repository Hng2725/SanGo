export const AppEvents = {
  BookingCreated: 'booking.created',
  BookingConfirmed: 'booking.confirmed',
  BookingRejected: 'booking.rejected',
  BookingCancelled: 'booking.cancelled',
  BookingCompleted: 'booking.completed',
  RecurringCreated: 'recurring.created',
  OwnerApproved: 'owner.approved',
  OwnerRejected: 'owner.rejected',
} as const;
export interface BookingEventPayload {
  bookingId: string;
}
export interface RecurringEventPayload {
  seriesId: string;
}
export interface OwnerEventPayload {
  userId: string;
  note?: string;
}
