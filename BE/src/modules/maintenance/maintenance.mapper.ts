import type { MaintenanceBlock } from '@prisma/client';
import type { MaintenanceDto } from '@sango/shared';

export function toMaintenanceDto(mb: MaintenanceBlock): MaintenanceDto {
  return {
    id: mb.id,
    courtId: mb.courtId,
    startAt: mb.startAt.toISOString(),
    endAt: mb.endAt.toISOString(),
    reason: mb.reason,
    createdAt: mb.createdAt.toISOString(),
  };
}
