import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplaintsService } from './complaints.service';

describe('ComplaintsService', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let service: ComplaintsService;

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    service = new ComplaintsService(prisma);
  });

  it('từ chối khiếu nại gắn đơn của người khác (403 FORBIDDEN)', async () => {
    prisma.venue.findUnique.mockResolvedValue({ id: 'venue-1' } as never);
    prisma.booking.findUnique.mockResolvedValue({
      id: 'bk-1',
      customerId: 'other-user',
      court: { venueId: 'venue-1' },
    } as never);

    await expect(
      service.create('user-1', {
        venueId: 'venue-1',
        bookingId: 'bk-1',
        title: 'Sân bị dột',
        content: 'Sân bị dột nước nhiều chỗ khi mưa lớn',
      }),
    ).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ code: 'FORBIDDEN' }),
    });
  });

  it('từ chối chuyển trạng thái khiếu nại đã RESOLVED với 409 INVALID_STATUS_TRANSITION', async () => {
    prisma.complaint.findUnique.mockResolvedValue({
      id: 'cmp-1',
      status: 'RESOLVED',
    } as never);

    await expect(
      service.adminUpdate('cmp-1', 'admin-1', {
        status: 'IN_PROGRESS',
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    });
  });
});
