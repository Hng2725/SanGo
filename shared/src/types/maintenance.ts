export interface MaintenanceDto {
  id: string;
  courtId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  createdAt: string;
}
